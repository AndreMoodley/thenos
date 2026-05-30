import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC calendar-day difference (a-b) in whole days. */
export function dayDiff(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((da - db) / DAY_MS);
}

/**
 * Apply a logged session's effect.
 *
 * INVARIANT #3: reps:0 ⇒ NO StrikeEvent and NO hammerCount change (recovery/stillness).
 * INVARIANT #2: every reps>0 session appends a StrikeEvent (append-only source of truth)
 *               and increments the hammerCount cache by the same amount.
 *
 * Returns the hammerCount before/after so callers can detect realm crossings.
 */
export async function applyStrike(
  tx: Tx,
  practitionerId: string,
  opts: { reps: number; sessionId?: string; occurredAt?: Date },
): Promise<{ before: number; after: number; struck: boolean }> {
  const p = await tx.practitioner.findUniqueOrThrow({
    where: { id: practitionerId },
    select: { hammerCount: true, streak: true, lastLogDate: true, dormantSince: true },
  });
  const before = p.hammerCount;

  // reps:0 — recovery/stillness. Touch streak/presence but never strike.
  if (!opts.reps || opts.reps <= 0) {
    await tx.practitioner.update({
      where: { id: practitionerId },
      data: { dormantSince: null },
    });
    return { before, after: before, struck: false };
  }

  const now = opts.occurredAt ?? new Date();
  // Streak: +1 if first log today and last log was yesterday; reset to 1 if a day was missed.
  let streak = p.streak;
  if (!p.lastLogDate) {
    streak = 1;
  } else {
    const d = dayDiff(now, p.lastLogDate);
    if (d === 0) {
      // already logged today — streak unchanged
    } else if (d === 1) {
      streak = p.streak + 1;
    } else if (d > 1) {
      streak = 1;
    }
  }

  await tx.strikeEvent.create({
    data: { practitionerId, amount: opts.reps, sessionId: opts.sessionId, occurredAt: now },
  });
  const after = before + opts.reps;
  await tx.practitioner.update({
    where: { id: practitionerId },
    data: {
      hammerCount: after,
      streak,
      lastLogDate: now,
      dormantSince: null,
      // Logging a full session advances penance toward cleansing a corruption.
      penanceProgress: { increment: 1 },
    },
  });

  return { before, after, struck: true };
}

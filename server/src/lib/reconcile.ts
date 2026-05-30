import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Invariant #2: hammerCount is a cache of the append-only StrikeEvent log. This recomputes the
 * cache from the log and corrects any drift. Used by the nightly job, the admin endpoint, and
 * after a session deletion (which removes the session's paired strikes — a legitimate correction).
 */
export async function recomputeHammerCount(
  tx: Tx,
  practitionerId: string,
): Promise<{ before: number; after: number; drift: number }> {
  const agg = await tx.strikeEvent.aggregate({
    where: { practitionerId },
    _sum: { amount: true },
  });
  const after = agg._sum.amount ?? 0;
  const p = await tx.practitioner.findUniqueOrThrow({
    where: { id: practitionerId },
    select: { hammerCount: true },
  });
  const before = p.hammerCount;
  if (before !== after) {
    await tx.practitioner.update({ where: { id: practitionerId }, data: { hammerCount: after } });
  }
  return { before, after, drift: after - before };
}

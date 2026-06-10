// The Chronicle's clockwork — advanceSaga() runs inside the same transaction as the real
// event that fired it. Chapters unlock ONLY here, ONLY from real events, and every unlock
// records its cause in `unlockedBy` (invariant #13). Fallback prose is written synchronously
// so a chapter is never empty offline; Claude refinement happens lazily outside the tx
// (routes/saga.ts), cached by promptHash like the Voice.

import type { Prisma, PrismaClient } from '@prisma/client';
import { chapterUnlockedBy, type SagaEvent, type TriggerSpec } from './sagaBeats.js';
import { fallbackChapterProse, type ForgeContext } from './sagaForge.js';
import { BEAT_SKELETON } from './sagaBeats.js';
import { realmForHammerCount } from './realms.js';

type Tx = Prisma.TransactionClient | PrismaClient;

export interface UnlockedChapterLite {
  id: string;
  index: number;
  beatKey: string;
  title: string;
}

/** Build the forge context from real rows (profile, active trial, earned realm). */
export async function forgeContextFor(tx: Tx, practitionerId: string, styleKey: string): Promise<ForgeContext | null> {
  const [p, profile, trial] = await Promise.all([
    tx.practitioner.findUnique({ where: { id: practitionerId }, select: { name: true, hammerCount: true } }),
    tx.soulProfile.findUnique({ where: { practitionerId } }),
    tx.trial.findFirst({ where: { practitionerId, status: 'active' } }),
  ]);
  if (!p || !profile) return null;
  return {
    name: p.name,
    styleKey,
    profile,
    trial: trial
      ? { title: trial.title, totalWeeks: trial.totalWeeks, focusModality: trial.focusModality, goalKind: trial.goalKind }
      : null,
    realmName: realmForHammerCount(p.hammerCount).realm.name,
    skeleton: BEAT_SKELETON,
  };
}

/**
 * Feed real events to the active saga; unlock at most one chapter per event, in beat order.
 * Returns what opened so callers can surface it (cinematic + Chronicle highlight).
 */
export async function advanceSaga(
  tx: Tx,
  practitionerId: string,
  events: SagaEvent[],
): Promise<{ unlocked: UnlockedChapterLite[] }> {
  if (events.length === 0) return { unlocked: [] };
  const saga = await tx.saga.findFirst({
    where: { practitionerId, status: 'active' },
    include: { chapters: { orderBy: { index: 'asc' } } },
  });
  if (!saga) return { unlocked: [] };

  const ctx = await forgeContextFor(tx, practitionerId, saga.styleKey);
  const state = saga.chapters.map((c) => ({
    id: c.id,
    index: c.index,
    optional: c.optional,
    unlockedAt: c.unlockedAt,
    trigger: c.trigger as unknown as TriggerSpec,
    beatKey: c.beatKey,
    title: c.title,
    tease: c.tease,
  }));

  const unlocked: UnlockedChapterLite[] = [];
  const now = new Date();
  for (const ev of events) {
    const ch = chapterUnlockedBy(state, ev);
    if (!ch) continue;
    const prose = ctx ? fallbackChapterProse(ctx, ch, ev) : ch.tease;
    await tx.sagaChapter.update({
      where: { id: ch.id },
      data: {
        unlockedAt: now,
        unlockedBy: ev as unknown as Prisma.InputJsonValue,
        prose,
        proseSource: 'fallback', // lazily refined to Claude prose outside the tx
      },
    });
    ch.unlockedAt = now; // keep in-memory state honest for subsequent events in this batch
    unlocked.push({ id: ch.id, index: ch.index, beatKey: ch.beatKey, title: ch.title });
  }

  // The saga completes when its final non-optional chapter opens.
  if (unlocked.length > 0) {
    const lastRequired = [...state].filter((c) => !c.optional).sort((a, b) => b.index - a.index)[0];
    if (lastRequired?.unlockedAt) {
      await tx.saga.update({ where: { id: saga.id }, data: { status: 'completed' } });
    }
  }

  return { unlocked };
}

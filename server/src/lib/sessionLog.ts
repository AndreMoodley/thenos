import type { Prisma, PrismaClient, Modality, PlannedKind } from '@prisma/client';
import { applyStrike, dayDiff } from './metrics.js';
import { realmsCrossed, type Realm } from './realms.js';
import { utcMidnight, weekIndexFor, phasePlanFor, phaseForWeek } from './protocol.js';
import { advanceSaga, type UnlockedChapterLite } from './sagaEngine.js';
import type { SagaEvent } from './sagaBeats.js';

type Tx = Prisma.TransactionClient | PrismaClient;
const PENANCE_REQUIRED = 7; // consecutive full sessions to cleanse a corruption
const STREAK_BEAT_DAYS = 7; // the Hidden Master notices a week unbroken
const RETURN_GAP_DAYS = 7; // silence long enough to count as a Regression return

export interface LogSessionInput {
  modality: Modality;
  reps: number;
  rating?: number | null;
  note?: string | null;
  occurredOn?: Date;
  clientId?: string | null;
  /** Optional quest link. Fulfillment is ONLY a link — it never strikes (invariant #12). */
  plannedSessionId?: string | null;
}

export interface FulfilledPlannedLite {
  id: string;
  kind: PlannedKind;
  title: string;
  trialId: string;
}

export interface LogSessionResult {
  sessionId: string;
  struck: boolean;
  before: number;
  after: number;
  crossed: Realm[]; // realms crossed by this strike (drives ascension cinematics)
  cleansed: boolean; // did this session complete a Penance cleanse?
  idempotentHit: boolean; // existing session returned for a repeated clientId
  fulfilledPlanned: FulfilledPlannedLite | null; // the quest this real session fulfilled
  unlockedChapters: UnlockedChapterLite[]; // saga chapters opened by this real event
}

const KIND_PRIORITY: Record<PlannedKind, number> = { gate: 0, pillar: 1, surge: 2, flow: 3, stillness: 4 };

/**
 * Link this real session to a quest. Explicit id wins (validated); otherwise auto-match the
 * same UTC day + modality on the active trial, hardest kind first. Stillness quests match
 * ONLY reps:0 sessions and vice versa — a recovery log can never "complete" a Gate.
 */
async function fulfillPlanned(
  tx: Tx,
  practitionerId: string,
  sessionId: string,
  input: LogSessionInput,
  occurredOn: Date,
): Promise<FulfilledPlannedLite | null> {
  const wantsStillness = input.reps <= 0;

  if (input.plannedSessionId) {
    const ps = await tx.plannedSession.findUnique({
      where: { id: input.plannedSessionId },
      include: { trial: { select: { status: true } } },
    });
    const valid =
      ps &&
      ps.practitionerId === practitionerId &&
      !ps.fulfilledBySessionId &&
      ps.trial.status === 'active' &&
      (ps.kind === 'stillness') === wantsStillness;
    if (!valid) return null; // never block a real session over a bad link
    await tx.plannedSession.update({
      where: { id: ps.id },
      data: { fulfilledBySessionId: sessionId, fulfilledAt: new Date() },
    });
    return { id: ps.id, kind: ps.kind, title: ps.title, trialId: ps.trialId };
  }

  const day = utcMidnight(occurredOn);
  const candidates = await tx.plannedSession.findMany({
    where: {
      practitionerId,
      scheduledOn: day,
      fulfilledBySessionId: null,
      modality: input.modality,
      trial: { status: 'active' },
    },
  });
  const match = candidates
    .filter((ps) => (ps.kind === 'stillness') === wantsStillness)
    .sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])[0];
  if (!match) return null;
  await tx.plannedSession.update({
    where: { id: match.id },
    data: { fulfilledBySessionId: sessionId, fulfilledAt: new Date() },
  });
  return { id: match.id, kind: match.kind, title: match.title, trialId: match.trialId };
}

/**
 * Single path for logging training. Used by /practitioner/me/strike, POST /sessions and the
 * offline sync flush. Idempotent per (practitioner, clientId) so the offline queue can safely
 * retry. reps:0 ⇒ recovery/stillness (no strike, invariant #3). Quest fulfillment and saga
 * beats ride the SAME transaction — the story can only ever follow the facts.
 */
export async function logSession(
  tx: Tx,
  practitionerId: string,
  input: LogSessionInput,
): Promise<LogSessionResult> {
  if (input.clientId) {
    const existing = await tx.voidSession.findUnique({
      where: { practitionerId_clientId: { practitionerId, clientId: input.clientId } },
      select: { id: true },
    });
    if (existing) {
      const p = await tx.practitioner.findUniqueOrThrow({
        where: { id: practitionerId },
        select: { hammerCount: true },
      });
      return {
        sessionId: existing.id,
        struck: false,
        before: p.hammerCount,
        after: p.hammerCount,
        crossed: [],
        cleansed: false,
        idempotentHit: true,
        fulfilledPlanned: null,
        unlockedChapters: [],
      };
    }
  }

  // Captured BEFORE the strike so a return-after-silence is measured against real history.
  const prior = await tx.practitioner.findUniqueOrThrow({
    where: { id: practitionerId },
    select: { lastLogDate: true },
  });

  const occurredOn = input.occurredOn ?? new Date();
  const session = await tx.voidSession.create({
    data: {
      practitionerId,
      modality: input.modality,
      reps: input.reps,
      rating: input.rating ?? null,
      note: input.note ?? null,
      occurredOn,
      clientId: input.clientId ?? null,
    },
  });

  const { before, after, struck } = await applyStrike(tx, practitionerId, {
    reps: input.reps,
    sessionId: session.id,
    occurredAt: input.occurredOn,
  });

  // Penance cleanse: a corrupted entity clears once it logs PENANCE_REQUIRED full sessions.
  let cleansed = false;
  if (struck) {
    const p = await tx.practitioner.findUniqueOrThrow({
      where: { id: practitionerId },
      select: { corruptedSince: true, penanceProgress: true },
    });
    if (p.corruptedSince && p.penanceProgress >= PENANCE_REQUIRED) {
      await tx.practitioner.update({
        where: { id: practitionerId },
        data: { corruptedSince: null, penanceProgress: 0 },
      });
      cleansed = true;
    }
  }

  // Quest fulfillment — a link, never a strike (invariant #12).
  const fulfilledPlanned = await fulfillPlanned(tx, practitionerId, session.id, input, occurredOn);

  // Real events → the saga. Order shapes the narrative pacing: a return reopens the path
  // before the day's quest writes its chapter.
  const events: SagaEvent[] = [];
  if (struck && prior.lastLogDate && dayDiff(occurredOn, prior.lastLogDate) >= RETURN_GAP_DAYS) {
    events.push({ kind: 'returned_after_gap', gapDays: dayDiff(occurredOn, prior.lastLogDate) });
  }
  if (fulfilledPlanned) {
    const trialFulfilled = await tx.plannedSession.count({
      where: { trialId: fulfilledPlanned.trialId, fulfilledBySessionId: { not: null } },
    });
    if (fulfilledPlanned.kind === 'gate') {
      const nthGate = await tx.plannedSession.count({
        where: { trialId: fulfilledPlanned.trialId, kind: 'gate', fulfilledBySessionId: { not: null } },
      });
      events.push({ kind: 'gate_fulfilled', plannedSessionId: fulfilledPlanned.id, nthGate });
    }
    events.push({
      kind: 'planned_fulfilled',
      plannedSessionId: fulfilledPlanned.id,
      planKind: fulfilledPlanned.kind,
      nthFulfilled: trialFulfilled,
    });
    // First fulfillment inside a phase ⇒ the trial has truly entered it.
    const trial = await tx.trial.findUnique({
      where: { id: fulfilledPlanned.trialId },
      include: { plannedSessions: { where: { fulfilledBySessionId: { not: null } }, select: { scheduledOn: true } } },
    });
    if (trial) {
      const plan = phasePlanFor(trial.totalWeeks, trial.goalKind);
      const phaseOf = (d: Date) => phaseForWeek(plan, weekIndexFor(trial.startDate, d))?.phaseKey;
      const justFulfilled = await tx.plannedSession.findUniqueOrThrow({
        where: { id: fulfilledPlanned.id },
        select: { scheduledOn: true },
      });
      const phase = phaseOf(justFulfilled.scheduledOn);
      if (phase) {
        const inPhase = trial.plannedSessions.filter((s) => phaseOf(s.scheduledOn) === phase).length;
        if (inPhase === 1) events.push({ kind: 'phase_entered', phaseKey: phase });
      }
    }
  }
  if (struck) {
    const p = await tx.practitioner.findUniqueOrThrow({
      where: { id: practitionerId },
      select: { streak: true },
    });
    if (p.streak >= STREAK_BEAT_DAYS) events.push({ kind: 'streak_reached', days: p.streak });
  }
  for (const realm of struck ? realmsCrossed(before, after) : []) {
    events.push({ kind: 'realm_crossed', realmIndex: realm.index });
  }
  if (cleansed) events.push({ kind: 'corruption_cleansed' });

  const { unlocked } = await advanceSaga(tx, practitionerId, events);

  return {
    sessionId: session.id,
    struck,
    before,
    after,
    crossed: struck ? realmsCrossed(before, after) : [],
    cleansed,
    idempotentHit: false,
    fulfilledPlanned,
    unlockedChapters: unlocked,
  };
}

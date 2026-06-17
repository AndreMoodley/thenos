import type { Prisma, PrismaClient, Modality, PlannedKind } from '@prisma/client';
import { applyStrike } from './metrics.js';
import { realmsCrossed, type Realm } from './realms.js';
import { utcMidnight } from './protocol.js';
import { emit } from './events.js';
import { computeSagaBeats } from './sagaForStrike.js';

type Tx = Prisma.TransactionClient | PrismaClient;
const PENANCE_REQUIRED = 7; // consecutive full sessions to cleanse a corruption

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
  // NOTE: saga chapters are no longer unlocked inside this call. The strike emits SagaBeatsRaised
  // to the outbox; the saga subscriber writes chapters off the critical path. Callers obtain the
  // freshly unlocked chapters by draining the outbox for the practitioner (dispatchPending).
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
 * retry. reps:0 ⇒ recovery/stillness (no strike, invariant #3).
 *
 * The strike transaction writes the StrikeEvent + quest fulfillment and emits two outbox events:
 * `StrikeLogged` (for general consumers) and `SagaBeatsRaised` (the narrative beats). Saga chapter
 * writing happens off this critical path in the saga subscriber — so this transaction stays lean.
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

  // Derive the narrative beats this strike raised (reads only) and hand them to the bus.
  const beats = await computeSagaBeats(tx, {
    practitionerId,
    struck,
    before,
    after,
    occurredOn,
    priorLastLogDate: prior.lastLogDate ?? null,
    fulfilledPlanned,
    cleansed,
  });

  // Transactional outbox. reps:0 ⇒ not struck ⇒ no StrikeLogged (invariant #3). SagaBeatsRaised
  // carries the beats; the saga subscriber writes the chapters off this critical path.
  if (struck) {
    await emit(tx, {
      type: 'StrikeLogged',
      practitionerId,
      sessionId: session.id,
      amount: input.reps,
      modality: input.modality,
      occurredOn: occurredOn.toISOString(),
      before,
      after,
    });
  }
  if (beats.length > 0) {
    await emit(tx, { type: 'SagaBeatsRaised', practitionerId, beats });
  }

  return {
    sessionId: session.id,
    struck,
    before,
    after,
    crossed: struck ? realmsCrossed(before, after) : [],
    cleansed,
    idempotentHit: false,
    fulfilledPlanned,
  };
}

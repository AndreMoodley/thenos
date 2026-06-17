import type { Prisma, PrismaClient } from '@prisma/client';
import { dayDiff } from './metrics.js';
import { realmsCrossed } from './realms.js';
import { weekIndexFor, phasePlanFor, phaseForWeek } from './protocol.js';
import type { SagaEvent } from './sagaBeats.js';
import type { FulfilledPlannedLite } from './sessionLog.js';

type Tx = Prisma.TransactionClient | PrismaClient;

const STREAK_BEAT_DAYS = 7; // the Hidden Master notices a week unbroken
const RETURN_GAP_DAYS = 7; // silence long enough to count as a Regression return

/** What the strike knows about itself — enough to derive the narrative beats it raised. */
export interface SagaBeatsCtx {
  practitionerId: string;
  struck: boolean;
  before: number;
  after: number;
  occurredOn: Date;
  priorLastLogDate: Date | null;
  fulfilledPlanned: FulfilledPlannedLite | null;
  cleansed: boolean;
}

/**
 * Derive the ordered saga beats a logged strike raised. Runs INSIDE the strike transaction (the
 * counts/phase reads need the just-committed fulfillment), but it only READS and returns plain
 * facts — the chapter-writing (advanceSaga) is done later by the saga subscriber off the strike's
 * critical path. Order shapes the narrative pacing: a return reopens the path before the day's
 * quest writes its chapter.
 */
export async function computeSagaBeats(tx: Tx, ctx: SagaBeatsCtx): Promise<SagaEvent[]> {
  const { practitionerId, struck, before, after, occurredOn, priorLastLogDate, fulfilledPlanned, cleansed } = ctx;

  const events: SagaEvent[] = [];
  if (struck && priorLastLogDate && dayDiff(occurredOn, priorLastLogDate) >= RETURN_GAP_DAYS) {
    events.push({ kind: 'returned_after_gap', gapDays: dayDiff(occurredOn, priorLastLogDate) });
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

  return events;
}

// Trial lifecycle operations shared by /trials and /vows (a kept trial-vow completes its
// trial; a completed trial keeps its vow — one implementation, called inside one transaction).

import type { Prisma, PrismaClient, Trial } from '@prisma/client';
import {
  generateProtocol,
  scheduledDateFor,
  alignToMonday,
  utcMidnight,
  DEFAULT_OPEN_PATH_WEEKS,
  GENERATOR_VERSION,
  phasePlanFor,
  type ProtocolParams,
} from './protocol.js';
import { advanceSaga, type UnlockedChapterLite } from './sagaEngine.js';

type Tx = Prisma.TransactionClient | PrismaClient;

const DAY_MS = 24 * 60 * 60 * 1000;

const PHASE_NAMES: Record<string, string> = {
  gathering: 'The Gathering',
  tribulation: 'The Tribulation',
  quieting: 'The Quieting',
};

export function protocolParamsOf(trial: Trial): ProtocolParams {
  return {
    goalKind: trial.goalKind,
    focusModality: trial.focusModality,
    experience: trial.experience,
    ability: trial.ability as { baselineReps: number },
    sessionsPerWeek: trial.sessionsPerWeek,
    pillarDay: trial.pillarDay,
    volumeDial: trial.volumeDial,
    difficultyDial: trial.difficultyDial,
    totalWeeks: trial.totalWeeks,
    startDate: trial.startDate,
  };
}

/** Mondays only: this week's if today IS Monday, otherwise next week's — paths open clean. */
export function defaultStartDate(now: Date): Date {
  const thisMonday = alignToMonday(now);
  return utcMidnight(now).getTime() === thisMonday.getTime()
    ? thisMonday
    : new Date(thisMonday.getTime() + 7 * DAY_MS);
}

export interface CreateTrialInput {
  title: string;
  goalKind: 'breakthrough' | 'open_path';
  goalLabel?: string | null;
  focusModality: ProtocolParams['focusModality'];
  experience: ProtocolParams['experience'];
  ability: { baselineReps: number };
  sessionsPerWeek: number;
  pillarDay: number;
  volumeDial: number;
  difficultyDial: number;
  totalWeeks: number;
  startDate?: Date;
  targetDate?: Date | null;
  wagerAmount?: number;
  chainedFromId?: string | null;
}

/**
 * Create the trial, generate its quests, and swear the linked MAJOR Vow (vowSubtype "trial")
 * so the existing Trophy/flourish/wager machinery composes untouched. Fires `trial_started`.
 */
export async function createTrialTx(
  tx: Tx,
  practitionerId: string,
  input: CreateTrialInput,
  now: Date = new Date(),
): Promise<{ trial: Trial; unlockedChapters: UnlockedChapterLite[] }> {
  const startDate = alignToMonday(input.startDate ?? defaultStartDate(now));
  const endDate = new Date(startDate.getTime() + input.totalWeeks * 7 * DAY_MS);
  const phasePlan = phasePlanFor(input.totalWeeks, input.goalKind);

  const vow = await tx.vow.create({
    data: {
      practitionerId,
      title: input.title,
      type: 'major',
      vowSubtype: 'trial',
      resolutionDate: input.targetDate ?? endDate,
      wagerAmount: input.wagerAmount ?? 0,
      wagerStatus: (input.wagerAmount ?? 0) > 0 ? 'pending' : 'none',
      progressions: {
        create: phasePlan.map((span, i) => ({
          text: `${PHASE_NAMES[span.phaseKey] ?? span.phaseKey} — weeks ${span.firstWeek + 1}–${span.lastWeek + 1}`,
          orderIndex: i,
        })),
      },
    },
  });

  const trial = await tx.trial.create({
    data: {
      practitionerId,
      title: input.title,
      goalKind: input.goalKind,
      goalLabel: input.goalLabel ?? null,
      focusModality: input.focusModality,
      experience: input.experience,
      ability: input.ability,
      sessionsPerWeek: input.sessionsPerWeek,
      pillarDay: input.pillarDay,
      volumeDial: input.volumeDial,
      difficultyDial: input.difficultyDial,
      totalWeeks: input.totalWeeks,
      startDate,
      targetDate: input.targetDate ?? null,
      generatorVersion: GENERATOR_VERSION,
      vowId: vow.id,
      chainedFromId: input.chainedFromId ?? null,
    },
  });

  const drafts = generateProtocol(protocolParamsOf(trial));
  await tx.plannedSession.createMany({
    data: drafts.map((d) => ({
      trialId: trial.id,
      practitionerId,
      scheduledOn: scheduledDateFor(startDate, d.weekIndex, d.dayOfWeek),
      kind: d.kind,
      modality: d.modality,
      targetReps: d.targetReps,
      title: d.title,
    })),
  });

  const { unlocked } = await advanceSaga(tx, practitionerId, [{ kind: 'trial_started', trialId: trial.id }]);
  return { trial, unlockedChapters: unlocked };
}

/**
 * Complete a trial: status → completed, the linked vow is kept (Trophy + flourish via the
 * existing vow semantics), the saga hears `trial_completed` + `vow_kept`, and — unless told
 * otherwise — an Open Path follow-up is sworn so there is never a dead end after the goal.
 */
export async function completeTrialTx(
  tx: Tx,
  practitionerId: string,
  trial: Trial,
  opts: { chain?: boolean } = {},
  now: Date = new Date(),
): Promise<{
  trial: Trial;
  flourish: boolean;
  chained: Trial | null;
  unlockedChapters: UnlockedChapterLite[];
}> {
  const updated = await tx.trial.update({ where: { id: trial.id }, data: { status: 'completed' } });

  let flourish = false;
  if (trial.vowId) {
    const vow = await tx.vow.findUnique({ where: { id: trial.vowId } });
    if (vow && vow.status === 'active') {
      await tx.vow.update({
        where: { id: vow.id },
        data: {
          status: 'kept',
          resolvedAt: now,
          wagerStatus: vow.wagerStatus === 'pending' ? 'won' : vow.wagerStatus,
        },
      });
      flourish = vow.type === 'major';
    }
  }

  const events: Parameters<typeof advanceSaga>[2] = [{ kind: 'trial_completed', trialId: trial.id }];
  if (trial.vowId) events.push({ kind: 'vow_kept', vowId: trial.vowId });
  const { unlocked } = await advanceSaga(tx, practitionerId, events);

  let chained: Trial | null = null;
  if (opts.chain !== false) {
    const result = await createTrialTx(
      tx,
      practitionerId,
      {
        title: 'The Open Path',
        goalKind: 'open_path',
        goalLabel: 'Hold the ground you took',
        focusModality: trial.focusModality,
        experience: trial.experience,
        ability: trial.ability as { baselineReps: number },
        sessionsPerWeek: trial.sessionsPerWeek,
        pillarDay: trial.pillarDay,
        volumeDial: trial.volumeDial,
        difficultyDial: trial.difficultyDial,
        totalWeeks: DEFAULT_OPEN_PATH_WEEKS,
        chainedFromId: trial.id,
      },
      now,
    );
    chained = result.trial;
  }

  return { trial: updated, flourish, chained, unlockedChapters: unlocked };
}

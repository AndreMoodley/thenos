import type { Practitioner, Trial, PlannedSession, TrialRealignment, Saga, SagaChapter } from '@prisma/client';
import { realmForHammerCount } from './realms.js';
import { phasePlanFor, phaseForWeek, weekIndexFor } from './protocol.js';

/** Public practitioner shape — never leaks passwordHash; includes the COMPUTED realm/stage. */
export function publicPractitioner(p: Practitioner) {
  const r = realmForHammerCount(p.hammerCount);
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    ki: p.ki,
    shadowLevel: p.shadowLevel,
    hammerCount: p.hammerCount,
    streak: p.streak,
    lastLogDate: p.lastLogDate,
    anchorCompletedAt: p.anchorCompletedAt,
    crystals: p.crystals,
    corruptedSince: p.corruptedSince,
    penanceProgress: p.penanceProgress,
    restrictionScars: p.restrictionScars,
    dormantSince: p.dormantSince,
    activeFormKey: p.activeFormKey,
    activeDomainKey: p.activeDomainKey,
    activeManifestationPresetId: p.activeManifestationPresetId,
    updatedAt: p.updatedAt,
    // computed — never stored
    realm: {
      index: r.realm.index,
      key: r.realm.key,
      name: r.realm.name,
      sigil: r.realm.sigil,
      stageLabel: r.realm.stageLabel,
    },
    stage: r.stage,
    originArtMastery: r.originArtMastery,
    nextThreshold: r.nextThreshold,
    hammerToNext: r.hammerToNext,
    progressToNext: r.progressToNext,
  };
}

export const DEFAULT_AVATAR_CONFIG = { layers: {} as Record<string, { itemKey: string; tint?: string }>, demeanor: 'neutral' };

/** Trial + everything DERIVED (week/phase are never stored — computed here every time). */
export function serializeTrial(
  trial: Trial,
  plannedSessions: PlannedSession[],
  realignments: TrialRealignment[] = [],
  now: Date = new Date(),
) {
  const phasePlan = phasePlanFor(trial.totalWeeks, trial.goalKind);
  const currentWeekIndex = weekIndexFor(trial.startDate, now);
  const currentPhase = phaseForWeek(phasePlan, currentWeekIndex)?.phaseKey ?? null;
  return {
    trial: {
      id: trial.id,
      title: trial.title,
      goalKind: trial.goalKind,
      goalLabel: trial.goalLabel,
      focusModality: trial.focusModality,
      experience: trial.experience,
      ability: trial.ability,
      sessionsPerWeek: trial.sessionsPerWeek,
      pillarDay: trial.pillarDay,
      volumeDial: trial.volumeDial,
      difficultyDial: trial.difficultyDial,
      totalWeeks: trial.totalWeeks,
      startDate: trial.startDate,
      targetDate: trial.targetDate,
      status: trial.status,
      vowId: trial.vowId,
      chainedFromId: trial.chainedFromId,
      // derived — never stored
      currentWeekIndex,
      currentPhase,
      phasePlan,
    },
    plannedSessions: plannedSessions.map((ps) => ({
      id: ps.id,
      trialId: ps.trialId,
      scheduledOn: ps.scheduledOn,
      kind: ps.kind,
      modality: ps.modality,
      targetReps: ps.targetReps,
      title: ps.title,
      fulfilledBySessionId: ps.fulfilledBySessionId,
      fulfilledAt: ps.fulfilledAt,
    })),
    realignments: realignments.map((r) => ({
      id: r.id,
      kind: r.kind,
      reason: r.reason,
      payload: r.payload,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}

/** Saga + chapters. Locked chapters expose ONLY their tease (Zeigarnik) — never prose. */
export function serializeSaga(saga: Saga & { chapters: SagaChapter[] }) {
  const chapters = [...saga.chapters].sort((a, b) => a.index - b.index);
  const nextLocked = chapters.find((c) => !c.unlockedAt && !c.optional) ?? null;
  return {
    saga: {
      id: saga.id,
      styleKey: saga.styleKey,
      title: saga.title,
      synopsis: saga.synopsis,
      demonName: saga.demonName,
      status: saga.status,
      source: saga.source,
      trialId: saga.trialId,
      createdAt: saga.createdAt,
    },
    chapters: chapters.map((c) =>
      c.unlockedAt
        ? {
            id: c.id,
            index: c.index,
            beatKey: c.beatKey,
            title: c.title,
            tease: c.tease,
            prose: c.prose,
            proseSource: c.proseSource,
            optional: c.optional,
            unlockedAt: c.unlockedAt,
            unlockedBy: c.unlockedBy,
          }
        : {
            id: c.id,
            index: c.index,
            beatKey: c.beatKey,
            title: c.title,
            tease: c.tease,
            optional: c.optional,
            unlockedAt: null,
          },
    ),
    nextTease: nextLocked ? { index: nextLocked.index, title: nextLocked.title, tease: nextLocked.tease } : null,
  };
}

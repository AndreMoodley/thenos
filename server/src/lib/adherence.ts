// The Meridian Reading — pure adherence analyzer for an active trial.
// Produces Realignment DRAFTS only. Persistence and consent live in the route: nothing here
// (or anywhere) changes a plan until the practitioner accepts (invariant #14, suggest-only).

import { weekIndexFor, type PlannedKindT } from './protocol.js';

export interface TrialLite {
  startDate: Date;
  totalWeeks: number;
  sessionsPerWeek: number;
  volumeDial: number;
  difficultyDial: number;
  goalKind: 'breakthrough' | 'open_path';
}

export interface PlannedLite {
  scheduledOn: Date;
  kind: PlannedKindT;
  fulfilledBySessionId: string | null;
}

export interface SessionLite {
  id: string;
  occurredOn: Date;
  reps: number;
  rating: number | null;
}

export interface WeekSummary {
  weekIndex: number;
  planned: number; // counted quests (stillness excluded — recovery never penalizes)
  fulfilled: number;
  missed: number; // scheduled before today, unfulfilled
  extra: number; // real sessions beyond the plan — effort always counts
  adherence: number; // fulfilled / planned (1 when nothing was planned)
  avgRating: number | null;
}

export type RealignmentKindT = 'ease' | 'intensify' | 'realign_missed';

export interface RealignmentDraft {
  kind: RealignmentKindT;
  reason: string; // data-grounded; shown verbatim to the practitioner
  payload: Record<string, unknown>; // deltas applied only on accept
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayDiffUTC(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((da - db) / DAY_MS);
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Week-by-week truth of the trial so far, derived entirely from real rows. */
export function summarizeWeeks(
  trial: TrialLite,
  planned: PlannedLite[],
  sessions: SessionLite[],
  today: Date,
): WeekSummary[] {
  const currentWeek = weekIndexFor(trial.startDate, today);
  const lastWeek = Math.min(Math.max(currentWeek, 0), trial.totalWeeks - 1);
  const fulfilledIds = new Set(planned.map((p) => p.fulfilledBySessionId).filter(Boolean) as string[]);
  const summaries: WeekSummary[] = [];

  for (let w = 0; w <= lastWeek; w++) {
    const inWeek = planned.filter(
      (p) => p.kind !== 'stillness' && weekIndexFor(trial.startDate, p.scheduledOn) === w,
    );
    const fulfilled = inWeek.filter((p) => p.fulfilledBySessionId);
    const missed = inWeek.filter((p) => !p.fulfilledBySessionId && dayDiffUTC(p.scheduledOn, today) < 0);
    const weekSessions = sessions.filter((s) => s.reps > 0 && weekIndexFor(trial.startDate, s.occurredOn) === w);
    const extra = weekSessions.filter((s) => !fulfilledIds.has(s.id)).length;
    const rated = weekSessions.filter((s) => fulfilledIds.has(s.id) && s.rating != null);
    summaries.push({
      weekIndex: w,
      planned: inWeek.length,
      fulfilled: fulfilled.length,
      missed: missed.length,
      extra,
      adherence: inWeek.length > 0 ? fulfilled.length / inWeek.length : 1,
      avgRating: rated.length ? rated.reduce((s, x) => s + (x.rating ?? 0), 0) / rated.length : null,
    });
  }
  return summaries;
}

/**
 * Propose realignments, highest-priority first. Rules fire only on real, completed data:
 *  · return after a ≥7-day silence  → re-enter the current week, eased
 *  · ≥2 missed in the current week  → shift the remaining week
 *  · 2 consecutive weeks under 50%  → ease the volume dial
 *  · 2 consecutive perfect weeks rated ≥4 → intensify (only past the Gathering)
 */
export function proposeRealignments(
  trial: TrialLite,
  summaries: WeekSummary[],
  sessions: SessionLite[],
  today: Date,
): RealignmentDraft[] {
  const drafts: RealignmentDraft[] = [];
  const currentWeek = Math.max(0, weekIndexFor(trial.startDate, today));
  const completed = summaries.filter((s) => s.weekIndex < currentWeek);
  const current = summaries.find((s) => s.weekIndex === currentWeek);

  // Return after a gap — the Regression beat's data source.
  const ordered = [...sessions].filter((s) => s.reps > 0).sort((a, b) => b.occurredOn.getTime() - a.occurredOn.getTime());
  if (ordered.length >= 2) {
    const [latest, previous] = [ordered[0]!, ordered[1]!];
    const gap = dayDiffUTC(latest.occurredOn, previous.occurredOn);
    if (gap >= 7 && dayDiffUTC(today, latest.occurredOn) <= 2) {
      drafts.push({
        kind: 'realign_missed',
        reason: `You returned after ${gap} quiet days. The path can re-open at this week, eased, so the climb resumes where you stand.`,
        payload: { reEnterAtWeek: currentWeek, easeFactor: 0.8 },
      });
    }
  }

  if (current && current.missed >= 2) {
    drafts.push({
      kind: 'realign_missed',
      reason: `${current.missed} quests slipped past this week. The remaining days can be re-laid around what is left.`,
      payload: { shiftRemaining: true },
    });
  }

  const lastTwo = completed.slice(-2);
  if (lastTwo.length === 2) {
    const [a, b] = [lastTwo[0]!, lastTwo[1]!];
    if (a.adherence < 0.5 && b.adherence < 0.5 && trial.volumeDial > 1) {
      drafts.push({
        kind: 'ease',
        reason: `Two weeks landed at ${pct(a.adherence)} and ${pct(b.adherence)} of the path. A gentler volume holds the climb without breaking it.`,
        payload: { volumeDelta: -1 },
      });
    }
    if (
      a.adherence >= 1 &&
      b.adherence >= 1 &&
      (a.avgRating ?? 0) >= 4 &&
      (b.avgRating ?? 0) >= 4 &&
      currentWeek > 1 &&
      trial.difficultyDial < 5
    ) {
      drafts.push({
        kind: 'intensify',
        reason: `Two perfect weeks, rated ${a.avgRating!.toFixed(1)} and ${b.avgRating!.toFixed(1)}. The tribulation can sharpen — you are ready for more.`,
        payload: { difficultyDelta: 1 },
      });
    }
  }

  return drafts;
}

// The Protocol — deterministic trial-plan generator (Runna-style periodization, void-skinned).
// PURE: no RNG, no Date.now, no I/O. Same params ⇒ identical plan, so regeneration and the
// seeder can never diverge from runtime. Weeks/phases are NEVER stored — derived from these
// params (the never-store-realm philosophy applied to training plans).
//
// Phases:  Gathering (base volume) → Tribulation (key block, ramps weekly) → Quieting (taper,
// volume −40–60% of peak while intensity stays sharp). Open Path trials have no Quieting —
// they are rolling maintenance blocks that auto-chain.

export type TrialGoalKindT = 'breakthrough' | 'open_path';
export type TrialExperienceT = 'novice' | 'practiced' | 'seasoned';
export type PlannedKindT = 'flow' | 'surge' | 'pillar' | 'gate' | 'stillness';
export type PhaseKey = 'gathering' | 'tribulation' | 'quieting';
export type ModalityT = 'origin' | 'pull' | 'push' | 'core' | 'cardio' | 'recovery';

export interface ProtocolParams {
  goalKind: TrialGoalKindT;
  focusModality: ModalityT;
  experience: TrialExperienceT;
  ability: { baselineReps: number };
  sessionsPerWeek: number; // 2..6 counted sessions (stillness is extra, never counted)
  pillarDay: number; // 0..6, 0 = Monday — the long-session day
  volumeDial: number; // 1..5
  difficultyDial: number; // 1..5
  totalWeeks: number; // 6..26
  startDate: Date; // Monday-aligned UTC midnight
}

export interface PhaseSpan {
  phaseKey: PhaseKey;
  firstWeek: number; // 0-based, inclusive
  lastWeek: number; // inclusive
}

export interface PlannedDraft {
  weekIndex: number; // 0-based
  dayOfWeek: number; // 0..6, 0 = Monday (offset from startDate)
  kind: PlannedKindT;
  modality: ModalityT;
  targetReps: number; // 0 for stillness — never strikes
  title: string;
}

export const GENERATOR_VERSION = 1;
export const DEFAULT_OPEN_PATH_WEEKS = 4; // auto-chained maintenance block length

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** UTC calendar-day difference (a-b) in whole days. Mirrors lib/metrics.ts dayDiff. */
function dayDiffUTC(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((da - db) / DAY_MS);
}

/** UTC midnight of the given date. */
export function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** The Monday (UTC) on or before the given date — trial weeks always start on Monday. */
export function alignToMonday(d: Date): Date {
  const mid = utcMidnight(d);
  const dow = (mid.getUTCDay() + 6) % 7; // JS Sunday=0 → our Monday=0
  return new Date(mid.getTime() - dow * DAY_MS);
}

/** Phase layout for a trial. Quieting only exists for breakthrough goals. */
export function phasePlanFor(totalWeeks: number, goalKind: TrialGoalKindT): PhaseSpan[] {
  const weeks = clamp(Math.floor(totalWeeks), 1, 52);
  const quieting = goalKind === 'breakthrough' ? (weeks >= 14 ? 3 : 2) : 0;
  const gathering = clamp(Math.round((weeks - quieting) * 0.3), 1, 6);
  const tribulation = Math.max(0, weeks - quieting - gathering);
  const spans: PhaseSpan[] = [{ phaseKey: 'gathering', firstWeek: 0, lastWeek: gathering - 1 }];
  if (tribulation > 0) {
    spans.push({ phaseKey: 'tribulation', firstWeek: gathering, lastWeek: gathering + tribulation - 1 });
  }
  if (quieting > 0) {
    spans.push({ phaseKey: 'quieting', firstWeek: weeks - quieting, lastWeek: weeks - 1 });
  }
  return spans;
}

export function phaseForWeek(plan: PhaseSpan[], weekIndex: number): PhaseSpan | null {
  return plan.find((s) => weekIndex >= s.firstWeek && weekIndex <= s.lastWeek) ?? null;
}

/** 0-based plan week containing `on` (negative before the trial, ≥ totalWeeks after it). */
export function weekIndexFor(startDate: Date, on: Date): number {
  return Math.floor(dayDiffUTC(on, startDate) / 7);
}

/** The UTC-midnight date of (weekIndex, dayOfWeek) within a trial. */
export function scheduledDateFor(startDate: Date, weekIndex: number, dayOfWeek: number): Date {
  return new Date(utcMidnight(startDate).getTime() + (weekIndex * 7 + dayOfWeek) * DAY_MS);
}

/**
 * A quest may move within its own week or to an adjacent one, never into the past and never
 * before the trial began. The user's manual escape hatch for timezone/week-boundary drift.
 */
export function canMove(scheduledOn: Date, newDate: Date, trialStart: Date, today: Date): boolean {
  if (dayDiffUTC(newDate, today) < 0) return false;
  if (dayDiffUTC(newDate, trialStart) < 0) return false;
  const fromWeek = weekIndexFor(trialStart, scheduledOn);
  const toWeek = weekIndexFor(trialStart, newDate);
  return Math.abs(toWeek - fromWeek) <= 1;
}

// ── volume model ──────────────────────────────────────────────

const KIND_FACTOR: Record<PlannedKindT, number> = {
  pillar: 1.6,
  gate: 1.0,
  surge: 0.9,
  flow: 0.7,
  stillness: 0,
};

const EXPERIENCE_FACTOR: Record<TrialExperienceT, number> = {
  novice: 0.85,
  practiced: 1.0,
  seasoned: 1.15,
};

function rampFor(plan: PhaseSpan[], weekIndex: number): number {
  const span = phaseForWeek(plan, weekIndex);
  if (!span) return 1;
  const w = weekIndex - span.firstWeek;
  if (span.phaseKey === 'gathering') return 0.85 + 0.05 * w;
  if (span.phaseKey === 'tribulation') {
    // Every 4th tribulation week eases (deload) so the build stays survivable.
    const base = 1.0 + 0.04 * w;
    return (w + 1) % 4 === 0 ? base * 0.7 : base;
  }
  // Quieting: hold 45–55% of the tribulation peak (volume −40–60%, intensity stays).
  const trib = plan.find((s) => s.phaseKey === 'tribulation');
  const peak = trib ? 1.0 + 0.04 * (trib.lastWeek - trib.firstWeek) : 1.0;
  const qLen = span.lastWeek - span.firstWeek;
  const t = qLen > 0 ? w / qLen : 0;
  return peak * (0.55 - 0.1 * t);
}

function repsFor(params: ProtocolParams, plan: PhaseSpan[], weekIndex: number, kind: PlannedKindT): number {
  if (kind === 'stillness') return 0;
  const volumeF = 0.7 + params.volumeDial * 0.1; // 0.8 .. 1.2
  const difficultyF = kind === 'surge' || kind === 'gate' ? 0.85 + params.difficultyDial * 0.05 : 1; // 0.9 .. 1.1
  const raw =
    params.ability.baselineReps *
    KIND_FACTOR[kind] *
    EXPERIENCE_FACTOR[params.experience] *
    volumeF *
    difficultyF *
    rampFor(plan, weekIndex);
  return Math.max(5, Math.round(raw / 5) * 5);
}

// ── authored quest titles (deterministic pick — flavor, never structure) ──

const TITLES: Record<PlannedKindT, readonly string[]> = {
  flow: ['Walk the Meridians', 'Quiet Forms', 'The Long Breath', 'Shadow Drills', 'Roots Deepen'],
  surge: ['Surge of the Inner Gate', 'Tempering Flames', 'The Hammer Falls Twice', 'Lightning Steps'],
  pillar: ['The Pillar Hour', 'Carry the Mountain', 'The Long Ascent'],
  gate: ['Gate of the Lower Floor', 'The Warden Waits', 'Trial Gate'],
  stillness: ['Stillness', 'Seal the Vessel', 'Quiet Water'],
};

export const BREAKTHROUGH_GATE_TITLE = 'The Breakthrough Gate';

function titleFor(kind: PlannedKindT, weekIndex: number, dayOfWeek: number): string {
  const arr = TITLES[kind];
  return arr[(weekIndex * 7 + dayOfWeek) % arr.length]!;
}

// ── the generator ─────────────────────────────────────────────

/**
 * Generate the full plan: one quest per scheduled day, arranged around the Pillar Day.
 * Weekly shape: 1 pillar · 1 surge (a 2nd in tribulation when ≥5 sessions) · flow fills ·
 * 1 stillness (targetReps 0, never counted toward sessionsPerWeek, never strikes).
 * Gates: last gathering week's pillar, every 4th tribulation week's surge, and — for
 * breakthrough trials — the final week's pillar (the Breakthrough itself).
 */
export function generateProtocol(params: ProtocolParams): PlannedDraft[] {
  const totalWeeks = clamp(Math.floor(params.totalWeeks), 1, 52);
  const sessions = clamp(Math.floor(params.sessionsPerWeek), 2, 6);
  const pillarDay = clamp(Math.floor(params.pillarDay), 0, 6);
  const plan = phasePlanFor(totalWeeks, params.goalKind);
  const gathering = plan.find((s) => s.phaseKey === 'gathering');
  const drafts: PlannedDraft[] = [];

  for (let week = 0; week < totalWeeks; week++) {
    const span = phaseForWeek(plan, week);
    const phase = span?.phaseKey ?? 'tribulation';
    const weekInPhase = span ? week - span.firstWeek : 0;

    // kind by day-of-week offset from the pillar day
    const byDay = new Map<number, PlannedKindT>();
    const at = (offset: number) => (pillarDay + offset) % 7;
    byDay.set(at(0), 'pillar');
    byDay.set(at(1), 'stillness');
    byDay.set(at(3), 'surge');
    const secondSurge = phase === 'tribulation' && sessions >= 5;
    if (secondSurge) byDay.set(at(5), 'surge');

    // flow fills the remaining counted slots, spaced deterministically
    let flows = sessions - 2 - (secondSurge ? 1 : 0); // pillar + surge(s) are counted
    for (const offset of [2, 4, 6, 5]) {
      if (flows <= 0) break;
      const day = at(offset);
      if (byDay.has(day)) continue;
      byDay.set(day, 'flow');
      flows--;
    }

    // gates replace existing slots — assessment is a session, never an extra burden
    if (gathering && week === gathering.lastWeek) byDay.set(at(0), 'gate');
    if (phase === 'tribulation' && (weekInPhase + 1) % 4 === 0) byDay.set(at(3), 'gate');
    const isFinalBreakthroughWeek = params.goalKind === 'breakthrough' && week === totalWeeks - 1;
    if (isFinalBreakthroughWeek) byDay.set(at(0), 'gate');

    for (const [dayOfWeek, kind] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      const modality: ModalityT = kind === 'stillness' ? 'recovery' : params.focusModality;
      const isBreakthroughGate = isFinalBreakthroughWeek && kind === 'gate' && dayOfWeek === at(0);
      drafts.push({
        weekIndex: week,
        dayOfWeek,
        kind,
        modality,
        targetReps: repsFor(params, plan, week, kind),
        title: isBreakthroughGate ? BREAKTHROUGH_GATE_TITLE : titleFor(kind, week, dayOfWeek),
      });
    }
  }

  return drafts;
}

/** The future slice of a regenerated plan — never emits weeks before `fromWeekIndex`. */
export function regenerateFrom(params: ProtocolParams, fromWeekIndex: number): PlannedDraft[] {
  return generateProtocol(params).filter((d) => d.weekIndex >= fromWeekIndex);
}

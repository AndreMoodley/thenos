import { describe, it, expect } from 'vitest';
import { summarizeWeeks, proposeRealignments, type TrialLite, type PlannedLite, type SessionLite } from '../lib/adherence.js';
import { scheduledDateFor } from '../lib/protocol.js';

const START = new Date(Date.UTC(2026, 0, 5)); // a Monday

const trial = (over: Partial<TrialLite> = {}): TrialLite => ({
  startDate: START,
  totalWeeks: 10,
  sessionsPerWeek: 4,
  volumeDial: 3,
  difficultyDial: 3,
  goalKind: 'breakthrough',
  ...over,
});

const quest = (week: number, day: number, fulfilled: string | null = null, kind: PlannedLite['kind'] = 'flow'): PlannedLite => ({
  scheduledOn: scheduledDateFor(START, week, day),
  kind,
  fulfilledBySessionId: fulfilled,
});

const session = (id: string, week: number, day: number, rating: number | null = 4, reps = 50): SessionLite => ({
  id,
  occurredOn: scheduledDateFor(START, week, day),
  reps,
  rating,
});

describe('adherence — the Meridian Reading (pure, suggest-only)', () => {
  it('summarizes weeks from real rows; stillness never counts against the practitioner', () => {
    const today = scheduledDateFor(START, 1, 3);
    const planned = [
      quest(0, 0, 's1'),
      quest(0, 2, null), // missed
      quest(0, 4, 's2'),
      quest(0, 1, null, 'stillness'), // excluded from counts entirely
      quest(1, 0, null), // current week, not yet missed if in future… day 0 < today(day 3) ⇒ missed
    ];
    const sessions = [session('s1', 0, 0), session('s2', 0, 4), session('x1', 0, 5)];
    const weeks = summarizeWeeks(trial(), planned, sessions, today);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({ weekIndex: 0, planned: 3, fulfilled: 2, missed: 1, extra: 1 });
    expect(weeks[0]!.adherence).toBeCloseTo(2 / 3);
    expect(weeks[0]!.avgRating).toBe(4);
    expect(weeks[1]).toMatchObject({ weekIndex: 1, planned: 1, missed: 1 });
  });

  it('proposes ease after two consecutive weeks under 50%', () => {
    const today = scheduledDateFor(START, 2, 0);
    const planned = [quest(0, 0), quest(0, 2), quest(1, 0), quest(1, 2)];
    const weeks = summarizeWeeks(trial(), planned, [], today);
    const drafts = proposeRealignments(trial(), weeks, [], today);
    const ease = drafts.find((d) => d.kind === 'ease');
    expect(ease).toBeTruthy();
    expect(ease!.payload).toEqual({ volumeDelta: -1 });
    expect(ease!.reason).toContain('0%');
    // …but never below the lowest volume dial
    expect(proposeRealignments(trial({ volumeDial: 1 }), weeks, [], today).some((d) => d.kind === 'ease')).toBe(false);
  });

  it('proposes intensify after two perfect, well-rated weeks — and not in week one', () => {
    const today = scheduledDateFor(START, 2, 0);
    const planned = [quest(0, 0, 'a'), quest(0, 2, 'b'), quest(1, 0, 'c'), quest(1, 2, 'd')];
    const sessions = [session('a', 0, 0, 5), session('b', 0, 2, 4), session('c', 1, 0, 4), session('d', 1, 2, 5)];
    const weeks = summarizeWeeks(trial(), planned, sessions, today);
    const drafts = proposeRealignments(trial(), weeks, sessions, today);
    const up = drafts.find((d) => d.kind === 'intensify');
    expect(up).toBeTruthy();
    expect(up!.payload).toEqual({ difficultyDelta: 1 });
    // capped at the top dial
    expect(proposeRealignments(trial({ difficultyDial: 5 }), weeks, sessions, today).some((d) => d.kind === 'intensify')).toBe(false);
    // poorly-rated perfection does not intensify
    const tired = sessions.map((s) => ({ ...s, rating: 2 }));
    const tiredWeeks = summarizeWeeks(trial(), planned, tired, today);
    expect(proposeRealignments(trial(), tiredWeeks, tired, today).some((d) => d.kind === 'intensify')).toBe(false);
  });

  it('proposes a mid-week realign when ≥2 quests have already slipped', () => {
    const today = scheduledDateFor(START, 0, 5);
    const planned = [quest(0, 0), quest(0, 2), quest(0, 6)];
    const weeks = summarizeWeeks(trial(), planned, [], today);
    const drafts = proposeRealignments(trial(), weeks, [], today);
    const shift = drafts.find((d) => d.kind === 'realign_missed' && (d.payload as any).shiftRemaining);
    expect(shift).toBeTruthy();
    expect(shift!.reason).toContain('2 quests');
  });

  it('greets a return after ≥7 silent days with an eased re-entry', () => {
    const today = scheduledDateFor(START, 2, 1);
    const sessions = [session('back', 2, 0), session('old', 0, 0)];
    const drafts = proposeRealignments(trial(), [], sessions, today);
    const back = drafts.find((d) => d.kind === 'realign_missed' && (d.payload as any).reEnterAtWeek !== undefined);
    expect(back).toBeTruthy();
    expect(back!.reason).toContain('14 quiet days');
    // a one-day pause is not a regression
    const steady = [session('b', 1, 1), session('a', 1, 0)];
    expect(proposeRealignments(trial(), [], steady, scheduledDateFor(START, 1, 2))).toHaveLength(0);
  });

  it('is pure — inputs are never mutated', () => {
    const today = scheduledDateFor(START, 1, 0);
    const planned = [quest(0, 0)];
    const sessions = [session('s', 0, 0)];
    const frozenPlanned = JSON.stringify(planned);
    const frozenSessions = JSON.stringify(sessions);
    const weeks = summarizeWeeks(trial(), planned, sessions, today);
    proposeRealignments(trial(), weeks, sessions, today);
    expect(JSON.stringify(planned)).toBe(frozenPlanned);
    expect(JSON.stringify(sessions)).toBe(frozenSessions);
  });
});

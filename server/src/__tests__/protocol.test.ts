import { describe, it, expect } from 'vitest';
import {
  phasePlanFor,
  generateProtocol,
  regenerateFrom,
  weekIndexFor,
  scheduledDateFor,
  alignToMonday,
  canMove,
  phaseForWeek,
  BREAKTHROUGH_GATE_TITLE,
  type ProtocolParams,
} from '../lib/protocol.js';

const params = (over: Partial<ProtocolParams> = {}): ProtocolParams => ({
  goalKind: 'breakthrough',
  focusModality: 'cardio',
  experience: 'practiced',
  ability: { baselineReps: 100 },
  sessionsPerWeek: 4,
  pillarDay: 5,
  volumeDial: 3,
  difficultyDial: 3,
  totalWeeks: 10,
  startDate: new Date(Date.UTC(2026, 0, 5)), // a Monday
  ...over,
});

describe('protocol — deterministic trial-plan generator', () => {
  it('is deterministic: same params produce an identical plan', () => {
    expect(generateProtocol(params())).toEqual(generateProtocol(params()));
  });

  it('splits phases correctly for 6/10/26-week breakthroughs and the open path', () => {
    expect(phasePlanFor(6, 'breakthrough')).toEqual([
      { phaseKey: 'gathering', firstWeek: 0, lastWeek: 0 },
      { phaseKey: 'tribulation', firstWeek: 1, lastWeek: 3 },
      { phaseKey: 'quieting', firstWeek: 4, lastWeek: 5 },
    ]);
    expect(phasePlanFor(10, 'breakthrough')).toEqual([
      { phaseKey: 'gathering', firstWeek: 0, lastWeek: 1 },
      { phaseKey: 'tribulation', firstWeek: 2, lastWeek: 7 },
      { phaseKey: 'quieting', firstWeek: 8, lastWeek: 9 },
    ]);
    const long = phasePlanFor(26, 'breakthrough');
    expect(long).toEqual([
      { phaseKey: 'gathering', firstWeek: 0, lastWeek: 5 },
      { phaseKey: 'tribulation', firstWeek: 6, lastWeek: 22 },
      { phaseKey: 'quieting', firstWeek: 23, lastWeek: 25 },
    ]);
    // Open Path: rolling maintenance — no taper.
    expect(phasePlanFor(4, 'open_path').some((s) => s.phaseKey === 'quieting')).toBe(false);
    expect(phaseForWeek(long, 6)!.phaseKey).toBe('tribulation');
  });

  it('places the pillar on the chosen pillar day, every week', () => {
    for (const pillarDay of [0, 3, 6]) {
      const drafts = generateProtocol(params({ pillarDay }));
      for (let w = 0; w < 10; w++) {
        const anchor = drafts.find((d) => d.weekIndex === w && d.dayOfWeek === pillarDay);
        expect(anchor, `week ${w} pillarDay ${pillarDay}`).toBeTruthy();
        expect(['pillar', 'gate']).toContain(anchor!.kind); // gates replace the pillar slot
      }
    }
  });

  it('schedules exactly sessionsPerWeek counted quests + one uncounted stillness, one per day', () => {
    const drafts = generateProtocol(params({ sessionsPerWeek: 4 }));
    for (let w = 0; w < 10; w++) {
      const week = drafts.filter((d) => d.weekIndex === w);
      const counted = week.filter((d) => d.kind !== 'stillness');
      const stillness = week.filter((d) => d.kind === 'stillness');
      expect(counted).toHaveLength(4);
      expect(stillness).toHaveLength(1);
      expect(new Set(week.map((d) => d.dayOfWeek)).size).toBe(week.length); // never two on a day
    }
  });

  it('stillness is recovery with targetReps 0 — it can never strike', () => {
    for (const d of generateProtocol(params()).filter((x) => x.kind === 'stillness')) {
      expect(d.targetReps).toBe(0);
      expect(d.modality).toBe('recovery');
    }
  });

  it('tapers Quieting volume to 40–60% of the Tribulation peak', () => {
    const drafts = generateProtocol(params({ totalWeeks: 26 }));
    const plan = phasePlanFor(26, 'breakthrough');
    const flowReps = (phase: 'tribulation' | 'quieting') =>
      drafts
        .filter((d) => d.kind === 'flow' && phaseForWeek(plan, d.weekIndex)!.phaseKey === phase)
        .map((d) => d.targetReps);
    const peak = Math.max(...flowReps('tribulation'));
    for (const reps of flowReps('quieting')) {
      expect(reps / peak).toBeGreaterThanOrEqual(0.35);
      expect(reps / peak).toBeLessThanOrEqual(0.65);
    }
  });

  it('ramps Tribulation week over week (outside deload weeks)', () => {
    const drafts = generateProtocol(params({ totalWeeks: 26 }));
    const flowAt = (w: number) => drafts.find((d) => d.weekIndex === w && d.kind === 'flow')!.targetReps;
    expect(flowAt(7)).toBeGreaterThan(flowAt(6)); // tribulation w0 → w1
    expect(flowAt(9)).toBeLessThan(flowAt(8)); // 4th tribulation week deloads
  });

  it('ends a breakthrough at the Breakthrough Gate; gates land on assessment weeks', () => {
    const drafts = generateProtocol(params());
    const final = drafts.filter((d) => d.weekIndex === 9 && d.kind === 'gate');
    expect(final).toHaveLength(1);
    expect(final[0]!.dayOfWeek).toBe(5); // the pillar slot
    expect(final[0]!.title).toBe(BREAKTHROUGH_GATE_TITLE);
    // last gathering week (week 1 of the 10-week split) carries a gate in the pillar slot
    expect(drafts.some((d) => d.weekIndex === 1 && d.kind === 'gate' && d.dayOfWeek === 5)).toBe(true);
    // open path never ends with a breakthrough gate
    const open = generateProtocol(params({ goalKind: 'open_path', totalWeeks: 4 }));
    expect(open.filter((d) => d.weekIndex === 3).every((d) => d.title !== BREAKTHROUGH_GATE_TITLE)).toBe(true);
  });

  it('volume and difficulty dials scale reps in the right direction', () => {
    const low = generateProtocol(params({ volumeDial: 1 }));
    const high = generateProtocol(params({ volumeDial: 5 }));
    const sum = (ds: typeof low) => ds.reduce((s, d) => s + d.targetReps, 0);
    expect(sum(high)).toBeGreaterThan(sum(low));
    const easy = generateProtocol(params({ difficultyDial: 1 }));
    const hard = generateProtocol(params({ difficultyDial: 5 }));
    const surgeSum = (ds: typeof low) => ds.filter((d) => d.kind === 'surge').reduce((s, d) => s + d.targetReps, 0);
    expect(surgeSum(hard)).toBeGreaterThan(surgeSum(easy));
    // difficulty never touches the easy/flow sessions
    const flowSum = (ds: typeof low) => ds.filter((d) => d.kind === 'flow').reduce((s, d) => s + d.targetReps, 0);
    expect(flowSum(hard)).toBe(flowSum(easy));
  });

  it('regenerateFrom emits only weeks ≥ fromWeekIndex and matches the full plan tail', () => {
    const p = params();
    const tail = regenerateFrom(p, 4);
    expect(tail.every((d) => d.weekIndex >= 4)).toBe(true);
    expect(tail).toEqual(generateProtocol(p).filter((d) => d.weekIndex >= 4));
  });

  it('maps dates ↔ week indexes on UTC Mondays', () => {
    const start = new Date(Date.UTC(2026, 0, 5)); // Monday
    expect(alignToMonday(new Date(Date.UTC(2026, 0, 8, 15, 30)))).toEqual(start); // Thursday → that Monday
    expect(alignToMonday(start)).toEqual(start);
    expect(weekIndexFor(start, new Date(Date.UTC(2026, 0, 11)))).toBe(0); // Sunday of week 0
    expect(weekIndexFor(start, new Date(Date.UTC(2026, 0, 12)))).toBe(1); // next Monday
    expect(scheduledDateFor(start, 1, 2)).toEqual(new Date(Date.UTC(2026, 0, 14)));
  });

  it('canMove allows same/adjacent week, never the past or before the trial', () => {
    const start = new Date(Date.UTC(2026, 0, 5));
    const today = new Date(Date.UTC(2026, 0, 13));
    const quest = scheduledDateFor(start, 1, 3); // Thu of week 1
    expect(canMove(quest, scheduledDateFor(start, 1, 5), start, today)).toBe(true); // same week
    expect(canMove(quest, scheduledDateFor(start, 2, 1), start, today)).toBe(true); // adjacent week
    expect(canMove(quest, scheduledDateFor(start, 3, 1), start, today)).toBe(false); // two weeks out
    expect(canMove(quest, new Date(Date.UTC(2026, 0, 12)), start, today)).toBe(false); // the past
    expect(canMove(scheduledDateFor(start, 0, 1), new Date(Date.UTC(2026, 0, 4)), start, today)).toBe(false); // before trial
  });
});

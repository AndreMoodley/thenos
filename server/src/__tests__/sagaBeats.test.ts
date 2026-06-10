import { describe, it, expect } from 'vitest';
import {
  BEAT_SKELETON,
  triggerMatches,
  chapterUnlockedBy,
  type SagaEvent,
  type ChapterStateLite,
} from '../lib/sagaBeats.js';

const EVENTS: SagaEvent[] = [
  { kind: 'forged' },
  { kind: 'trial_started', trialId: 't1' },
  { kind: 'planned_fulfilled', plannedSessionId: 'p1', planKind: 'flow', nthFulfilled: 1 },
  { kind: 'gate_fulfilled', plannedSessionId: 'p2', nthGate: 1 },
  { kind: 'phase_entered', phaseKey: 'tribulation' },
  { kind: 'phase_entered', phaseKey: 'quieting' },
  { kind: 'realm_crossed', realmIndex: 3 },
  { kind: 'streak_reached', days: 9 },
  { kind: 'vow_kept', vowId: 'v1' },
  { kind: 'corruption_cleansed' },
  { kind: 'trial_completed', trialId: 't1' },
  { kind: 'returned_after_gap', gapDays: 10 },
];

function freshChapters(): (ChapterStateLite & { beatKey: string })[] {
  return BEAT_SKELETON.map((b, i) => ({
    index: i + 1,
    beatKey: b.beatKey,
    optional: b.optional ?? false,
    unlockedAt: null,
    trigger: b.trigger,
  }));
}

describe('sagaBeats — authored structure, real-event triggers (invariant #13)', () => {
  it('has ten beats, in the canonical order, with regression the only optional one', () => {
    expect(BEAT_SKELETON.map((b) => b.beatKey)).toEqual([
      'awakening',
      'system_window',
      'first_gate',
      'tower_floor',
      'hidden_master',
      'tribulation_gate',
      'regression',
      'final_ascent',
      'breakthrough',
      'next_path',
    ]);
    expect(BEAT_SKELETON.filter((b) => b.optional).map((b) => b.beatKey)).toEqual(['regression']);
  });

  it('every trigger matches its own event and rejects all others', () => {
    for (const beat of BEAT_SKELETON) {
      const matching = EVENTS.filter((ev) => triggerMatches(beat.trigger, ev));
      expect(matching.length, beat.beatKey).toBeGreaterThan(0);
      // breakthrough is the only multi-trigger beat (trial kept OR realm crossed)
      if (beat.beatKey === 'breakthrough') {
        expect(matching.map((e) => e.kind).sort()).toEqual(['realm_crossed', 'trial_completed']);
      } else {
        expect(matching, beat.beatKey).toHaveLength(1);
      }
    }
  });

  it('respects thresholds: a 6-day streak and a 3-day pause move nothing', () => {
    const hidden = BEAT_SKELETON.find((b) => b.beatKey === 'hidden_master')!;
    expect(triggerMatches(hidden.trigger, { kind: 'streak_reached', days: 6 })).toBe(false);
    expect(triggerMatches(hidden.trigger, { kind: 'streak_reached', days: 7 })).toBe(true);
    const regression = BEAT_SKELETON.find((b) => b.beatKey === 'regression')!;
    expect(triggerMatches(regression.trigger, { kind: 'returned_after_gap', gapDays: 3 })).toBe(false);
  });

  it('unlocks strictly in order — a matching chapter waits for its non-optional predecessors', () => {
    const chapters = freshChapters();
    // The trial completes out of nowhere: breakthrough matches, but chapter 1 is still locked.
    expect(chapterUnlockedBy(chapters, { kind: 'trial_completed', trialId: 't' })).toBeNull();
    // Open the door in order.
    const first = chapterUnlockedBy(chapters, { kind: 'forged' });
    expect(first?.beatKey).toBe('awakening');
    first!.unlockedAt = new Date();
    expect(chapterUnlockedBy(chapters, { kind: 'forged' })).toBeNull(); // no double unlock
    const second = chapterUnlockedBy(chapters, { kind: 'trial_started', trialId: 't' });
    expect(second?.beatKey).toBe('system_window');
  });

  it('optional beats never block the story behind them', () => {
    const chapters = freshChapters();
    // Unlock everything before regression (indexes 1..6).
    for (const ch of chapters) if (ch.index <= 6) ch.unlockedAt = new Date();
    // regression (7) stays locked; final_ascent (8) opens right past it.
    const next = chapterUnlockedBy(chapters, { kind: 'phase_entered', phaseKey: 'quieting' });
    expect(next?.beatKey).toBe('final_ascent');
    // …and regression can still fire later if the return actually happens.
    const back = chapterUnlockedBy(chapters, { kind: 'returned_after_gap', gapDays: 12 });
    expect(back?.beatKey).toBe('regression');
  });

  it('unlocks at most one chapter per event', () => {
    const chapters = freshChapters();
    for (const ch of chapters) if (ch.index <= 2) ch.unlockedAt = new Date();
    // planned_fulfilled matches first_gate only — never first_gate AND something else.
    const hit = chapterUnlockedBy(chapters, { kind: 'planned_fulfilled', plannedSessionId: 'p', planKind: 'gate', nthFulfilled: 1 });
    expect(hit?.beatKey).toBe('first_gate');
  });
});

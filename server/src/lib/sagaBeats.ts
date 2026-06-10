// The Saga's spine — authored beat skeletons and the trigger matcher. PURE.
// Structure is deterministic and human-authored; the AI may only flavor it (invariant #13).
// Every beat fires from a REAL logged event — there is no timer, no fiction-driven unlock.
//
// Beat vocabulary is the manhwa/isekai canon mapped onto real training:
//   awakening (rebirth) · system_window (the quest log opens) · first_gate (first quest done)
//   tower_floor (entering the Tribulation) · hidden_master (streak 7) · tribulation_gate
//   (first Gate cleared) · regression (a return after silence — optional) · final_ascent
//   (entering the Quieting) · breakthrough (the trial kept / a realm crossed) · next_path.

import type { PlannedKindT, PhaseKey } from './protocol.js';

export type SagaEvent =
  | { kind: 'forged' }
  | { kind: 'trial_started'; trialId: string }
  | { kind: 'planned_fulfilled'; plannedSessionId: string; planKind: PlannedKindT; nthFulfilled: number }
  | { kind: 'gate_fulfilled'; plannedSessionId: string; nthGate: number }
  | { kind: 'phase_entered'; phaseKey: PhaseKey }
  | { kind: 'realm_crossed'; realmIndex: number }
  | { kind: 'streak_reached'; days: number }
  | { kind: 'vow_kept'; vowId: string }
  | { kind: 'corruption_cleansed' }
  | { kind: 'trial_completed'; trialId: string }
  | { kind: 'returned_after_gap'; gapDays: number };

export interface TriggerLeaf {
  kind: SagaEvent['kind'];
  phaseKey?: PhaseKey; // for phase_entered
  days?: number; // min days (streak_reached / returned_after_gap)
  realmIndex?: number; // min realm (realm_crossed)
}

export type TriggerSpec = TriggerLeaf | { anyOf: TriggerLeaf[] };

export interface BeatSkeleton {
  beatKey: string;
  optional?: boolean; // an optional beat may never fire; it never blocks its successors
  trigger: TriggerSpec;
}

/** The shared ten-beat arc. All styles wear this skeleton; only the flavor differs. */
export const BEAT_SKELETON: readonly BeatSkeleton[] = [
  { beatKey: 'awakening', trigger: { kind: 'forged' } },
  { beatKey: 'system_window', trigger: { kind: 'trial_started' } },
  { beatKey: 'first_gate', trigger: { kind: 'planned_fulfilled' } },
  { beatKey: 'tower_floor', trigger: { kind: 'phase_entered', phaseKey: 'tribulation' } },
  { beatKey: 'hidden_master', trigger: { kind: 'streak_reached', days: 7 } },
  { beatKey: 'tribulation_gate', trigger: { kind: 'gate_fulfilled' } },
  { beatKey: 'regression', optional: true, trigger: { kind: 'returned_after_gap', days: 7 } },
  { beatKey: 'final_ascent', trigger: { kind: 'phase_entered', phaseKey: 'quieting' } },
  { beatKey: 'breakthrough', trigger: { anyOf: [{ kind: 'trial_completed' }, { kind: 'realm_crossed' }] } },
  { beatKey: 'next_path', trigger: { kind: 'vow_kept' } },
] as const;

function leafMatches(t: TriggerLeaf, ev: SagaEvent): boolean {
  if (t.kind !== ev.kind) return false;
  switch (ev.kind) {
    case 'phase_entered':
      return !t.phaseKey || ev.phaseKey === t.phaseKey;
    case 'streak_reached':
      return ev.days >= (t.days ?? 1);
    case 'returned_after_gap':
      return ev.gapDays >= (t.days ?? 7);
    case 'realm_crossed':
      return ev.realmIndex >= (t.realmIndex ?? 1);
    default:
      return true;
  }
}

export function triggerMatches(trigger: TriggerSpec, ev: SagaEvent): boolean {
  if ('anyOf' in trigger) return trigger.anyOf.some((t) => leafMatches(t, ev));
  return leafMatches(trigger, ev);
}

export interface ChapterStateLite {
  index: number;
  optional: boolean;
  unlockedAt: Date | null;
  trigger: TriggerSpec;
}

/**
 * Which locked chapter (if any) does this event unlock? Chapters open in order: a chapter is
 * eligible only when every non-optional predecessor is already open. Optional beats never
 * block the ones behind them. At most one chapter opens per event — the story keeps its pace.
 */
export function chapterUnlockedBy<T extends ChapterStateLite>(chapters: T[], ev: SagaEvent): T | null {
  const sorted = [...chapters].sort((a, b) => a.index - b.index);
  for (const ch of sorted) {
    if (ch.unlockedAt) continue;
    // Even a matching chapter waits for its non-optional predecessors.
    const blocked = sorted.some((prev) => prev.index < ch.index && !prev.optional && !prev.unlockedAt);
    if (blocked) continue;
    if (triggerMatches(ch.trigger, ev)) return ch;
  }
  return null;
}

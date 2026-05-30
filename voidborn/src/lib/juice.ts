// The juice layer — one call fires the haptic + audio cue for a meaningful action. Pair with a
// snappy spring at the call site (springs live in constants/theme). Feel is a requirement (#9).
import { haptic, type HapticKind } from './haptics';
import { playCue, type CueKey } from './audio';

export type JuiceAction =
  | 'tap'
  | 'navigate'
  | 'equip'
  | 'recolor'
  | 'seal'
  | 'log'
  | 'anchor'
  | 'vowComplete'
  | 'ascension'
  | 'rebirth'
  | 'summon';

const MAP: Record<JuiceAction, { haptic: HapticKind; cue: CueKey }> = {
  tap: { haptic: 'light', cue: 'tap' },
  navigate: { haptic: 'light', cue: 'swipe' },
  equip: { haptic: 'light', cue: 'equip' },
  recolor: { haptic: 'selection', cue: 'equip' },
  seal: { haptic: 'medium', cue: 'seal' },
  log: { haptic: 'medium', cue: 'strike' },
  anchor: { haptic: 'medium', cue: 'seal' },
  vowComplete: { haptic: 'success', cue: 'vow' },
  ascension: { haptic: 'heavy', cue: 'ascension' },
  rebirth: { haptic: 'heavy', cue: 'rebirth' },
  summon: { haptic: 'success', cue: 'summon' },
};

/** Fire the feedback for an action. Safe to call anywhere; never throws. */
export function fire(action: JuiceAction): void {
  const m = MAP[action];
  haptic(m.haptic);
  playCue(m.cue);
}

export { springs, TRANSITION_MS } from '../constants/theme';

// Saga display vocabulary. The style catalog mirrors the server's SAGA_STYLES (the server is
// authoritative — /saga/styles ships the live list; these are the offline-render fallbacks).

import type { SagaStyle } from '../api/types';

export const SAGA_STYLE_FALLBACK: SagaStyle[] = [
  { styleKey: 'murim', name: 'Murim Cultivation', descriptor: 'Sects, meridians, heart-demons. You temper a mortal shell toward the Dao.' },
  { styleKey: 'isekai', name: 'Isekai Rebirth', descriptor: 'Another world, a system window, daily quests. Your old life was the prologue.' },
  { styleKey: 'tower', name: 'The Tower', descriptor: 'Each floor has its own rules. The only way out is up.' },
  { styleKey: 'regression', name: 'The Returnee', descriptor: 'You remember how this ends. This time, you train.' },
];

export const BEAT_LABELS: Record<string, string> = {
  awakening: 'Awakening',
  system_window: 'The System Window',
  first_gate: 'First Gate',
  tower_floor: 'The Floors of Trial',
  hidden_master: 'The Hidden Master',
  tribulation_gate: 'Tribulation Gate',
  regression: 'Regression',
  final_ascent: 'Final Ascent',
  breakthrough: 'Breakthrough',
  next_path: 'The Next Path',
};

/** The Inner Demon's nature is the practitioner's own leak taxonomy — WOOP's obstacle step. */
export const DEMON_NATURES = [
  { category: 'social', label: 'Social pull', hint: 'plans, people-pleasing, the fear of missing the room' },
  { category: 'food', label: 'Food', hint: 'the late plate, the easy sugar, eating the feeling' },
  { category: 'media', label: 'Media', hint: 'the feed, the queue, one more episode' },
  { category: 'argument', label: 'Argument', hint: 'the fight you replay, the reply you redraft' },
  { category: 'validation', label: 'Validation', hint: 'training for the mirror of others' },
  { category: 'doubt', label: 'Doubt', hint: 'the whisper of not-yet, not-you, not-today' },
] as const;

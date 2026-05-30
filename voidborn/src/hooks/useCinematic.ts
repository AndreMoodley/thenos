// The anticipation set-pieces (Rebirth, Ascension, Summon) — the CR "chest" beats. A global overlay
// store any screen can trigger; the hub shell renders the overlay. Respects reduce-motion (#7).
import { create } from 'zustand';
import { reduceMotionEnabled, cinematicDuration } from '../lib/reduceMotion';

export type CinematicKind = 'rebirth' | 'ascension' | 'summon' | 'vow_flourish';

export interface ActiveCinematic {
  key: string; // e.g. 'rebirth' | 'ascension_transcendence' | 'summon'
  kind: CinematicKind;
  durationMs: number;
  reduced: boolean;
}

interface CinematicState {
  active: ActiveCinematic | null;
  play: (key: string, opts: { kind: CinematicKind; full?: number; calm?: number }) => void;
  skip: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useCinematic = create<CinematicState>((set) => ({
  active: null,
  play: (key, { kind, full = 4200, calm = 900 }) => {
    const reduced = reduceMotionEnabled();
    const durationMs = cinematicDuration(full, calm, reduced);
    if (timer) clearTimeout(timer);
    set({ active: { key, kind, durationMs, reduced } });
    timer = setTimeout(() => set({ active: null }), durationMs);
  },
  skip: () => {
    if (timer) clearTimeout(timer);
    set({ active: null });
  },
}));

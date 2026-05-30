import { create } from 'zustand';
import { api } from '../api/endpoints';

// The Bond — a lightweight affinity that deepens with presence and unlocks entity moods, never
// power. Decays slowly, never punishing (Tamagotchi attachment).
interface BondState {
  value: number;
  lastPresenceDate: string | null;
  hydrate: () => Promise<void>;
}

export const useBond = create<BondState>((set) => ({
  value: 0,
  lastPresenceDate: null,
  hydrate: async () => {
    try {
      const state = await api.sync.state();
      if (state.bond) set({ value: state.bond.value, lastPresenceDate: state.bond.lastPresenceDate });
    } catch {
      /* offline */
    }
  },
}));

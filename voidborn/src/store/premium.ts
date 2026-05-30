import { create } from 'zustand';
import { api } from '../api/endpoints';
import { useMetrics } from './metrics';

// Currency (crystals) is server-authoritative. Entitlements are non-consumable (restorable):
// "Restore Purchases" simply re-runs reconcile with the store's current entitlements.
interface PremiumState {
  crystals: number;
  restoring: boolean;
  setCrystals: (n: number) => void;
  /** Called after a verified RevenueCat purchase (or restore) to grant entitlements server-side. */
  reconcile: (entitlements: { kind: string; productKey: string }[], consumables?: { productKey: string; crystals: number }[]) => Promise<void>;
  restore: (ownedEntitlements: { kind: string; productKey: string }[]) => Promise<void>;
}

export const usePremium = create<PremiumState>((set) => ({
  crystals: 0,
  restoring: false,
  setCrystals: (n) => set({ crystals: n }),

  reconcile: async (entitlements, consumables) => {
    const { practitioner } = await api.premium.reconcile(entitlements, consumables);
    set({ crystals: practitioner.crystals });
    useMetrics.getState().reconcile(practitioner);
  },

  restore: async (ownedEntitlements) => {
    set({ restoring: true });
    try {
      const { practitioner } = await api.premium.reconcile(ownedEntitlements, []);
      set({ crystals: practitioner.crystals });
      useMetrics.getState().reconcile(practitioner);
    } finally {
      set({ restoring: false });
    }
  },
}));

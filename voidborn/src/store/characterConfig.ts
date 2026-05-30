import { create } from 'zustand';
import { api } from '../api/endpoints';
import type { AvatarConfig, CosmeticCategory } from '../constants/cosmetics';
import type { EntityEnvelope } from '../api/types';
import type { FormKey } from '../constants/forms';

// Only avatarConfig + activeFormKey persist — appearance is always rebuilt by resolveManifestation().
interface CharacterConfigState {
  avatarConfig: AvatarConfig;
  activeFormKey: FormKey;
  ownedForms: string[];
  presets: { id: string; name: string; isActive: boolean }[];

  loadFromEnvelope: (env: EntityEnvelope) => void;
  setOwnedForms: (forms: string[]) => void;
  equip: (item: { itemKey: string; category: CosmeticCategory; defaultTint?: string }, tint?: string) => Promise<void>;
  unequip: (category: CosmeticCategory) => Promise<void>;
  setForm: (formKey: FormKey) => Promise<void>;
  loadPresets: () => Promise<void>;
  savePreset: (name: string) => Promise<void>;
  activatePreset: (id: string) => Promise<void>;
}

export const useCharacterConfig = create<CharacterConfigState>((set, get) => ({
  avatarConfig: { layers: {}, demeanor: 'neutral' },
  activeFormKey: 'void',
  ownedForms: [],
  presets: [],

  loadFromEnvelope: (env) => set({ avatarConfig: env.avatarConfig ?? { layers: {} }, activeFormKey: (env.activeFormKey as FormKey) ?? 'void' }),

  setOwnedForms: (forms) => set({ ownedForms: forms }),

  equip: async (item, tint) => {
    const prev = get().avatarConfig;
    // Optimistic — tint applied on equip (never per-frame).
    const next: AvatarConfig = { ...prev, layers: { ...prev.layers, [item.category]: { itemKey: item.itemKey, tint: tint ?? item.defaultTint } } };
    set({ avatarConfig: next });
    try {
      const { avatarConfig } = await api.cosmetics.equip(item.itemKey, tint);
      set({ avatarConfig });
    } catch {
      set({ avatarConfig: prev }); // rollback on failure (server-authoritative ownership)
      throw new Error('Could not equip — is the item Unsealed?');
    }
  },

  unequip: async (category) => {
    const prev = get().avatarConfig;
    const layers = { ...prev.layers };
    delete layers[category];
    set({ avatarConfig: { ...prev, layers } });
    try {
      const { avatarConfig } = await api.cosmetics.unequip(category);
      set({ avatarConfig });
    } catch {
      set({ avatarConfig: prev });
    }
  },

  setForm: async (formKey) => {
    const prev = get().activeFormKey;
    set({ activeFormKey: formKey });
    try {
      await api.entity.setForm(formKey);
    } catch {
      set({ activeFormKey: prev });
      throw new Error('This form is not yet manifested');
    }
  },

  loadPresets: async () => {
    try {
      const { presets } = await api.presets.list();
      set({ presets: presets.map((p: any) => ({ id: p.id, name: p.name, isActive: p.isActive })) });
    } catch {
      /* offline */
    }
  },

  savePreset: async (name) => {
    await api.presets.create(name, get().avatarConfig);
    await get().loadPresets();
  },

  activatePreset: async (id) => {
    await api.presets.activate(id);
    await get().loadPresets();
  },
}));

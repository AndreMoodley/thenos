// The saga + soul profile (the Chronicle's data). Persisted for offline reading; the profile
// queues as an absolute-set mutation. FORGING is server-authoritative and online-only (like
// gacha) — when offline it defers and auto-fires on reconnect. Chapters unlock server-side
// from real events; this store only mirrors and celebrates them.
import { create } from 'zustand';
import { api } from '../api/endpoints';
import { enqueue, flush, newClientId } from '../api/queue';
import type { Saga, SagaChapter, SagaState as SagaPayload, SagaStyle, SoulProfile, UnlockedChapter } from '../api/types';
import { SAGA_STYLE_FALLBACK } from '../constants/saga';
import { loadJSON, saveJSON } from '../lib/persist';

const KEY = 'voidborn.saga.v1';

interface SagaStore {
  profile: SoulProfile | null;
  saga: Saga | null;
  chapters: SagaChapter[];
  nextTease: { index: number; title: string; tease: string } | null;
  styles: SagaStyle[];
  /** Set when a real event opens a chapter — consumed by useChapterWatcher. */
  lastChapterUnlock: UnlockedChapter | null;
  /** A forge requested while offline; auto-fires on reconnect. */
  pendingForgeStyle: string | null;

  loadPersisted: () => Promise<void>;
  hydrateFromState: (payload: (SagaPayload & { profile?: SoulProfile | null }) | null) => void;
  refresh: () => Promise<void>;

  saveProfile: (profile: SoulProfile) => Promise<void>;
  forge: (styleKey?: string, regenerate?: boolean) => Promise<{ deferred: boolean }>;
  retryPendingForge: () => Promise<void>;

  noteUnlocked: (chapters: UnlockedChapter[]) => void;
  clearChapterUnlock: () => void;
}

function persist(get: () => SagaStore) {
  const { profile, saga, chapters, nextTease, pendingForgeStyle } = get();
  void saveJSON(KEY, { profile, saga, chapters, nextTease, pendingForgeStyle });
}

export const useSaga = create<SagaStore>((set, get) => ({
  profile: null,
  saga: null,
  chapters: [],
  nextTease: null,
  styles: SAGA_STYLE_FALLBACK,
  lastChapterUnlock: null,
  pendingForgeStyle: null,

  loadPersisted: async () => {
    const cached = await loadJSON<Partial<SagaStore>>(KEY);
    if (cached && !get().saga) {
      set({
        profile: cached.profile ?? null,
        saga: cached.saga ?? null,
        chapters: cached.chapters ?? [],
        nextTease: cached.nextTease ?? null,
        pendingForgeStyle: cached.pendingForgeStyle ?? null,
      });
    }
  },

  hydrateFromState: (payload) => {
    if (!payload) return;
    set({
      saga: payload.saga ?? null,
      chapters: payload.chapters ?? [],
      nextTease: payload.nextTease ?? null,
      ...(payload.profile !== undefined ? { profile: payload.profile } : {}),
    });
    persist(get);
  },

  refresh: async () => {
    try {
      const state = await api.saga.state();
      set({ styles: state.styles?.length ? state.styles : SAGA_STYLE_FALLBACK });
      get().hydrateFromState(state);
    } catch {
      /* offline — the persisted chronicle stands */
    }
  },

  saveProfile: async (profile) => {
    set({ profile });
    persist(get);
    await enqueue({ kind: 'soul_profile', clientId: newClientId(), ...profile, styleKey: profile.styleKey ?? undefined });
    await flush().catch(() => {});
  },

  forge: async (styleKey, regenerate = false) => {
    try {
      const res = await api.saga.forge(styleKey, regenerate);
      set({ pendingForgeStyle: null });
      get().hydrateFromState(res);
      return { deferred: false };
    } catch (e: any) {
      if (e?.code === 'OFFLINE' || e?.status === 0) {
        // The Forge needs the server — remember the wish and fire it on reconnect.
        set({ pendingForgeStyle: styleKey ?? get().profile?.styleKey ?? 'murim' });
        persist(get);
        return { deferred: true };
      }
      throw e;
    }
  },

  retryPendingForge: async () => {
    const style = get().pendingForgeStyle;
    if (!style) return;
    await get()
      .forge(style)
      .catch(() => {});
  },

  noteUnlocked: (unlocked) => {
    if (unlocked.length === 0) return;
    const now = new Date().toISOString();
    const ids = new Set(unlocked.map((u) => u.id));
    set({
      chapters: get().chapters.map((c) => (ids.has(c.id) && !c.unlockedAt ? { ...c, unlockedAt: now } : c)),
      lastChapterUnlock: unlocked[unlocked.length - 1]!,
    });
    persist(get);
  },

  clearChapterUnlock: () => set({ lastChapterUnlock: null }),
}));

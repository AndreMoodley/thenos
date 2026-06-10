import { create } from 'zustand';
import { api } from '../api/endpoints';
import { enqueue, flush, newClientId, queueLength } from '../api/queue';
import type { EntityEnvelope, PractitionerPublic, Vow, VoidSession } from '../api/types';
import { realmsCrossed, realmForHammerCount, type Realm } from '../constants/realms';
import { useAuth } from './auth';
import { useTrial } from './trial';
import { useSaga } from './saga';

const DAY_MS = 86_400_000;
const dayDiff = (a: Date, b: Date) =>
  Math.round(
    (Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) -
      Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())) /
      DAY_MS,
  );
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface MetricsState {
  practitioner: PractitionerPublic | null;
  entity: EntityEnvelope | null;
  sessions: VoidSession[];
  vows: Vow[];
  pendingCount: number;
  /** Set when an optimistic strike crosses a realm — consumed by useAscensionWatcher. */
  lastAscension: Realm | null;

  hydrate: () => Promise<void>;
  refreshEntity: () => Promise<void>;
  logStrike: (input: {
    modality: string;
    reps: number;
    rating?: number;
    note?: string;
    plannedSessionId?: string;
  }) => Promise<{ crossed: Realm[] }>;
  seal: (amount?: number) => Promise<void>;
  addLeak: (input: { category: string; label: string; cost: number }) => Promise<void>;
  anchor: () => Promise<void>;
  syncNow: () => Promise<void>;
  reconcile: (p: PractitionerPublic) => void;
  clearAscension: () => void;
}

function setPractitioner(set: (partial: Partial<MetricsState>) => void, p: PractitionerPublic) {
  set({ practitioner: p });
  useAuth.getState().setPractitioner(p);
}

// Recompute the derived realm fields on an optimistic practitioner snapshot.
function withRealm(p: PractitionerPublic, hammerCount: number): PractitionerPublic {
  const r = realmForHammerCount(hammerCount);
  return {
    ...p,
    hammerCount,
    realm: { index: r.realm.index, key: r.realm.key, name: r.realm.name, sigil: r.realm.sigil, stageLabel: r.realm.stageLabel },
    stage: r.stage,
    originArtMastery: r.originArtMastery,
    nextThreshold: r.nextThreshold,
    hammerToNext: r.hammerToNext,
    progressToNext: r.progressToNext,
  };
}

export const useMetrics = create<MetricsState>((set, get) => ({
  practitioner: useAuth.getState().practitioner,
  entity: null,
  sessions: [],
  vows: [],
  pendingCount: 0,
  lastAscension: null,

  hydrate: async () => {
    // The persisted Quest Log / Chronicle render first; the server overwrites when reachable.
    await Promise.all([useTrial.getState().loadPersisted(), useSaga.getState().loadPersisted()]);
    try {
      const state = await api.sync.state();
      setPractitioner(set, state.practitioner);
      set({ sessions: state.sessions ?? [], vows: state.vows ?? [] });
      useTrial.getState().hydrateFromState(state.trial ?? null);
      if (state.saga) useSaga.getState().hydrateFromState({ ...state.saga, profile: state.soulProfile ?? null });
      else useSaga.getState().hydrateFromState({ saga: null, chapters: [], nextTease: null, profile: state.soulProfile ?? null });
      await get().refreshEntity();
    } catch {
      // offline — keep whatever auth seeded; the queue reconciles on reconnect
    }
    set({ pendingCount: await queueLength() });
  },

  refreshEntity: async () => {
    try {
      set({ entity: await api.entity.me() });
    } catch {
      /* offline */
    }
  },

  logStrike: async ({ modality, reps, rating, note, plannedSessionId }) => {
    const p = get().practitioner;
    let crossed: Realm[] = [];
    // Optimistic quest fulfillment — a LINK only; the strike math below is unchanged (#12).
    if (plannedSessionId) useTrial.getState().noteFulfilled(plannedSessionId);
    if (p) {
      const struck = reps > 0;
      const before = p.hammerCount;
      const after = struck ? before + reps : before;
      crossed = struck ? realmsCrossed(before, after) : [];
      const now = new Date();
      const last = p.lastLogDate ? new Date(p.lastLogDate) : null;
      let streak = p.streak;
      if (struck) {
        if (!last) streak = 1;
        else {
          const d = dayDiff(now, last);
          if (d === 1) streak = p.streak + 1;
          else if (d > 1) streak = 1;
        }
      }
      const optimistic = withRealm(
        { ...p, streak, lastLogDate: struck ? now.toISOString() : p.lastLogDate },
        after,
      );
      setPractitioner(set, optimistic);
      if (crossed[0]) set({ lastAscension: crossed[0] });
    }
    await enqueue({ kind: 'session', clientId: newClientId(), modality, reps, rating, note, plannedSessionId });
    await get().syncNow();
    return { crossed };
  },

  seal: async (amount = 5) => {
    const p = get().practitioner;
    if (p) setPractitioner(set, { ...p, ki: clamp(p.ki + amount, 0, 100) });
    await enqueue({ kind: 'seal', clientId: newClientId(), amount });
    await get().syncNow();
  },

  addLeak: async ({ category, label, cost }) => {
    const p = get().practitioner;
    if (p) setPractitioner(set, { ...p, ki: clamp(p.ki - cost, 0, 100) });
    await enqueue({ kind: 'leak', clientId: newClientId(), category, label, cost });
    await get().syncNow();
  },

  anchor: async () => {
    const p = get().practitioner;
    if (p) setPractitioner(set, { ...p, anchorCompletedAt: new Date().toISOString() });
    await enqueue({ kind: 'anchor', clientId: newClientId() });
    await get().syncNow();
  },

  // Best-effort flush + authoritative reconcile. Called after each mutation and on reconnect.
  syncNow: async () => {
    const res = await flush();
    if (res.practitioner) get().reconcile(res.practitioner);
    // Server-confirmed quest links + chapter unlocks ride the flush results.
    for (const r of res.results) {
      if (!r.ok) continue;
      if (r.fulfilledPlanned) useTrial.getState().noteFulfilled(r.fulfilledPlanned.id);
      if (r.unlockedChapters?.length) useSaga.getState().noteUnlocked(r.unlockedChapters);
    }
    if (res.flushed > 0) void useSaga.getState().retryPendingForge();
    set({ pendingCount: await queueLength() });
  },

  // Server-authoritative reconcile: last-write-wins by updatedAt.
  reconcile: (incoming) => {
    const cur = get().practitioner;
    if (!cur || new Date(incoming.updatedAt) >= new Date(cur.updatedAt)) {
      setPractitioner(set, incoming);
    }
  },

  clearAscension: () => set({ lastAscension: null }),
}));

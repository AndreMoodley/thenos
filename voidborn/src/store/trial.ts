// The active trial + its quests (the System Window's data). Persisted so the Quest Log
// renders fully offline (invariant #6); completing/moving quests queues idempotently.
// Plan GENERATION (create/regenerate/accept) is server-authoritative and online-only.
import { create } from 'zustand';
import { api } from '../api/endpoints';
import { enqueue, flush, newClientId } from '../api/queue';
import type { PlannedSession, Realignment, Trial, TrialState as TrialPayload } from '../api/types';
import { isSameUTCDay, utcMidnight } from '../constants/trials';
import { loadJSON, saveJSON } from '../lib/persist';

const KEY = 'voidborn.trial.v1';

const KIND_PRIORITY: Record<string, number> = { gate: 0, pillar: 1, surge: 2, flow: 3, stillness: 4 };

interface TrialStore {
  trial: Trial | null;
  plannedSessions: PlannedSession[];
  realignments: Realignment[];

  loadPersisted: () => Promise<void>;
  hydrateFromState: (payload: TrialPayload | null) => void;
  refresh: () => Promise<void>;

  /** Today's most important unfulfilled quest (gate > pillar > surge > flow > stillness). */
  todayQuest: () => PlannedSession | null;
  questsForDay: (day: Date) => PlannedSession[];

  /** Optimistic local link when a real session fulfills a quest (server confirms via flush). */
  noteFulfilled: (plannedSessionId: string, sessionId?: string) => void;

  moveSession: (plannedSessionId: string, scheduledOn: Date) => Promise<void>;
  createTrial: (input: Parameters<typeof api.trials.create>[0]) => Promise<void>;
  regenerate: (prefs: { sessionsPerWeek?: number; pillarDay?: number; volumeDial?: number; difficultyDial?: number }) => Promise<void>;
  completeTrial: () => Promise<{ flourish: boolean }>;
  acceptRealignment: (rid: string) => Promise<void>;
  dismissRealignment: (rid: string) => Promise<void>;
}

function persist(get: () => TrialStore) {
  const { trial, plannedSessions, realignments } = get();
  void saveJSON(KEY, { trial, plannedSessions, realignments });
}

export const useTrial = create<TrialStore>((set, get) => ({
  trial: null,
  plannedSessions: [],
  realignments: [],

  loadPersisted: async () => {
    const cached = await loadJSON<TrialPayload>(KEY);
    if (cached && !get().trial) {
      set({ trial: cached.trial, plannedSessions: cached.plannedSessions ?? [], realignments: cached.realignments ?? [] });
    }
  },

  hydrateFromState: (payload) => {
    set({
      trial: payload?.trial ?? null,
      plannedSessions: payload?.plannedSessions ?? [],
      realignments: payload?.realignments ?? [],
    });
    persist(get);
  },

  refresh: async () => {
    try {
      get().hydrateFromState(await api.trials.active());
    } catch {
      /* offline — the persisted snapshot stands */
    }
  },

  todayQuest: () => {
    const now = new Date();
    const open = get()
      .plannedSessions.filter((q) => !q.fulfilledBySessionId && isSameUTCDay(new Date(q.scheduledOn), now))
      .sort((a, b) => (KIND_PRIORITY[a.kind] ?? 9) - (KIND_PRIORITY[b.kind] ?? 9));
    return open[0] ?? null;
  },

  questsForDay: (day) =>
    get()
      .plannedSessions.filter((q) => isSameUTCDay(new Date(q.scheduledOn), day))
      .sort((a, b) => (KIND_PRIORITY[a.kind] ?? 9) - (KIND_PRIORITY[b.kind] ?? 9)),

  noteFulfilled: (plannedSessionId, sessionId) => {
    set({
      plannedSessions: get().plannedSessions.map((q) =>
        q.id === plannedSessionId && !q.fulfilledBySessionId
          ? { ...q, fulfilledBySessionId: sessionId ?? 'pending-sync', fulfilledAt: new Date().toISOString() }
          : q,
      ),
    });
    persist(get);
  },

  moveSession: async (plannedSessionId, scheduledOn) => {
    const day = utcMidnight(scheduledOn).toISOString();
    set({
      plannedSessions: get().plannedSessions.map((q) => (q.id === plannedSessionId ? { ...q, scheduledOn: day } : q)),
    });
    persist(get);
    await enqueue({ kind: 'plan_move', clientId: newClientId(), plannedSessionId, scheduledOn: day });
    await flush().catch(() => {});
  },

  createTrial: async (input) => {
    const res = await api.trials.create(input);
    get().hydrateFromState(res);
  },

  regenerate: async (prefs) => {
    const t = get().trial;
    if (!t) return;
    get().hydrateFromState(await api.trials.regenerate(t.id, prefs));
  },

  completeTrial: async () => {
    const t = get().trial;
    if (!t) return { flourish: false };
    const res = await api.trials.complete(t.id, true);
    await get().refresh(); // the chained Open Path becomes the active trial
    return { flourish: res.flourish };
  },

  acceptRealignment: async (rid) => {
    const t = get().trial;
    if (!t) return;
    get().hydrateFromState(await api.trials.acceptRealignment(t.id, rid));
  },

  dismissRealignment: async (rid) => {
    const t = get().trial;
    if (!t) return;
    await api.trials.dismissRealignment(t.id, rid);
    set({ realignments: get().realignments.filter((r) => r.id !== rid) });
    persist(get);
  },
}));

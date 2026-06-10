// Offline-first mutation queue (invariant #6). Every effort-mutation is written locally and the
// entity updates optimistically; this queue flushes to /sync/flush on reconnect. The server is
// authoritative — currency/ownership/gacha are NEVER queued here.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request, type ApiError } from './client';
import type { PractitionerPublic } from './types';

const KEY = 'voidborn.syncQueue.v1';

export type QueuedMutation =
  | { kind: 'session'; clientId: string; modality: string; reps: number; rating?: number; note?: string; occurredOn?: string; plannedSessionId?: string }
  | { kind: 'leak'; clientId: string; category: string; label: string; cost: number }
  | { kind: 'anchor'; clientId: string; occurredOn?: string }
  | { kind: 'seal'; clientId: string; amount: number }
  // absolute-set mutations — naturally idempotent on replay
  | { kind: 'plan_move'; clientId: string; plannedSessionId: string; scheduledOn: string }
  | {
      kind: 'soul_profile';
      clientId: string;
      currentSelf: string;
      higherSelf: string;
      outcome: string;
      obstacleCategory: string;
      obstacleName: string;
      obstacleDetail: string;
      wardPlan: string;
      styleKey?: string;
    };

export const newClientId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

let memo: QueuedMutation[] | null = null;

async function load(): Promise<QueuedMutation[]> {
  if (memo) return memo;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    memo = raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    memo = [];
  }
  return memo;
}

async function save(q: QueuedMutation[]): Promise<void> {
  memo = q;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* storage full / unavailable — keep in-memory copy */
  }
}

export async function enqueue(m: QueuedMutation): Promise<void> {
  const q = await load();
  await save([...q, m]);
}

export async function pending(): Promise<QueuedMutation[]> {
  return [...(await load())];
}

export async function queueLength(): Promise<number> {
  return (await load()).length;
}

export interface FlushResult {
  flushed: number;
  practitioner?: PractitionerPublic;
  results: {
    clientId: string;
    ok: boolean;
    struck?: boolean;
    error?: string;
    fulfilledPlanned?: { id: string; kind: string; title: string; trialId: string } | null;
    unlockedChapters?: { id: string; index: number; beatKey: string; title: string }[];
  }[];
}

/** Flush the queue. Idempotent by clientId server-side, so retries can never double-count. */
export async function flush(): Promise<FlushResult> {
  const q = await load();
  if (q.length === 0) return { flushed: 0, results: [] };
  try {
    const res = await request<{ results: FlushResult['results']; practitioner: PractitionerPublic }>('/sync/flush', {
      method: 'POST',
      body: { mutations: q },
    });
    // Drop everything the server accepted (ok). Keep only hard failures for another attempt.
    const failedIds = new Set(res.results.filter((r) => !r.ok).map((r) => r.clientId));
    const remaining = q.filter((m) => failedIds.has(m.clientId));
    await save(remaining);
    return { flushed: q.length - remaining.length, practitioner: res.practitioner, results: res.results };
  } catch (e) {
    // Offline / server down — keep the queue intact for the next reconnect.
    if ((e as ApiError).code === 'OFFLINE' || (e as ApiError).status === 0) return { flushed: 0, results: [] };
    throw e;
  }
}

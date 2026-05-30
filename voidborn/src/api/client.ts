// HTTP client. No `/api` prefix (invariant #4). Bearer JWT. Android emulator reaches the host at
// 10.0.2.2 (NOT localhost) — resolved here via Platform (invariant #10).
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function defaultBaseUrl(): string {
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromConfig) return fromConfig.replace(/\/$/, '');
  // Dev defaults: Android emulator → 10.0.2.2; iOS sim / web → localhost.
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:4000`;
}

let baseUrl = defaultBaseUrl();
export const setBaseUrl = (url: string) => {
  baseUrl = url.replace(/\/$/, '');
};
export const getBaseUrl = () => baseUrl;

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean; // default true
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal, timeoutMs = 15000 } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort());

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new ApiError(0, 'Network unreachable', 'OFFLINE');
  }
  clearTimeout(timer);

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = (data && (data.error as string)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data?.code);
  }
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Liveness probe used by the offline sync hook to detect reconnection. */
export async function ping(): Promise<boolean> {
  try {
    await request('/health', { auth: false, timeoutMs: 4000 });
    return true;
  } catch {
    return false;
  }
}

// HTTP client. No `/api` prefix (invariant #4). Bearer JWT. Android emulator reaches the host at
// 10.0.2.2 (NOT localhost) — resolved here via Platform (invariant #10).
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, '');

function defaultBaseUrl(): string {
  // Guard against a non-string apiUrl (the build pipeline can serialize a null `extra.apiUrl`
  // as `{}`); only honor a real string. On web, prefer the page's own origin host.
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: unknown } | undefined)?.apiUrl;
  if (typeof fromConfig === 'string' && fromConfig.length > 0) return stripTrailingSlash(fromConfig);

  if (Platform.OS === 'web') {
    // Same host the app is served from (so a phone hitting the dev web server reaches the API too),
    // on the backend port. SSR-safe guard for `location`.
    const host =
      typeof globalThis !== 'undefined' && (globalThis as any).location?.hostname
        ? (globalThis as any).location.hostname
        : 'localhost';
    return `http://${host}:4000`;
  }
  // Native dev defaults: Android emulator → 10.0.2.2; iOS sim → localhost.
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:4000`;
}

let baseUrl = safeDefault();
function safeDefault(): string {
  try {
    return defaultBaseUrl();
  } catch {
    return 'http://localhost:4000';
  }
}
export const setBaseUrl = (url: string) => {
  baseUrl = stripTrailingSlash(String(url));
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

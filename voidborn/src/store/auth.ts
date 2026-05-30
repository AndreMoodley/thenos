import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/endpoints';
import { setAuthToken } from '../api/client';
import type { PractitionerPublic } from '../api/types';

const TOKEN_KEY = 'voidborn.token';

async function persistToken(token: string | null) {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* SecureStore unavailable (e.g. web) — session won't persist, login still works */
  }
}

export type AuthStatus = 'idle' | 'loading' | 'authed' | 'unauthed' | 'error';

interface AuthState {
  token: string | null;
  practitioner: PractitionerPublic | null;
  status: AuthStatus;
  error?: string;
  /** True until the first launch is determined (drives the rebirth gate). */
  isNewborn: boolean;
  hydrate: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setPractitioner: (p: PractitionerPublic) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  practitioner: null,
  status: 'idle',
  isNewborn: false,

  hydrate: async () => {
    set({ status: 'loading' });
    let token: string | null = null;
    try {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      token = null;
    }
    if (!token) return set({ status: 'unauthed' });
    setAuthToken(token);
    try {
      const { practitioner } = await api.auth.me();
      set({ token, practitioner, status: 'authed' });
    } catch {
      setAuthToken(null);
      await persistToken(null);
      set({ token: null, practitioner: null, status: 'unauthed' });
    }
  },

  signup: async (email, password, name) => {
    set({ status: 'loading', error: undefined });
    try {
      const { token, practitioner } = await api.auth.signup(email, password, name);
      setAuthToken(token);
      await persistToken(token);
      // A brand-new practitioner is reborn on first launch.
      set({ token, practitioner, status: 'authed', isNewborn: true });
    } catch (e: any) {
      set({ status: 'error', error: e?.message ?? 'Signup failed' });
      throw e;
    }
  },

  login: async (email, password) => {
    set({ status: 'loading', error: undefined });
    try {
      const { token, practitioner } = await api.auth.login(email, password);
      setAuthToken(token);
      await persistToken(token);
      set({ token, practitioner, status: 'authed', isNewborn: false });
    } catch (e: any) {
      set({ status: 'error', error: e?.message ?? 'Login failed' });
      throw e;
    }
  },

  logout: async () => {
    setAuthToken(null);
    await persistToken(null);
    set({ token: null, practitioner: null, status: 'unauthed', isNewborn: false });
  },

  setPractitioner: (p) => set({ practitioner: p }),
}));

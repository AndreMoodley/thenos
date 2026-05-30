// Typed wrappers over the API surface. All client calls go through here (invariant #4).
import { request } from './client';
import type {
  AuthResponse,
  CompanionCatalogEntry,
  CosmeticCatalogEntry,
  DomainCatalogEntry,
  EntityEnvelope,
  FormCatalogEntry,
  PractitionerPublic,
  StrikeResult,
  Vow,
  VoidSession,
} from './types';
import type { AvatarConfig, CosmeticCategory } from '../constants/cosmetics';

export const api = {
  auth: {
    signup: (email: string, password: string, name?: string) =>
      request<AuthResponse>('/auth/signup', { method: 'POST', auth: false, body: { email, password, name } }),
    login: (email: string, password: string) =>
      request<AuthResponse>('/auth/login', { method: 'POST', auth: false, body: { email, password } }),
    me: () => request<{ practitioner: PractitionerPublic }>('/auth/me'),
    refresh: () => request<{ token: string }>('/auth/refresh', { method: 'POST' }),
  },

  practitioner: {
    me: () => request<{ practitioner: PractitionerPublic }>('/practitioner/me'),
    strike: (body: { modality: string; reps: number; rating?: number; note?: string; clientId?: string }) =>
      request<StrikeResult>('/practitioner/me/strike', { method: 'POST', body }),
    seal: (amount = 5) => request<{ practitioner: PractitionerPublic }>('/practitioner/me/seal', { method: 'POST', body: { amount } }),
    anchor: () => request<{ practitioner: PractitionerPublic }>('/practitioner/me/anchor', { method: 'POST' }),
    leaks: () => request<{ leaks: any[] }>('/practitioner/me/leaks'),
    addLeak: (body: { category: string; label: string; cost: number; clientId?: string }) =>
      request<{ practitioner: PractitionerPublic }>('/practitioner/me/leaks', { method: 'POST', body }),
  },

  sessions: {
    list: (limit = 50) => request<{ sessions: VoidSession[] }>(`/sessions?limit=${limit}`),
    create: (body: { modality: string; reps: number; rating?: number; note?: string; clientId?: string }) =>
      request<StrikeResult & { session: VoidSession }>('/sessions', { method: 'POST', body }),
    remove: (id: string) => request<{ ok: boolean }>(`/sessions/${id}`, { method: 'DELETE' }),
  },

  vows: {
    list: () => request<{ vows: Vow[] }>('/vows'),
    create: (body: { title: string; type: 'major' | 'minor'; resolutionDate: string; progressions?: string[]; wagerAmount?: number }) =>
      request<{ vow: Vow }>('/vows', { method: 'POST', body }),
    keep: (id: string) => request<{ vow: Vow; flourish: boolean }>(`/vows/${id}/keep`, { method: 'POST' }),
    break: (id: string) => request<{ vow: Vow; practitioner: PractitionerPublic }>(`/vows/${id}/break`, { method: 'POST' }),
    toggleProgression: (id: string, pid: string, completed: boolean) =>
      request<{ progression: any }>(`/vows/${id}/progressions/${pid}`, { method: 'PUT', body: { completed } }),
  },

  entity: {
    me: () => request<EntityEnvelope>('/entity/me'),
    forms: () => request<{ forms: FormCatalogEntry[] }>('/entity/forms'),
    setForm: (formKey: string) => request<{ practitioner: PractitionerPublic }>('/entity/form', { method: 'POST', body: { formKey } }),
  },

  spaces: {
    list: () => request<{ spaces: DomainCatalogEntry[] }>('/spaces'),
    activate: (domainKey: string) => request<{ practitioner: PractitionerPublic }>('/spaces/activate', { method: 'POST', body: { domainKey } }),
  },

  cosmetics: {
    list: (category?: CosmeticCategory) => request<{ cosmetics: CosmeticCatalogEntry[] }>(`/cosmetics${category ? `?category=${category}` : ''}`),
    owned: () => request<{ cosmetics: CosmeticCatalogEntry[] }>('/cosmetics/owned'),
    equip: (itemKey: string, tint?: string) => request<{ avatarConfig: AvatarConfig }>('/cosmetics/equip', { method: 'POST', body: { itemKey, tint } }),
    unequip: (category: CosmeticCategory) => request<{ avatarConfig: AvatarConfig }>('/cosmetics/unequip', { method: 'POST', body: { category } }),
  },

  presets: {
    list: () => request<{ presets: any[] }>('/manifestation-presets'),
    create: (name: string, config?: AvatarConfig) => request<{ preset: any }>('/manifestation-presets', { method: 'POST', body: { name, config } }),
    activate: (id: string) => request<{ ok: boolean; activePresetId: string }>(`/manifestation-presets/${id}/activate`, { method: 'POST' }),
  },

  companions: {
    list: () => request<{ companions: CompanionCatalogEntry[]; active: string | null; rates: any; pity: any }>('/companions'),
    summon: (scrollType: 'lesser' | 'abyssal') => request<{ result: any; companion: any }>('/companions/summon', { method: 'POST', body: { scrollType } }),
    activate: (companionKey: string) => request<{ ok: boolean; active: string }>('/companions/activate', { method: 'POST', body: { companionKey } }),
  },

  coach: {
    reflect: (occasion: 'rebirth' | 'ascension' | 'return' | 'oracle' = 'return') =>
      request<{ reflection: string; source: string; cached: boolean }>('/coach/reflect', { method: 'POST', body: { occasion } }),
  },

  sync: {
    state: () => request<any>('/sync/state'),
  },

  premium: {
    reconcile: (entitlements: { kind: string; productKey: string }[], consumables?: { productKey: string; crystals: number }[]) =>
      request<{ practitioner: PractitionerPublic; grantedCrystals: number }>('/premium/reconcile', { method: 'POST', body: { entitlements, consumables } }),
    cleanse: () => request<{ practitioner: PractitionerPublic }>('/premium/cleanse', { method: 'POST' }),
  },
};

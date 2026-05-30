// Response shapes mirrored from the server serializers. Kept narrow to what the UI consumes.
import type { AvatarConfig, CosmeticItem } from '../constants/cosmetics';

export interface RealmRef {
  index: number;
  key: string;
  name: string;
  sigil: string;
  stageLabel: string;
}

export interface PractitionerPublic {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  ki: number;
  shadowLevel: number;
  hammerCount: number;
  streak: number;
  lastLogDate: string | null;
  anchorCompletedAt: string | null;
  crystals: number;
  corruptedSince: string | null;
  penanceProgress: number;
  restrictionScars: number;
  dormantSince: string | null;
  activeFormKey: string;
  activeDomainKey: string;
  activeManifestationPresetId: string | null;
  updatedAt: string;
  realm: RealmRef;
  stage: number;
  originArtMastery: number;
  nextThreshold: number | null;
  hammerToNext: number | null;
  progressToNext: number;
}

export interface EntityEnvelope {
  activeFormKey: string;
  realm: RealmRef;
  stage: number;
  metrics: { ki: number; shadowLevel: number; streak: number; hammerCount: number; originArtMastery: number };
  avatarConfig: AvatarConfig;
  activeBloodline: { bloodlineKey: string; name: string; stageAssets?: any; lockedSlots?: any } | null;
  activeCompanion: { companionKey: string; name: string; utility: string; rarity: string } | null;
  corruption: { since: string; penanceProgress: number } | null;
  restrictionScars: number;
  dormant: boolean;
}

export interface Vow {
  id: string;
  title: string;
  type: 'major' | 'minor';
  vowSubtype: string | null;
  status: 'active' | 'kept' | 'broken' | 'cancelled';
  startDate: string;
  resolutionDate: string;
  wagerAmount: number;
  wagerStatus: string;
  progressions: Progression[];
}
export interface Progression {
  id: string;
  text: string;
  completed: boolean;
  orderIndex: number;
}

export interface VoidSession {
  id: string;
  modality: string;
  reps: number;
  rating: number | null;
  note: string | null;
  occurredOn: string;
}

export interface StrikeResult {
  practitioner: PractitionerPublic;
  struck: boolean;
  crossed: RealmRef[];
  cleansed: boolean;
  sessionId?: string;
}

export interface AuthResponse {
  token: string;
  practitioner: PractitionerPublic;
}

export interface FormCatalogEntry {
  formKey: string;
  name: string;
  tier: string;
  priceModel: any;
  owned: boolean;
}

export interface DomainCatalogEntry {
  domainKey: string;
  name: string;
  aesthetic: string;
  tapEffect: string;
  kiBarMaterial: string;
  priceModel: any;
  owned: boolean;
  active: boolean;
}

export type CosmeticCatalogEntry = CosmeticItem & { owned: boolean };

export interface CompanionCatalogEntry {
  companionKey: string;
  name: string;
  rarity: string;
  utility: string;
  owned: boolean;
}

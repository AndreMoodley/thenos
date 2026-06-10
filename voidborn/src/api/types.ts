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
  fulfilledPlanned?: FulfilledPlanned | null;
  unlockedChapters?: UnlockedChapter[];
}

// ── trials (the forged path) ──────────────────────────────────

export type PlannedKind = 'flow' | 'surge' | 'pillar' | 'gate' | 'stillness';
export type PhaseKey = 'gathering' | 'tribulation' | 'quieting';

export interface PhaseSpan {
  phaseKey: PhaseKey;
  firstWeek: number;
  lastWeek: number;
}

export interface Trial {
  id: string;
  title: string;
  goalKind: 'breakthrough' | 'open_path';
  goalLabel: string | null;
  focusModality: string;
  experience: 'novice' | 'practiced' | 'seasoned';
  ability: { baselineReps: number };
  sessionsPerWeek: number;
  pillarDay: number; // 0 = Monday
  volumeDial: number;
  difficultyDial: number;
  totalWeeks: number;
  startDate: string;
  targetDate: string | null;
  status: 'active' | 'completed' | 'abandoned';
  vowId: string | null;
  chainedFromId: string | null;
  // derived server-side — never stored
  currentWeekIndex: number;
  currentPhase: PhaseKey | null;
  phasePlan: PhaseSpan[];
}

export interface PlannedSession {
  id: string;
  trialId: string;
  scheduledOn: string; // UTC midnight
  kind: PlannedKind;
  modality: string;
  targetReps: number; // 0 for stillness
  title: string;
  fulfilledBySessionId: string | null;
  fulfilledAt: string | null;
}

export interface Realignment {
  id: string;
  kind: 'ease' | 'intensify' | 'realign_missed';
  reason: string;
  payload: Record<string, unknown>;
  status: 'proposed' | 'accepted' | 'dismissed';
  createdAt: string;
}

export interface TrialState {
  trial: Trial | null;
  plannedSessions: PlannedSession[];
  realignments: Realignment[];
}

export interface FulfilledPlanned {
  id: string;
  kind: PlannedKind;
  title: string;
  trialId: string;
}

// ── saga (the chronicle) ──────────────────────────────────────

export interface SoulProfile {
  currentSelf: string;
  higherSelf: string;
  outcome: string;
  obstacleCategory: string;
  obstacleName: string;
  obstacleDetail: string;
  wardPlan: string;
  styleKey: string | null;
}

export interface SagaStyle {
  styleKey: string;
  name: string;
  descriptor: string;
}

export interface Saga {
  id: string;
  styleKey: string;
  title: string;
  synopsis: string;
  demonName: string;
  status: 'active' | 'completed' | 'archived';
  source: string;
  trialId: string | null;
  createdAt: string;
}

export interface SagaChapter {
  id: string;
  index: number;
  beatKey: string;
  title: string;
  tease: string;
  optional: boolean;
  unlockedAt: string | null;
  prose?: string | null; // present only when unlocked
  proseSource?: string | null;
  unlockedBy?: Record<string, unknown> | null;
}

export interface SagaState {
  saga: Saga | null;
  chapters: SagaChapter[];
  nextTease: { index: number; title: string; tease: string } | null;
}

export interface UnlockedChapter {
  id: string;
  index: number;
  beatKey: string;
  title: string;
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

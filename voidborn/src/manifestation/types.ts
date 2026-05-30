import type { AvatarConfig, CosmeticCategory } from '../constants/cosmetics';
import type { FormKey } from '../constants/forms';
import type { RealmState } from '../constants/realms';

/** A lineage rewrites stage artboards/palette and may LOCK the slots it owns. */
export interface Bloodline {
  bloodlineKey: string;
  name: string;
  stageAssets?: { artboards?: Record<number, string>; palette?: Record<string, string> };
  lockedSlots?: Partial<Record<CosmeticCategory, boolean>>;
}

/** Live-biometric aura that overrides the aura layer (Apple Health / Health Connect). */
export interface ReactiveAura {
  tint?: string;
  spec?: Record<string, unknown>;
}

/** An artifact adds an ADDITIVE orbit layer (Void Blade, Cursed Rings, …). */
export interface Artifact {
  itemKey: string;
  tint?: string;
  spec?: Record<string, unknown>;
}

export interface CorruptionState {
  since: string | Date;
  penanceProgress: number;
}

export interface ResolveInput {
  formKey: FormKey;
  ownedForms?: readonly string[]; // void is always owned
  hammerCount: number; // → realm/stage (never stored)
  metrics: { ki: number; shadowLevel: number; streak: number; originArtMastery?: number };
  avatarConfig: AvatarConfig;
  bloodline?: Bloodline | null;
  reactiveAura?: ReactiveAura | null;
  artifacts?: readonly Artifact[];
  corruption?: CorruptionState | null;
  restrictionScars?: number;
  dormant?: boolean;
}

export type LayerSource = 'lineage' | 'cosmetic' | 'reactiveAura' | 'artifact';

export interface ResolvedLayer {
  category: CosmeticCategory;
  itemKey: string;
  tint?: string;
  source: LayerSource;
  order: number; // position in LAYER_ORDER (artifacts share the orbit slot, appended)
}

/** The numbers pushed into the Rive state machine. Motion is driven by life, not cosmetics. */
export interface RiveInputs {
  realm: number; // stage 1..7 — selects the silhouette
  ki: number; // 0..100 — eye brightness / aura integrity
  shadowLevel: number; // 1..5 — appendage spread / pulse rate
  streak: number;
  streakBonus: boolean; // streak >= 7 → bonus orbit
  mastery: number; // originArtMastery → glow
  corruption: number; // 0 | 1 — corruption overlay
}

export interface Manifestation {
  formKey: FormKey;
  realm: RealmState;
  stage: number;
  riv: string;
  artboard: string;
  layers: ResolvedLayer[]; // in render order (back-to-front)
  riveInputs: RiveInputs;
  flags: {
    corrupted: boolean;
    dormant: boolean;
    lockedSlots: CosmeticCategory[];
    restrictionScars: number;
    globalModifier: 'none' | 'corruption';
  };
}

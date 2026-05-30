// The cosmetic layer system. The entity composes BACK-TO-FRONT through these layers. Cosmetics
// change the LOOK; live metrics drive the MOTION (a cosmetic may never disable a readout).

export type CosmeticCategory =
  | 'trail'
  | 'aura'
  | 'core'
  | 'surface'
  | 'eyes'
  | 'appendages'
  | 'orbit'
  | 'sigils';

export type Rarity = 'free' | 'standard' | 'premium' | 'seasonal' | 'event';

// Back-to-front render order (README §layer stack). The resolver emits layers in this order.
export const LAYER_ORDER: readonly CosmeticCategory[] = [
  'trail',
  'aura',
  'core', // core/silhouette
  'surface', // surface/material
  'eyes',
  'appendages',
  'orbit',
  'sigils',
] as const;

export type PriceModel =
  | { kind: 'free' }
  | { kind: 'crystals'; amount: number }
  | { kind: 'iap'; productKey: string; priceUsd: number }
  | { kind: 'earned' };

export interface CosmeticItem {
  itemKey: string;
  category: CosmeticCategory;
  name: string;
  rarity: Rarity;
  defaultTint?: string;
  layerSpec: Record<string, unknown>;
  priceModel: PriceModel;
  setKey?: string;
  owned?: boolean;
}

/** A single equipped layer: which item + the tint applied ON EQUIP (never per-frame). */
export interface EquippedLayer {
  itemKey: string;
  tint?: string;
}

export interface AvatarConfig {
  layers: Partial<Record<CosmeticCategory, EquippedLayer>>;
  demeanor?: string;
}

export const EMPTY_AVATAR_CONFIG: AvatarConfig = { layers: {}, demeanor: 'neutral' };

export const isCosmeticFree = (item: Pick<CosmeticItem, 'priceModel'>): boolean =>
  item.priceModel.kind === 'free';

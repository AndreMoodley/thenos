import { LAYER_ORDER, type CosmeticCategory } from '../constants/cosmetics';
import { FORM_LINES, FREE_FORM, isFormOwned, type FormKey } from '../constants/forms';
import { realmForHammerCount } from '../constants/realms';
import type { Manifestation, ResolveInput, ResolvedLayer } from './types';

/**
 * The manifestation resolver — PURE and unit-tested. It merges sources in strict precedence so it
 * can NEVER render an illegal combination, and it NEVER stores a baked look (appearance is rebuilt
 * every time from `avatarConfig` + `activeFormKey` + live state).
 *
 * Precedence (higher overrides lower):
 *   1. Form line          → the stage-artboard set
 *   2. Realm base stage   → which stage artboard (from hammerCount)
 *   3. Lineage (Bloodline)→ remaps artboards/palette; LOCKS the slots it owns
 *   4. Equipped cosmetics → override unlocked layer styles
 *   5. Reactive Auras     → override the aura layer with live biometrics
 *   6. Artifacts          → add orbit layers (additive)
 *   7. Corruption         → final global modifier
 */
export function resolveManifestation(input: ResolveInput): Manifestation {
  // (1) Form — fall back to the free Void form if the requested form is not owned (never illegal).
  const requested = input.formKey;
  const owned = input.ownedForms ?? [];
  const formKey: FormKey = isFormOwned(requested, owned) ? requested : FREE_FORM;
  const form = FORM_LINES[formKey] ?? FORM_LINES[FREE_FORM];

  // (2) Realm/stage — computed, never stored.
  const realm = realmForHammerCount(input.hammerCount);
  const stage = realm.stage;

  // (3) Lineage — artboard remap + locked slots.
  const lineage = input.bloodline ?? null;
  const lockedSlots = new Set<CosmeticCategory>(
    lineage?.lockedSlots
      ? (Object.entries(lineage.lockedSlots).filter(([, v]) => v).map(([k]) => k) as CosmeticCategory[])
      : [],
  );
  const artboard = lineage?.stageAssets?.artboards?.[stage] ?? form.artboards[stage] ?? form.artboards[1]!;

  // Build one layer per category in render order.
  const layers: ResolvedLayer[] = [];
  LAYER_ORDER.forEach((category, order) => {
    const locked = lockedSlots.has(category);
    const lineagePalette = lineage?.stageAssets?.palette?.[category];

    if (locked) {
      // (3) lineage owns this slot — cosmetics cannot override it
      layers.push({ category, itemKey: `${lineage!.bloodlineKey}:${category}`, tint: lineagePalette, source: 'lineage', order });
      return;
    }

    // (5) Reactive aura overrides the aura layer (a live readout outranks a static cosmetic).
    if (category === 'aura' && input.reactiveAura) {
      layers.push({ category, itemKey: 'reactive_aura', tint: input.reactiveAura.tint, source: 'reactiveAura', order });
      return;
    }

    // (4) Equipped cosmetic for this slot, if any.
    const equipped = input.avatarConfig?.layers?.[category];
    if (equipped) {
      layers.push({ category, itemKey: equipped.itemKey, tint: equipped.tint ?? lineagePalette, source: 'cosmetic', order });
    }
  });

  // (6) Artifacts — additive orbit layers appended after the orbit slot.
  const orbitOrder = LAYER_ORDER.indexOf('orbit');
  (input.artifacts ?? []).forEach((a, i) => {
    layers.push({ category: 'orbit', itemKey: a.itemKey, tint: a.tint, source: 'artifact', order: orbitOrder + 0.1 * (i + 1) });
  });
  layers.sort((a, b) => a.order - b.order);

  // (7) Corruption — final global modifier (desaturated/chained/red-eyed look + SM input).
  const corrupted = !!input.corruption;

  return {
    formKey,
    realm,
    stage,
    riv: form.riv,
    artboard,
    layers,
    riveInputs: {
      realm: stage,
      ki: clamp(input.metrics.ki, 0, 100),
      shadowLevel: clamp(input.metrics.shadowLevel, 1, 5),
      streak: Math.max(0, input.metrics.streak),
      streakBonus: input.metrics.streak >= 7,
      mastery: input.metrics.originArtMastery ?? input.hammerCount * 0.001,
      corruption: corrupted ? 1 : 0,
    },
    flags: {
      corrupted,
      dormant: !!input.dormant,
      lockedSlots: [...lockedSlots],
      restrictionScars: input.restrictionScars ?? 0,
      globalModifier: corrupted ? 'corruption' : 'none',
    },
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

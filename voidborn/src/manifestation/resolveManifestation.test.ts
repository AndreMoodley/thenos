import { describe, it, expect } from 'vitest';
import { resolveManifestation } from './resolveManifestation';
import type { ResolveInput } from './types';

const base: ResolveInput = {
  formKey: 'void',
  ownedForms: [],
  hammerCount: 5300, // Realm 3 — Ki Establishment (stage 3)
  metrics: { ki: 72, shadowLevel: 2, streak: 11 },
  avatarConfig: { layers: {}, demeanor: 'neutral' },
};

describe('resolveManifestation — pure, never renders an illegal look', () => {
  it('selects the form riv + the computed stage artboard (stage is derived)', () => {
    const m = resolveManifestation(base);
    expect(m.formKey).toBe('void');
    expect(m.stage).toBe(3);
    expect(m.riv).toBe('void.riv');
    expect(m.artboard).toBe('Void_Forming'); // stage 3 label = Forming
  });

  it('falls back to the free Void form when the requested form is not owned', () => {
    const m = resolveManifestation({ ...base, formKey: 'beast', ownedForms: [] });
    expect(m.formKey).toBe('void');
  });

  it('uses a premium form when it is owned', () => {
    const m = resolveManifestation({ ...base, formKey: 'beast', ownedForms: ['beast'] });
    expect(m.formKey).toBe('beast');
    expect(m.riv).toBe('beast.riv');
  });

  it('places equipped cosmetics into layers in back-to-front render order', () => {
    const m = resolveManifestation({
      ...base,
      avatarConfig: { layers: { sigils: { itemKey: 'sigils_void' }, aura: { itemKey: 'aura_origin', tint: '#7df9ff' } } },
    });
    const cats = m.layers.map((l) => l.category);
    expect(cats.indexOf('aura')).toBeLessThan(cats.indexOf('sigils')); // aura renders before sigils
    expect(m.layers.find((l) => l.category === 'aura')?.source).toBe('cosmetic');
  });

  it('lets a lineage LOCK a slot so cosmetics cannot override it, and remaps the artboard', () => {
    const m = resolveManifestation({
      ...base,
      avatarConfig: { layers: { core: { itemKey: 'core_ember' } } },
      bloodline: {
        bloodlineKey: 'abyssal',
        name: 'Abyssal',
        stageAssets: { artboards: { 3: 'Abyssal_Forming' }, palette: { core: '#9b5cff' } },
        lockedSlots: { core: true },
      },
    });
    expect(m.artboard).toBe('Abyssal_Forming');
    const core = m.layers.find((l) => l.category === 'core');
    expect(core?.source).toBe('lineage'); // cosmetic 'core_ember' was overridden by the lock
    expect(core?.tint).toBe('#9b5cff');
    expect(m.flags.lockedSlots).toContain('core');
  });

  it('reactive aura overrides the aura layer (a live readout outranks a static cosmetic)', () => {
    const m = resolveManifestation({
      ...base,
      avatarConfig: { layers: { aura: { itemKey: 'aura_origin' } } },
      reactiveAura: { tint: '#39ff88' },
    });
    const aura = m.layers.find((l) => l.category === 'aura');
    expect(aura?.source).toBe('reactiveAura');
    expect(aura?.tint).toBe('#39ff88');
  });

  it('adds artifacts as ADDITIVE orbit layers', () => {
    const m = resolveManifestation({
      ...base,
      avatarConfig: { layers: { orbit: { itemKey: 'orbit_origin' } } },
      artifacts: [{ itemKey: 'artifact_void_blade', tint: '#c0c8ff' }, { itemKey: 'artifact_halo' }],
    });
    const orbitLayers = m.layers.filter((l) => l.category === 'orbit');
    expect(orbitLayers.length).toBe(3); // 1 cosmetic + 2 artifacts
    expect(orbitLayers.filter((l) => l.source === 'artifact').length).toBe(2);
  });

  it('applies corruption as a final global modifier', () => {
    const m = resolveManifestation({ ...base, corruption: { since: new Date().toISOString(), penanceProgress: 2 } });
    expect(m.flags.corrupted).toBe(true);
    expect(m.flags.globalModifier).toBe('corruption');
    expect(m.riveInputs.corruption).toBe(1);
  });

  it('drives Rive inputs from live metrics (clamped) — motion is life, not cosmetics', () => {
    const m = resolveManifestation({ ...base, metrics: { ki: 999, shadowLevel: 9, streak: 11, originArtMastery: 5.3 } });
    expect(m.riveInputs.ki).toBe(100); // clamped
    expect(m.riveInputs.shadowLevel).toBe(5); // clamped
    expect(m.riveInputs.streakBonus).toBe(true); // streak >= 7
    expect(m.riveInputs.mastery).toBeCloseTo(5.3);
    expect(m.riveInputs.realm).toBe(3);
  });

  it('is deterministic — same input, same output', () => {
    expect(resolveManifestation(base)).toEqual(resolveManifestation(base));
  });
});

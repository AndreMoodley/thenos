import { describe, it, expect } from 'vitest';
import { decideRarity, ratesFor, disclosedRates, dupRefund, PITY_ANCIENT, PITY_HERALD } from '../lib/gacha.js';

describe('gacha — the only RNG (disclosed rates + server pity)', () => {
  it('discloses rates that sum to 1 for each scroll', () => {
    for (const scroll of ['lesser', 'abyssal'] as const) {
      const sum = Object.values(ratesFor(scroll).rates).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });

  it('samples rarity from the disclosed distribution by roll', () => {
    // lesser: wandering .60, bound .30, ancient .09, herald .01
    expect(decideRarity('lesser', 0.0, 0, 0).rarity).toBe('wandering');
    expect(decideRarity('lesser', 0.59, 0, 0).rarity).toBe('wandering');
    expect(decideRarity('lesser', 0.61, 0, 0).rarity).toBe('bound');
    expect(decideRarity('lesser', 0.91, 0, 0).rarity).toBe('ancient');
    expect(decideRarity('lesser', 0.999, 0, 0).rarity).toBe('void_herald');
  });

  it('guarantees Ancient+ at the ancient pity threshold', () => {
    const d = decideRarity('lesser', 0.0, PITY_ANCIENT - 1, 0); // this pull is the 50th
    expect(['ancient', 'void_herald']).toContain(d.rarity);
    expect(d.wasPity).toBe(true);
  });

  it('guarantees Void Herald at the herald pity threshold', () => {
    const d = decideRarity('lesser', 0.0, 10, PITY_HERALD - 1); // this pull is the 100th
    expect(d.rarity).toBe('void_herald');
    expect(d.wasPity).toBe(true);
  });

  it('does not trigger pity before the threshold', () => {
    expect(decideRarity('lesser', 0.0, 5, 5).wasPity).toBe(false);
  });

  it('exposes both scroll pools in the disclosure', () => {
    const all = disclosedRates();
    expect(all.lesser.pity.ancientAt).toBe(PITY_ANCIENT);
    expect(all.abyssal.pity.voidHeraldAt).toBe(PITY_HERALD);
  });

  it('refunds crystals only on paid (abyssal) duplicates — free pulls never mint (H2)', () => {
    expect(dupRefund('lesser', 'ancient')).toBe(0);
    expect(dupRefund('lesser', 'wandering')).toBe(0);
    expect(dupRefund('abyssal', 'wandering')).toBe(5);
    expect(dupRefund('abyssal', 'ancient')).toBe(25);
    expect(dupRefund('abyssal', 'void_herald')).toBe(25);
  });
});

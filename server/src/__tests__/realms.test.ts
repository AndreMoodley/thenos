import { describe, it, expect } from 'vitest';
import { realmForHammerCount, realmsCrossed, REALMS } from '../lib/realms.js';

describe('realms — computed, never stored', () => {
  it('maps hammerCount to the seven realms at the documented thresholds', () => {
    expect(realmForHammerCount(0).realm.index).toBe(1);
    expect(realmForHammerCount(1499).realm.index).toBe(1);
    expect(realmForHammerCount(1500).realm.index).toBe(2);
    expect(realmForHammerCount(4000).realm.index).toBe(3);
    expect(realmForHammerCount(9000).realm.index).toBe(4);
    expect(realmForHammerCount(18000).realm.index).toBe(5);
    expect(realmForHammerCount(36500).realm.index).toBe(6);
    expect(realmForHammerCount(73000).realm.index).toBe(7);
    expect(realmForHammerCount(10_000_000).realm.index).toBe(7);
  });

  it('exposes stage == realm index and the right stage label', () => {
    expect(realmForHammerCount(0).stage).toBe(1);
    expect(realmForHammerCount(0).realm.stageLabel).toBe('Embryo');
    expect(realmForHammerCount(73000).realm.stageLabel).toBe('Divine self');
  });

  it('computes originArtMastery as hammerCount * 0.001', () => {
    expect(realmForHammerCount(5300).originArtMastery).toBeCloseTo(5.3);
  });

  it('reports progress toward the next realm, and null at Divine Master', () => {
    const mid = realmForHammerCount(2750); // halfway between 1500 and 4000
    expect(mid.realm.index).toBe(2);
    expect(mid.progressToNext).toBeCloseTo(0.5, 2);
    const top = realmForHammerCount(73000);
    expect(top.nextThreshold).toBeNull();
    expect(top.hammerToNext).toBeNull();
    expect(top.progressToNext).toBe(1);
  });

  it('detects realm crossings for ascension cinematics', () => {
    expect(realmsCrossed(1400, 1600).map((r) => r.index)).toEqual([2]);
    expect(realmsCrossed(0, 5000).map((r) => r.index)).toEqual([2, 3]);
    expect(realmsCrossed(5000, 5200)).toEqual([]);
    expect(realmsCrossed(5200, 5000)).toEqual([]); // never goes backward
  });

  it('has exactly seven realms', () => {
    expect(REALMS).toHaveLength(7);
  });
});

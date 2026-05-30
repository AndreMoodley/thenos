import { describe, it, expect } from 'vitest';
import { realmForHammerCount, realmsCrossed, REALMS } from './realms';

// This MUST stay identical in behaviour to server/src/lib/realms.ts (the shared contract).
describe('realms (client) — matches the server contract', () => {
  it('maps the seven documented thresholds', () => {
    const at = (hc: number) => realmForHammerCount(hc).realm.index;
    expect([at(0), at(1499), at(1500), at(4000), at(9000), at(18000), at(36500), at(73000)]).toEqual([1, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('stage equals realm index; labels are embryo → divine', () => {
    expect(realmForHammerCount(0).realm.stageLabel).toBe('Embryo');
    expect(realmForHammerCount(73000).realm.stageLabel).toBe('Divine self');
    expect(REALMS).toHaveLength(7);
  });

  it('originArtMastery is hammerCount * 0.001', () => {
    expect(realmForHammerCount(5300).originArtMastery).toBeCloseTo(5.3);
  });

  it('detects crossings forward only', () => {
    expect(realmsCrossed(0, 5000).map((r) => r.index)).toEqual([2, 3]);
    expect(realmsCrossed(5000, 4000)).toEqual([]);
  });
});

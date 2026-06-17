import { describe, it, expect } from 'vitest';
import { scoreStrike } from '../lib/anomaly.js';

describe('scoreStrike', () => {
  it('cold start: only the absolute ceiling applies', () => {
    expect(scoreStrike([], 100).flagged).toBe(false);
    expect(scoreStrike([], 6000).flagged).toBe(true);
  });

  it('does not flag legitimate progression (2× a steady baseline)', () => {
    expect(scoreStrike([100, 110, 90, 105, 95], 200).flagged).toBe(false);
  });

  it('flags a strike far above the personal baseline', () => {
    const r = scoreStrike([100, 110, 90, 105, 95], 900);
    expect(r.flagged).toBe(true);
    expect(r.reason).toMatch(/personal median/);
  });

  it('never flags small sessions below the floor', () => {
    expect(scoreStrike([2, 3, 4, 5, 6], 40).flagged).toBe(false);
  });

  it('reports a relative score', () => {
    expect(scoreStrike([100, 100, 100, 100, 100], 300).score).toBe(3);
  });
});

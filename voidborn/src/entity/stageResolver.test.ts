import { describe, it, expect } from 'vitest';
import { entityStage, bridgeInputs } from './stageResolver';

describe('entity stage resolver', () => {
  it('reports the evolution stage from lifetime effort', () => {
    expect(entityStage(0)).toMatchObject({ stage: 1, label: 'Embryo' });
    expect(entityStage(9000)).toMatchObject({ stage: 4, label: 'Tempered' });
  });

  it('bridges live state into clamped Rive inputs', () => {
    const i = bridgeInputs({ hammerCount: 9000, ki: 150, shadowLevel: 0, streak: 8, corrupted: true });
    expect(i.realm).toBe(4);
    expect(i.ki).toBe(100); // clamped 0..100
    expect(i.shadowLevel).toBe(1); // clamped 1..5
    expect(i.streakBonus).toBe(true);
    expect(i.corruption).toBe(1);
  });
});

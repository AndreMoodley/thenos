// The metric → Rive-input bridge. Maps live practitioner state to the numeric inputs the entity's
// state machine consumes, at render cadence. Motion is driven by life, never by cosmetics.
import { useMemo } from 'react';
import { useMetrics } from '../store/metrics';
import { bridgeInputs } from '../entity/stageResolver';
import type { RiveInputs } from '../manifestation/types';

const DEFAULT: RiveInputs = { realm: 1, ki: 100, shadowLevel: 1, streak: 0, streakBonus: false, mastery: 0, corruption: 0 };

export function useEntityInputs(): RiveInputs {
  const p = useMetrics((s) => s.practitioner);
  return useMemo<RiveInputs>(() => {
    if (!p) return DEFAULT;
    return bridgeInputs({
      hammerCount: p.hammerCount,
      ki: p.ki,
      shadowLevel: p.shadowLevel,
      streak: p.streak,
      corrupted: !!p.corruptedSince,
    });
  }, [p?.hammerCount, p?.ki, p?.shadowLevel, p?.streak, p?.corruptedSince]);
}

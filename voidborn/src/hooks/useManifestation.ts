// Composes the full Manifestation from live stores using the PURE resolver. Appearance is rebuilt
// every render from avatarConfig + activeFormKey + live state — never stored.
import { useMemo } from 'react';
import { useMetrics } from '../store/metrics';
import { useCharacterConfig } from '../store/characterConfig';
import { resolveManifestation } from '../manifestation/resolveManifestation';
import type { Manifestation } from '../manifestation/types';

export function useManifestation(): Manifestation | null {
  const p = useMetrics((s) => s.practitioner);
  const entity = useMetrics((s) => s.entity);
  const avatarConfig = useCharacterConfig((s) => s.avatarConfig);
  const activeFormKey = useCharacterConfig((s) => s.activeFormKey);
  const ownedForms = useCharacterConfig((s) => s.ownedForms);

  return useMemo<Manifestation | null>(() => {
    if (!p) return null;
    return resolveManifestation({
      formKey: activeFormKey,
      ownedForms,
      hammerCount: p.hammerCount,
      metrics: { ki: p.ki, shadowLevel: p.shadowLevel, streak: p.streak, originArtMastery: p.originArtMastery },
      avatarConfig,
      bloodline: entity?.activeBloodline ?? null,
      corruption: p.corruptedSince ? { since: p.corruptedSince, penanceProgress: p.penanceProgress } : null,
      restrictionScars: p.restrictionScars,
      dormant: !!p.dormantSince,
    });
  }, [p, entity?.activeBloodline, avatarConfig, activeFormKey, ownedForms]);
}

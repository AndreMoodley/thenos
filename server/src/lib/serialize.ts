import type { Practitioner } from '@prisma/client';
import { realmForHammerCount } from './realms.js';

/** Public practitioner shape — never leaks passwordHash; includes the COMPUTED realm/stage. */
export function publicPractitioner(p: Practitioner) {
  const r = realmForHammerCount(p.hammerCount);
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    ki: p.ki,
    shadowLevel: p.shadowLevel,
    hammerCount: p.hammerCount,
    streak: p.streak,
    lastLogDate: p.lastLogDate,
    anchorCompletedAt: p.anchorCompletedAt,
    crystals: p.crystals,
    corruptedSince: p.corruptedSince,
    penanceProgress: p.penanceProgress,
    restrictionScars: p.restrictionScars,
    dormantSince: p.dormantSince,
    activeFormKey: p.activeFormKey,
    activeDomainKey: p.activeDomainKey,
    activeManifestationPresetId: p.activeManifestationPresetId,
    updatedAt: p.updatedAt,
    // computed — never stored
    realm: {
      index: r.realm.index,
      key: r.realm.key,
      name: r.realm.name,
      sigil: r.realm.sigil,
      stageLabel: r.realm.stageLabel,
    },
    stage: r.stage,
    originArtMastery: r.originArtMastery,
    nextThreshold: r.nextThreshold,
    hammerToNext: r.hammerToNext,
    progressToNext: r.progressToNext,
  };
}

export const DEFAULT_AVATAR_CONFIG = { layers: {} as Record<string, { itemKey: string; tint?: string }>, demeanor: 'neutral' };

import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

export interface AvatarConfig {
  layers: Record<string, { itemKey: string; tint?: string }>;
  demeanor?: string;
}

/** Get the practitioner's active working preset, creating a default if none exists. */
export async function getActivePreset(tx: Tx, practitionerId: string) {
  const p = await tx.practitioner.findUniqueOrThrow({
    where: { id: practitionerId },
    select: { activeManifestationPresetId: true },
  });
  if (p.activeManifestationPresetId) {
    const found = await tx.manifestationPreset.findUnique({ where: { id: p.activeManifestationPresetId } });
    if (found) return found;
  }
  const created = await tx.manifestationPreset.create({
    data: { practitionerId, name: 'Default', config: { layers: {}, demeanor: 'neutral' }, isActive: true },
  });
  await tx.practitioner.update({ where: { id: practitionerId }, data: { activeManifestationPresetId: created.id } });
  return created;
}

export function asAvatarConfig(config: unknown): AvatarConfig {
  const c = (config && typeof config === 'object' ? config : {}) as any;
  return { layers: c.layers && typeof c.layers === 'object' ? c.layers : {}, demeanor: c.demeanor ?? 'neutral' };
}

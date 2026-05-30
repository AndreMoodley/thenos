import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, forbidden, notFound, wrap } from '../lib/http.js';
import { getActivePreset, asAvatarConfig } from '../lib/presets.js';

export const cosmeticsRouter = Router();
cosmeticsRouter.use(requireAuth);

const CATEGORIES = ['trail', 'aura', 'core', 'surface', 'eyes', 'appendages', 'orbit', 'sigils'] as const;

function isFree(priceModel: unknown): boolean {
  return !!priceModel && typeof priceModel === 'object' && (priceModel as any).kind === 'free';
}

async function ownsCosmetic(practitionerId: string, item: { itemKey: string; priceModel: unknown }): Promise<boolean> {
  if (isFree(item.priceModel)) return true; // a free option per layer is always available
  const owned = await prisma.practitionerCosmetic.findUnique({
    where: { practitionerId_cosmeticItemId: { practitionerId, cosmeticItemId: item.itemKey } },
  });
  return !!owned;
}

cosmeticsRouter.get(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const where = category && (CATEGORIES as readonly string[]).includes(category) ? { category: category as any } : {};
    const [items, owned] = await Promise.all([
      prisma.cosmeticItem.findMany({ where }),
      prisma.practitionerCosmetic.findMany({ where: { practitionerId: req.practitionerId! }, select: { cosmeticItemId: true } }),
    ]);
    const ownedSet = new Set(owned.map((o) => o.cosmeticItemId));
    res.json({
      cosmetics: items.map((i) => ({ ...i, owned: ownedSet.has(i.itemKey) || isFree(i.priceModel) })),
    });
  }),
);

cosmeticsRouter.get(
  '/owned',
  wrap(async (req: AuthedRequest, res) => {
    const owned = await prisma.practitionerCosmetic.findMany({
      where: { practitionerId: req.practitionerId! },
      include: { cosmeticItem: true },
    });
    res.json({ cosmetics: owned.map((o) => o.cosmeticItem) });
  }),
);

// Equip writes { itemKey, tint } into the active preset's avatarConfig.layers[category].
// Tint is applied on equip (never per-frame). Only avatarConfig persists — the look is rebuilt.
cosmeticsRouter.post(
  '/equip',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({
      itemKey: z.string().min(1).max(80),
      tint: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid equip payload');
    const item = await prisma.cosmeticItem.findUnique({ where: { itemKey: parsed.data.itemKey } });
    if (!item) throw notFound('Cosmetic not found');
    if (!(await ownsCosmetic(req.practitionerId!, item))) throw forbidden('Unseal this item before equipping it');

    const preset = await prisma.$transaction(async (tx) => {
      const active = await getActivePreset(tx, req.practitionerId!);
      const cfg = asAvatarConfig(active.config);
      cfg.layers[item.category] = { itemKey: item.itemKey, tint: parsed.data.tint ?? item.defaultTint ?? undefined };
      return tx.manifestationPreset.update({ where: { id: active.id }, data: { config: cfg as any } });
    });
    res.json({ avatarConfig: preset.config });
  }),
);

cosmeticsRouter.post(
  '/unequip',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ category: z.enum(CATEGORIES) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid unequip payload');
    const preset = await prisma.$transaction(async (tx) => {
      const active = await getActivePreset(tx, req.practitionerId!);
      const cfg = asAvatarConfig(active.config);
      delete cfg.layers[parsed.data.category];
      return tx.manifestationPreset.update({ where: { id: active.id }, data: { config: cfg as any } });
    });
    res.json({ avatarConfig: preset.config });
  }),
);

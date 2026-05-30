import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, notFound, wrap } from '../lib/http.js';
import { getActivePreset } from '../lib/presets.js';

// Manifestation Presets — a full avatarConfig saved under a name, swapped in one tap.
export const presetsRouter = Router();
presetsRouter.use(requireAuth);

async function ownedPreset(practitionerId: string, id: string) {
  const preset = await prisma.manifestationPreset.findUnique({ where: { id } });
  if (!preset || preset.practitionerId !== practitionerId) throw notFound('Preset not found');
  return preset;
}

presetsRouter.get(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const presets = await prisma.manifestationPreset.findMany({
      where: { practitionerId: req.practitionerId! },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ presets });
  }),
);

presetsRouter.post(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ name: z.string().min(1).max(60), config: z.any().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid preset payload');
    // Snapshot the current working config when none is supplied.
    const config = parsed.data.config ?? (await prisma.$transaction((tx) => getActivePreset(tx, req.practitionerId!))).config;
    const preset = await prisma.manifestationPreset.create({
      data: { practitionerId: req.practitionerId!, name: parsed.data.name, config },
    });
    res.status(201).json({ preset });
  }),
);

presetsRouter.put(
  '/:id',
  wrap(async (req: AuthedRequest, res) => {
    await ownedPreset(req.practitionerId!, req.params.id);
    const schema = z.object({ name: z.string().min(1).max(60).optional(), config: z.any().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid preset patch');
    const preset = await prisma.manifestationPreset.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ preset });
  }),
);

presetsRouter.delete(
  '/:id',
  wrap(async (req: AuthedRequest, res) => {
    const preset = await ownedPreset(req.practitionerId!, req.params.id);
    if (preset.isActive) throw badRequest('Cannot delete the active preset');
    await prisma.manifestationPreset.delete({ where: { id: preset.id } });
    res.json({ ok: true });
  }),
);

presetsRouter.post(
  '/:id/activate',
  wrap(async (req: AuthedRequest, res) => {
    const preset = await ownedPreset(req.practitionerId!, req.params.id);
    await prisma.$transaction([
      prisma.manifestationPreset.updateMany({ where: { practitionerId: req.practitionerId! }, data: { isActive: false } }),
      prisma.manifestationPreset.update({ where: { id: preset.id }, data: { isActive: true } }),
      prisma.practitioner.update({ where: { id: req.practitionerId! }, data: { activeManifestationPresetId: preset.id } }),
    ]);
    res.json({ ok: true, activePresetId: preset.id });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, forbidden, notFound, wrap } from '../lib/http.js';
import { realmForHammerCount } from '../lib/realms.js';
import { publicPractitioner } from '../lib/serialize.js';

export const entityRouter = Router();
entityRouter.use(requireAuth);

async function ownsForm(practitionerId: string, formKey: string): Promise<boolean> {
  if (formKey === 'void') return true; // the free origin is always owned
  const owned = await prisma.practitionerForm.findUnique({
    where: { practitionerId_formKey: { practitionerId, formKey } },
  });
  return !!owned;
}

entityRouter.get(
  '/forms',
  wrap(async (req: AuthedRequest, res) => {
    const [forms, owned] = await Promise.all([
      prisma.entityForm.findMany(),
      prisma.practitionerForm.findMany({ where: { practitionerId: req.practitionerId! }, select: { formKey: true } }),
    ]);
    const ownedSet = new Set(['void', ...owned.map((o) => o.formKey)]);
    res.json({ forms: forms.map((f) => ({ ...f, owned: ownedSet.has(f.formKey) })) });
  }),
);

// The manifestation envelope: every INPUT the pure client resolver needs. The resolved look is
// never stored or sent — the client rebuilds it with resolveManifestation().
entityRouter.get(
  '/me',
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.findUniqueOrThrow({
      where: { id: req.practitionerId! },
      include: { entity: true },
    });
    const realm = realmForHammerCount(p.hammerCount);
    const activePreset = p.activeManifestationPresetId
      ? await prisma.manifestationPreset.findUnique({ where: { id: p.activeManifestationPresetId } })
      : null;
    const companion = p.entity?.activeCompanionId
      ? await prisma.practitionerCompanion.findFirst({
          where: { practitionerId: p.id, companionKey: p.entity.activeCompanionId },
          include: { companion: true },
        })
      : null;
    const bloodline = p.entity?.activeBloodlineId
      ? await prisma.practitionerBloodline.findFirst({
          where: { practitionerId: p.id, bloodlineKey: p.entity.activeBloodlineId },
          include: { bloodline: true },
        })
      : null;

    res.json({
      // form & stage (stage computed, never stored)
      activeFormKey: p.activeFormKey,
      realm: { index: realm.realm.index, key: realm.realm.key, name: realm.realm.name, sigil: realm.realm.sigil, stageLabel: realm.realm.stageLabel },
      stage: realm.stage,
      // live motion drivers
      metrics: {
        ki: p.ki,
        shadowLevel: p.shadowLevel,
        streak: p.streak,
        hammerCount: p.hammerCount,
        originArtMastery: realm.originArtMastery,
      },
      // resolver inputs (avatarConfig + lineage + companion + corruption)
      avatarConfig: activePreset?.config ?? { layers: {}, demeanor: p.entity?.demeanor ?? 'neutral' },
      activeBloodline: bloodline?.bloodline ?? null,
      activeCompanion: companion?.companion ?? null,
      corruption: p.corruptedSince ? { since: p.corruptedSince, penanceProgress: p.penanceProgress } : null,
      restrictionScars: p.restrictionScars,
      dormant: !!p.dormantSince,
    });
  }),
);

entityRouter.post(
  '/form',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ formKey: z.string().min(1).max(40) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid form payload');
    const form = await prisma.entityForm.findUnique({ where: { formKey: parsed.data.formKey } });
    if (!form && parsed.data.formKey !== 'void') throw notFound('Form not found');
    if (!(await ownsForm(req.practitionerId!, parsed.data.formKey))) {
      throw forbidden('This form is not yet manifested — acquire it in the Chamber first');
    }
    const p = await prisma.practitioner.update({
      where: { id: req.practitionerId! },
      data: { activeFormKey: parsed.data.formKey },
    });
    res.json({ practitioner: publicPractitioner(p) });
  }),
);

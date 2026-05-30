import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, forbidden, notFound, wrap } from '../lib/http.js';
import { publicPractitioner } from '../lib/serialize.js';

export const spacesRouter = Router();
spacesRouter.use(requireAuth);

spacesRouter.get(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! }, select: { activeDomainKey: true } });
    const [domains, owned] = await Promise.all([
      prisma.domainPack.findMany(),
      prisma.practitionerDomain.findMany({ where: { practitionerId: req.practitionerId! }, select: { domainKey: true } }),
    ]);
    const ownedSet = new Set(['dojo', ...owned.map((o) => o.domainKey)]);
    res.json({
      spaces: domains.map((d) => ({ ...d, owned: ownedSet.has(d.domainKey), active: d.domainKey === p.activeDomainKey })),
    });
  }),
);

spacesRouter.post(
  '/activate',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ domainKey: z.string().min(1).max(40) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid space payload');
    const { domainKey } = parsed.data;
    if (domainKey !== 'dojo') {
      const domain = await prisma.domainPack.findUnique({ where: { domainKey } });
      if (!domain) throw notFound('Domain not found');
      const owned = await prisma.practitionerDomain.findUnique({
        where: { practitionerId_domainKey: { practitionerId: req.practitionerId!, domainKey } },
      });
      if (!owned) throw forbidden('This domain is not yet yours');
    }
    const p = await prisma.practitioner.update({ where: { id: req.practitionerId! }, data: { activeDomainKey: domainKey } });
    res.json({ practitioner: publicPractitioner(p) });
  }),
);

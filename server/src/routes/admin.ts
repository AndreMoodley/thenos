import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin, type AuthedRequest } from '../middleware/auth.js';
import { wrap, notFound } from '../lib/http.js';
import { recomputeHammerCount } from '../lib/reconcile.js';
import { publicPractitioner } from '../lib/serialize.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  '/practitioners',
  wrap(async (_req, res) => {
    const list = await prisma.practitioner.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    res.json({ practitioners: list.map(publicPractitioner) });
  }),
);

adminRouter.get(
  '/practitioner/:id',
  wrap(async (req, res) => {
    const p = await prisma.practitioner.findUnique({ where: { id: req.params.id } });
    if (!p) throw notFound('Practitioner not found');
    const strikeSum = await prisma.strikeEvent.aggregate({ where: { practitionerId: p.id }, _sum: { amount: true } });
    res.json({ practitioner: publicPractitioner(p), strikeSum: strikeSum._sum.amount ?? 0, drift: p.hammerCount - (strikeSum._sum.amount ?? 0) });
  }),
);

// Manual side of invariant #2: recompute hammerCount from the append-only StrikeEvent log.
adminRouter.post(
  '/recompute-hammer/:id',
  wrap(async (req, res) => {
    const exists = await prisma.practitioner.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) throw notFound('Practitioner not found');
    const rec = await prisma.$transaction((tx) => recomputeHammerCount(tx, req.params.id));
    res.json({ ...rec, corrected: rec.drift !== 0 });
  }),
);

adminRouter.post(
  '/reconcile-all',
  wrap(async (_req: AuthedRequest, res) => {
    const ids = await prisma.practitioner.findMany({ select: { id: true } });
    let corrected = 0;
    for (const { id } of ids) {
      const rec = await prisma.$transaction((tx) => recomputeHammerCount(tx, id));
      if (rec.drift !== 0) corrected += 1;
    }
    res.json({ scanned: ids.length, corrected });
  }),
);

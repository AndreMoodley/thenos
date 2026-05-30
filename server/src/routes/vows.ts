import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, notFound, wrap } from '../lib/http.js';
import { publicPractitioner } from '../lib/serialize.js';

export const vowsRouter = Router();
vowsRouter.use(requireAuth);

async function ownedVow(practitionerId: string, vowId: string) {
  const vow = await prisma.vow.findUnique({ where: { id: vowId }, include: { progressions: { orderBy: { orderIndex: 'asc' } } } });
  if (!vow || vow.practitionerId !== practitionerId) throw notFound('Vow not found');
  return vow;
}

vowsRouter.get(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const vows = await prisma.vow.findMany({
      where: { practitionerId: req.practitionerId! },
      orderBy: { resolutionDate: 'asc' },
      include: { progressions: { orderBy: { orderIndex: 'asc' } } },
    });
    res.json({ vows });
  }),
);

vowsRouter.post(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({
      title: z.string().min(1).max(160),
      type: z.enum(['major', 'minor']),
      vowSubtype: z.string().max(60).optional(),
      resolutionDate: z.coerce.date(),
      wagerAmount: z.number().int().min(0).max(100000).default(0),
      progressions: z.array(z.string().min(1).max(200)).max(50).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid vow payload');
    const { title, type, vowSubtype, resolutionDate, wagerAmount, progressions } = parsed.data;
    const vow = await prisma.vow.create({
      data: {
        practitionerId: req.practitionerId!,
        title,
        type,
        vowSubtype,
        resolutionDate,
        wagerAmount,
        wagerStatus: wagerAmount > 0 ? 'pending' : 'none',
        progressions: progressions
          ? { create: progressions.map((text, i) => ({ text, orderIndex: i })) }
          : undefined,
      },
      include: { progressions: { orderBy: { orderIndex: 'asc' } } },
    });
    res.status(201).json({ vow });
  }),
);

vowsRouter.get('/:id', wrap(async (req: AuthedRequest, res) => res.json({ vow: await ownedVow(req.practitionerId!, req.params.id) })));

vowsRouter.put(
  '/:id',
  wrap(async (req: AuthedRequest, res) => {
    await ownedVow(req.practitionerId!, req.params.id);
    const schema = z.object({
      title: z.string().min(1).max(160).optional(),
      resolutionDate: z.coerce.date().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid vow patch');
    const vow = await prisma.vow.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: { progressions: { orderBy: { orderIndex: 'asc' } } },
    });
    res.json({ vow });
  }),
);

vowsRouter.delete(
  '/:id',
  wrap(async (req: AuthedRequest, res) => {
    await ownedVow(req.practitionerId!, req.params.id);
    await prisma.vow.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// Keep a vow. Completing a MAJOR vow becomes a Trophy (derived in the Trophy Hall) and triggers a
// one-time evolution flourish (flagged here; the client plays it).
vowsRouter.post(
  '/:id/keep',
  wrap(async (req: AuthedRequest, res) => {
    const vow = await ownedVow(req.practitionerId!, req.params.id);
    if (vow.status !== 'active') throw badRequest('Vow already resolved');
    const updated = await prisma.vow.update({
      where: { id: vow.id },
      data: {
        status: 'kept',
        resolvedAt: new Date(),
        wagerStatus: vow.wagerStatus === 'pending' ? 'won' : vow.wagerStatus,
      },
      include: { progressions: { orderBy: { orderIndex: 'asc' } } },
    });
    res.json({ vow: updated, flourish: vow.type === 'major' });
  }),
);

// Break a vow → Corruption (desaturated/chained/red-eyed look, resolved not stored). Cleanse via
// 7 full sessions (Penance) or a Purification Talisman (/premium).
vowsRouter.post(
  '/:id/break',
  wrap(async (req: AuthedRequest, res) => {
    const vow = await ownedVow(req.practitionerId!, req.params.id);
    if (vow.status !== 'active') throw badRequest('Vow already resolved');
    const out = await prisma.$transaction(async (tx) => {
      const v = await tx.vow.update({
        where: { id: vow.id },
        data: {
          status: 'broken',
          resolvedAt: new Date(),
          wagerStatus: vow.wagerStatus === 'pending' ? 'lost' : vow.wagerStatus,
        },
      });
      const p = await tx.practitioner.update({
        where: { id: req.practitionerId! },
        data: { corruptedSince: new Date(), penanceProgress: 0 },
      });
      return { v, p };
    });
    res.json({ vow: out.v, practitioner: publicPractitioner(out.p) });
  }),
);

// ── progressions ──────────────────────────────────────────────
vowsRouter.post(
  '/:id/progressions',
  wrap(async (req: AuthedRequest, res) => {
    const vow = await ownedVow(req.practitionerId!, req.params.id);
    const schema = z.object({ text: z.string().min(1).max(200) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid progression');
    const orderIndex = vow.progressions.length;
    const progression = await prisma.progression.create({
      data: { vowId: vow.id, text: parsed.data.text, orderIndex },
    });
    res.status(201).json({ progression });
  }),
);

vowsRouter.put(
  '/:id/progressions/:pid',
  wrap(async (req: AuthedRequest, res) => {
    const vow = await ownedVow(req.practitionerId!, req.params.id);
    const prog = vow.progressions.find((p) => p.id === req.params.pid);
    if (!prog) throw notFound('Progression not found');
    const schema = z.object({ completed: z.boolean().optional(), text: z.string().min(1).max(200).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid progression patch');
    const progression = await prisma.progression.update({ where: { id: prog.id }, data: parsed.data });
    res.json({ progression });
  }),
);

vowsRouter.delete(
  '/:id/progressions/:pid',
  wrap(async (req: AuthedRequest, res) => {
    const vow = await ownedVow(req.practitionerId!, req.params.id);
    const prog = vow.progressions.find((p) => p.id === req.params.pid);
    if (!prog) throw notFound('Progression not found');
    await prisma.progression.delete({ where: { id: prog.id } });
    res.json({ ok: true });
  }),
);

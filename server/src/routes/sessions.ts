import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, notFound, wrap } from '../lib/http.js';
import { logSession } from '../lib/sessionLog.js';
import { recomputeHammerCount } from '../lib/reconcile.js';
import { publicPractitioner } from '../lib/serialize.js';

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

const MODALITIES = ['origin', 'pull', 'push', 'core', 'cardio', 'recovery'] as const;

sessionsRouter.get(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const sessions = await prisma.voidSession.findMany({
      where: { practitionerId: req.practitionerId! },
      orderBy: { occurredOn: 'desc' },
      take,
    });
    res.json({ sessions });
  }),
);

sessionsRouter.post(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({
      modality: z.enum(MODALITIES),
      reps: z.number().int().min(0).max(100000),
      rating: z.number().int().min(1).max(5).optional(),
      note: z.string().max(500).optional(),
      occurredOn: z.coerce.date().optional(),
      clientId: z.string().max(64).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid session payload');

    const result = await prisma.$transaction((tx) => logSession(tx, req.practitionerId!, parsed.data));
    const session = await prisma.voidSession.findUniqueOrThrow({ where: { id: result.sessionId } });
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.status(result.idempotentHit ? 200 : 201).json({
      session,
      practitioner: publicPractitioner(p),
      struck: result.struck,
      crossed: result.crossed,
      cleansed: result.cleansed,
    });
  }),
);

// Deleting a session removes its paired StrikeEvents (a legitimate correction) and reconciles
// hammerCount so the cache still equals the append-only log (invariant #2 stays intact).
sessionsRouter.delete(
  '/:id',
  wrap(async (req: AuthedRequest, res) => {
    const out = await prisma.$transaction(async (tx) => {
      const session = await tx.voidSession.findUnique({ where: { id: req.params.id } });
      if (!session || session.practitionerId !== req.practitionerId!) throw notFound('Session not found');
      await tx.strikeEvent.deleteMany({ where: { sessionId: session.id, practitionerId: req.practitionerId! } });
      await tx.voidSession.delete({ where: { id: session.id } });
      const rec = await recomputeHammerCount(tx, req.practitionerId!);
      return rec;
    });
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.json({ ok: true, hammerCount: out.after, practitioner: publicPractitioner(p) });
  }),
);

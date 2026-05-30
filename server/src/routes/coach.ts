import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, tooMany, wrap } from '../lib/http.js';
import { reflect, promptHashOf, type VoiceContext } from '../lib/voice.js';

export const coachRouter = Router();
coachRouter.use(requireAuth);

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // reuse an identical reflection for 6h
const MIN_GAP_MS = 8_000; // soft per-practitioner rate limit on live model calls
const lastLiveCall = new Map<string, number>();

coachRouter.post(
  '/reflect',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ occasion: z.enum(['rebirth', 'ascension', 'return', 'oracle']).default('return') });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Invalid reflect payload');

    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    const [sessions, leaks, vows] = await Promise.all([
      prisma.voidSession.findMany({ where: { practitionerId: p.id }, orderBy: { occurredOn: 'desc' }, take: 10 }),
      prisma.kiLeak.findMany({ where: { practitionerId: p.id }, orderBy: { occurredAt: 'desc' }, take: 10 }),
      prisma.vow.findMany({ where: { practitionerId: p.id, status: 'active' }, orderBy: { resolutionDate: 'asc' }, take: 10 }),
    ]);

    const ctx: VoiceContext = {
      occasion: parsed.data.occasion,
      name: p.name,
      hammerCount: p.hammerCount,
      ki: p.ki,
      shadowLevel: p.shadowLevel,
      streak: p.streak,
      recentSessions: sessions.map((s) => ({ modality: s.modality, reps: s.reps, occurredOn: s.occurredOn.toISOString() })),
      recentLeaks: leaks.map((l) => ({ category: l.category, cost: l.cost })),
      activeVows: vows.map((v) => ({ title: v.title, resolutionDate: v.resolutionDate.toISOString(), type: v.type })),
    };

    const hash = promptHashOf(ctx);
    // Cache: identical situation → reuse, so we never spam the model.
    const cached = await prisma.coachReflection.findFirst({
      where: { practitionerId: p.id, promptHash: hash, createdAt: { gt: new Date(Date.now() - CACHE_TTL_MS) } },
      orderBy: { createdAt: 'desc' },
    });
    if (cached) return res.json({ reflection: cached.body, source: cached.source, cached: true });

    // Soft rate limit on cache-miss (live) calls.
    const last = lastLiveCall.get(p.id) ?? 0;
    if (Date.now() - last < MIN_GAP_MS) throw tooMany('The Void needs a moment before it speaks again');
    lastLiveCall.set(p.id, Date.now());

    const { body, source } = await reflect(ctx);
    await prisma.coachReflection.create({
      data: { practitionerId: p.id, occasion: ctx.occasion, promptHash: hash, body, source },
    });
    res.json({ reflection: body, source, cached: false });
  }),
);

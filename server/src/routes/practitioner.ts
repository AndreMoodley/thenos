import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, wrap } from '../lib/http.js';
import { publicPractitioner } from '../lib/serialize.js';
import { logSession } from '../lib/sessionLog.js';
import { dispatchPending } from '../lib/eventBus.js';
import { emit } from '../lib/events.js';
import { utcMidnight } from '../lib/protocol.js';
import { dailyContemplation, glyph } from '../lib/iching.js';

export const practitionerRouter = Router();
practitionerRouter.use(requireAuth);

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const MODALITIES = ['origin', 'pull', 'push', 'core', 'cardio', 'recovery'] as const;
const LEAK_CATEGORIES = ['social', 'food', 'media', 'argument', 'validation', 'doubt'] as const;

practitionerRouter.get(
  '/me',
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.json({ practitioner: publicPractitioner(p) });
  }),
);

practitionerRouter.patch(
  '/me',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ name: z.string().min(1).max(80).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid practitioner patch');
    const p = await prisma.practitioner.update({
      where: { id: req.practitionerId! },
      data: { ...parsed.data },
    });
    res.json({ practitioner: publicPractitioner(p) });
  }),
);

// Log training. reps:0 ⇒ recovery/stillness ⇒ no strike (invariant #3).
practitionerRouter.post(
  '/me/strike',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({
      modality: z.enum(MODALITIES),
      reps: z.number().int().min(0).max(100000),
      rating: z.number().int().min(1).max(5).optional(),
      note: z.string().max(500).optional(),
      occurredOn: z.coerce.date().optional(),
      clientId: z.string().max(64).optional(),
      plannedSessionId: z.string().max(64).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid strike payload');

    const result = await prisma.$transaction((tx) => logSession(tx, req.practitionerId!, parsed.data));
    const { unlocked } = await dispatchPending(prisma, { practitionerId: req.practitionerId! });
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.status(201).json({
      practitioner: publicPractitioner(p),
      struck: result.struck,
      crossed: result.crossed,
      cleansed: result.cleansed,
      sessionId: result.sessionId,
      fulfilledPlanned: result.fulfilledPlanned,
      unlockedChapters: unlocked,
    });
  }),
);

// Temporal Anchor — daily ritual that preserves the streak.
practitionerRouter.post(
  '/me/anchor',
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.update({
      where: { id: req.practitionerId! },
      data: { anchorCompletedAt: new Date(), dormantSince: null },
    });
    res.json({ practitioner: publicPractitioner(p) });
  }),
);

// Seal ki — a deliberate consolidation. reps:0 act: raises integrity, never strikes.
practitionerRouter.post(
  '/me/seal',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ amount: z.number().int().min(1).max(20).default(5) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Invalid seal payload');
    const cur = await prisma.practitioner.findUniqueOrThrow({
      where: { id: req.practitionerId! },
      select: { ki: true },
    });
    const p = await prisma.practitioner.update({
      where: { id: req.practitionerId! },
      data: { ki: clamp(cur.ki + parsed.data.amount, 0, 100), dormantSince: null },
    });
    res.json({ practitioner: publicPractitioner(p) });
  }),
);

practitionerRouter.get(
  '/me/leaks',
  wrap(async (req: AuthedRequest, res) => {
    const leaks = await prisma.kiLeak.findMany({
      where: { practitionerId: req.practitionerId! },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });
    res.json({ leaks });
  }),
);

// Ki Leak — debits the ki bar. Daily drain is uncapped here (Ki Sentinel companion caps it elsewhere).
practitionerRouter.post(
  '/me/leaks',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({
      category: z.enum(LEAK_CATEGORIES),
      label: z.string().min(1).max(120),
      cost: z.number().int().min(1).max(100),
      clientId: z.string().max(64).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid leak payload');

    const result = await prisma.$transaction(async (tx) => {
      if (parsed.data.clientId) {
        const dup = await tx.kiLeak.findUnique({
          where: { practitionerId_clientId: { practitionerId: req.practitionerId!, clientId: parsed.data.clientId } },
        });
        if (dup) return tx.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
      }
      await tx.kiLeak.create({
        data: {
          practitionerId: req.practitionerId!,
          category: parsed.data.category,
          label: parsed.data.label,
          cost: parsed.data.cost,
          clientId: parsed.data.clientId ?? null,
        },
      });
      const cur = await tx.practitioner.findUniqueOrThrow({
        where: { id: req.practitionerId! },
        select: { ki: true },
      });
      return tx.practitioner.update({
        where: { id: req.practitionerId! },
        data: { ki: clamp(cur.ki - parsed.data.cost, 0, 100) },
      });
    });
    res.status(201).json({ practitioner: publicPractitioner(result) });
  }),
);

// ── The Inner Study (meditation via the I Ching) ─────────────────────────────────────────────
// A reps:0 act: it NEVER strikes and never touches hammerCount/realm (invariants #1–#3). The day's
// hexagram is server-derived & deterministic. The first sitting of the day restores a little ki
// (clarity) and deepens presence via the Contemplated event; later sittings the same day are
// reflection-only. Subtle, once-a-day — no clarity faucet.
const MEDITATION_KI_GAIN = 8;

practitionerRouter.post(
  '/me/meditate',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ note: z.string().max(500).optional() });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Invalid meditation payload');
    const pid = req.practitionerId!;
    const now = new Date();
    const today = utcMidnight(now);
    const draw = dailyContemplation(`${pid}:${today.toISOString().slice(0, 10)}`);

    let out: { contemplation: any; kiGain: number; alreadyToday: boolean };
    try {
      out = await prisma.$transaction(async (tx) => {
        const existing = await tx.contemplation.findUnique({ where: { practitionerId_day: { practitionerId: pid, day: today } } });
        if (existing) return { contemplation: existing, kiGain: 0, alreadyToday: true };
        const cur = await tx.practitioner.findUniqueOrThrow({ where: { id: pid }, select: { ki: true } });
        const kiGain = clamp(cur.ki + MEDITATION_KI_GAIN, 0, 100) - cur.ki;
        const contemplation = await tx.contemplation.create({
          data: {
            practitionerId: pid,
            hexagram: draw.primary.n,
            changing: draw.changing,
            transformed: draw.transformed.n,
            note: parsed.data.note ?? null,
            kiGain,
            day: today,
          },
        });
        await tx.practitioner.update({ where: { id: pid }, data: { ki: cur.ki + kiGain, dormantSince: null } });
        await emit(tx, { type: 'Contemplated', practitionerId: pid, hexagram: draw.primary.n, occurredOn: now.toISOString() });
        return { contemplation, kiGain, alreadyToday: false };
      });
    } catch (e) {
      // Lost a same-day race (unique [practitionerId, day]) — treat as already meditated today.
      if ((e as { code?: string })?.code !== 'P2002') throw e;
      const existing = await prisma.contemplation.findUniqueOrThrow({ where: { practitionerId_day: { practitionerId: pid, day: today } } });
      out = { contemplation: existing, kiGain: 0, alreadyToday: true };
    }

    const [wisdom, p] = await Promise.all([
      prisma.contemplation.count({ where: { practitionerId: pid } }),
      prisma.practitioner.findUniqueOrThrow({ where: { id: pid } }),
    ]);
    res.status(out.alreadyToday ? 200 : 201).json({
      hexagram: { ...draw.primary, glyph: glyph(draw.primary.n) },
      changing: draw.changing,
      transformed: { ...draw.transformed, glyph: glyph(draw.transformed.n) },
      contemplation: out.contemplation,
      kiGain: out.kiGain,
      alreadyToday: out.alreadyToday,
      wisdom,
      practitioner: publicPractitioner(p),
    });
  }),
);

// Today's contemplation — backs a subtle "Today's Contemplation" line on the Domain. No side effects.
practitionerRouter.get(
  '/me/contemplation',
  wrap(async (req: AuthedRequest, res) => {
    const pid = req.practitionerId!;
    const today = utcMidnight(new Date());
    const draw = dailyContemplation(`${pid}:${today.toISOString().slice(0, 10)}`);
    const [sat, wisdom] = await Promise.all([
      prisma.contemplation.findUnique({ where: { practitionerId_day: { practitionerId: pid, day: today } }, select: { id: true } }),
      prisma.contemplation.count({ where: { practitionerId: pid } }),
    ]);
    res.json({
      hexagram: { ...draw.primary, glyph: glyph(draw.primary.n) },
      changing: draw.changing,
      transformed: { ...draw.transformed, glyph: glyph(draw.transformed.n) },
      satToday: !!sat,
      wisdom,
    });
  }),
);

// Trials — the forged path (goal → generated periodized plan). Progression, therefore FREE:
// nothing here touches crystals or IAP (invariant #15). Plan generation is server-
// authoritative (online-only, like gacha); completing quests happens through real sessions
// (/sessions, /practitioner/me/strike, /sync/flush) — never through this router.

import { Router } from 'express';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, notFound, wrap } from '../lib/http.js';
import { serializeTrial } from '../lib/serialize.js';
import {
  regenerateFrom,
  scheduledDateFor,
  weekIndexFor,
  canMove,
  utcMidnight,
} from '../lib/protocol.js';
import { summarizeWeeks, proposeRealignments } from '../lib/adherence.js';
import { createTrialTx, completeTrialTx, protocolParamsOf } from '../lib/trialOps.js';

export const trialsRouter = Router();
trialsRouter.use(requireAuth);

const DAY_MS = 24 * 60 * 60 * 1000;

async function ownedTrial(practitionerId: string, trialId: string) {
  const trial = await prisma.trial.findUnique({ where: { id: trialId } });
  if (!trial || trial.practitionerId !== practitionerId) throw notFound('Trial not found');
  return trial;
}

trialsRouter.get(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const trials = await prisma.trial.findMany({
      where: { practitionerId: req.practitionerId! },
      orderBy: { createdAt: 'desc' },
      include: { plannedSessions: { orderBy: { scheduledOn: 'asc' } } },
    });
    res.json({
      trials: trials.map((t) => serializeTrial(t, t.plannedSessions)),
    });
  }),
);

const createSchema = z.object({
  title: z.string().min(1).max(160),
  goalKind: z.enum(['breakthrough', 'open_path']),
  goalLabel: z.string().max(120).optional(),
  focusModality: z.enum(['origin', 'pull', 'push', 'core', 'cardio', 'recovery']),
  experience: z.enum(['novice', 'practiced', 'seasoned']),
  ability: z.object({ baselineReps: z.number().int().min(5).max(2000) }),
  sessionsPerWeek: z.number().int().min(2).max(6),
  pillarDay: z.number().int().min(0).max(6),
  volumeDial: z.number().int().min(1).max(5),
  difficultyDial: z.number().int().min(1).max(5),
  totalWeeks: z.number().int().min(4).max(26),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  wagerAmount: z.number().int().min(0).max(100000).default(0),
});

trialsRouter.post(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid trial payload');
    const pid = req.practitionerId!;
    const now = new Date();
    if (parsed.data.startDate) {
      const d = Math.round((utcMidnight(parsed.data.startDate).getTime() - utcMidnight(now).getTime()) / DAY_MS);
      if (d < -6 || d > 28) throw badRequest('A trial starts this week or within the next four');
    }

    const out = await prisma.$transaction(async (tx) => {
      const active = await tx.trial.findFirst({ where: { practitionerId: pid, status: 'active' } });
      if (active) throw badRequest('One path at a time — complete or release the active trial first');
      return createTrialTx(tx, pid, parsed.data, now);
    });

    const planned = await prisma.plannedSession.findMany({
      where: { trialId: out.trial.id },
      orderBy: { scheduledOn: 'asc' },
    });
    res.status(201).json({ ...serializeTrial(out.trial, planned), unlockedChapters: out.unlockedChapters });
  }),
);

trialsRouter.get(
  '/active',
  wrap(async (req: AuthedRequest, res) => {
    const pid = req.practitionerId!;
    const trial = await prisma.trial.findFirst({
      where: { practitionerId: pid, status: 'active' },
      include: {
        plannedSessions: { orderBy: { scheduledOn: 'asc' } },
        realignments: { where: { status: 'proposed' }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!trial) return res.json({ trial: null, plannedSessions: [], realignments: [] });
    res.json(serializeTrial(trial, trial.plannedSessions, trial.realignments));
  }),
);

const regenSchema = z.object({
  sessionsPerWeek: z.number().int().min(2).max(6).optional(),
  pillarDay: z.number().int().min(0).max(6).optional(),
  volumeDial: z.number().int().min(1).max(5).optional(),
  difficultyDial: z.number().int().min(1).max(5).optional(),
});

type Tx = Prisma.TransactionClient | PrismaClient;

/** Re-lay the path from NEXT week. The past and anything already fulfilled are immutable. */
async function regenerateFutureTx(tx: Tx, trialId: string, practitionerId: string, now: Date) {
  const trial = await tx.trial.findUniqueOrThrow({ where: { id: trialId } });
  const fromWeek = Math.max(0, weekIndexFor(trial.startDate, now) + 1);
  if (fromWeek >= trial.totalWeeks) return trial; // nothing left to re-lay
  const boundary = scheduledDateFor(trial.startDate, fromWeek, 0);
  await tx.plannedSession.deleteMany({
    where: { trialId, fulfilledBySessionId: null, scheduledOn: { gte: boundary } },
  });
  const drafts = regenerateFrom(protocolParamsOf(trial), fromWeek);
  await tx.plannedSession.createMany({
    data: drafts.map((d) => ({
      trialId,
      practitionerId,
      scheduledOn: scheduledDateFor(trial.startDate, d.weekIndex, d.dayOfWeek),
      kind: d.kind,
      modality: d.modality,
      targetReps: d.targetReps,
      title: d.title,
    })),
  });
  return trial;
}

trialsRouter.post(
  '/:id/regenerate',
  wrap(async (req: AuthedRequest, res) => {
    const trial = await ownedTrial(req.practitionerId!, req.params.id);
    if (trial.status !== 'active') throw badRequest('Only an active trial can be re-laid');
    const parsed = regenSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Invalid trial preferences');
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.trial.update({ where: { id: trial.id }, data: parsed.data });
      return regenerateFutureTx(tx, trial.id, req.practitionerId!, now);
    });

    const planned = await prisma.plannedSession.findMany({
      where: { trialId: trial.id },
      orderBy: { scheduledOn: 'asc' },
    });
    const fresh = await prisma.trial.findUniqueOrThrow({ where: { id: updated.id } });
    res.json(serializeTrial(fresh, planned));
  }),
);

trialsRouter.post(
  '/:id/sessions/:psId/move',
  wrap(async (req: AuthedRequest, res) => {
    const trial = await ownedTrial(req.practitionerId!, req.params.id);
    const schema = z.object({ scheduledOn: z.coerce.date() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid move payload');
    const ps = await prisma.plannedSession.findUnique({ where: { id: req.params.psId } });
    if (!ps || ps.trialId !== trial.id) throw notFound('Quest not found');
    if (ps.fulfilledBySessionId) throw badRequest('A fulfilled quest is history — it does not move');
    const newDate = utcMidnight(parsed.data.scheduledOn);
    if (!canMove(ps.scheduledOn, newDate, trial.startDate, new Date())) {
      throw badRequest('A quest may move within its week or one adjacent, never into the past');
    }
    const moved = await prisma.plannedSession.update({ where: { id: ps.id }, data: { scheduledOn: newDate } });
    res.json({ plannedSession: moved });
  }),
);

trialsRouter.post(
  '/:id/complete',
  wrap(async (req: AuthedRequest, res) => {
    const trial = await ownedTrial(req.practitionerId!, req.params.id);
    if (trial.status !== 'active') throw badRequest('Trial already resolved');
    const schema = z.object({ chain: z.boolean().default(true) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Invalid complete payload');

    const out = await prisma.$transaction((tx) =>
      completeTrialTx(tx, req.practitionerId!, trial, { chain: parsed.data.chain }),
    );
    res.json({
      trial: out.trial,
      flourish: out.flourish,
      chained: out.chained,
      unlockedChapters: out.unlockedChapters,
    });
  }),
);

// Abandoning a trial is a re-planning act, not a failure: the linked vow is CANCELLED,
// never broken — no corruption for choosing a different path.
trialsRouter.delete(
  '/:id',
  wrap(async (req: AuthedRequest, res) => {
    const trial = await ownedTrial(req.practitionerId!, req.params.id);
    if (trial.status !== 'active') throw badRequest('Trial already resolved');
    const out = await prisma.$transaction(async (tx) => {
      const t = await tx.trial.update({ where: { id: trial.id }, data: { status: 'abandoned' } });
      if (trial.vowId) {
        const vow = await tx.vow.findUnique({ where: { id: trial.vowId } });
        if (vow && vow.status === 'active') {
          await tx.vow.update({ where: { id: vow.id }, data: { status: 'cancelled', resolvedAt: new Date() } });
        }
      }
      return t;
    });
    res.json({ trial: out });
  }),
);

// ── realignments — suggest-only adaptation (invariant #14) ────

trialsRouter.post(
  '/:id/realignments/check',
  wrap(async (req: AuthedRequest, res) => {
    const trial = await ownedTrial(req.practitionerId!, req.params.id);
    if (trial.status !== 'active') throw badRequest('Only an active trial reads its meridians');
    const pid = req.practitionerId!;
    const now = new Date();

    const existing = await prisma.trialRealignment.findMany({
      where: { trialId: trial.id, status: 'proposed' },
      orderBy: { createdAt: 'desc' },
    });
    // Soft limit: at most one NEW proposal per UTC day — the Reading is a ritual, not a nag.
    const today = utcMidnight(now);
    const proposedToday = await prisma.trialRealignment.findFirst({
      where: { trialId: trial.id, createdAt: { gte: today } },
    });
    if (proposedToday) return res.json({ realignments: existing, created: false });

    const [planned, sessions] = await Promise.all([
      prisma.plannedSession.findMany({ where: { trialId: trial.id } }),
      prisma.voidSession.findMany({
        where: { practitionerId: pid, occurredOn: { gte: trial.startDate } },
        orderBy: { occurredOn: 'desc' },
        take: 500,
      }),
    ]);
    const summaries = summarizeWeeks(trial, planned, sessions, now);
    const drafts = proposeRealignments(trial, summaries, sessions, now);
    const fresh = drafts.filter((d) => !existing.some((e) => e.kind === d.kind));
    if (fresh.length === 0) return res.json({ realignments: existing, created: false });

    const created = await prisma.trialRealignment.create({
      data: {
        trialId: trial.id,
        practitionerId: pid,
        kind: fresh[0]!.kind,
        reason: fresh[0]!.reason,
        payload: fresh[0]!.payload as Prisma.InputJsonValue,
      },
    });
    res.json({ realignments: [created, ...existing], created: true });
  }),
);

trialsRouter.post(
  '/:id/realignments/:rid/accept',
  wrap(async (req: AuthedRequest, res) => {
    const trial = await ownedTrial(req.practitionerId!, req.params.id);
    if (trial.status !== 'active') throw badRequest('Trial already resolved');
    const r = await prisma.trialRealignment.findUnique({ where: { id: req.params.rid } });
    if (!r || r.trialId !== trial.id) throw notFound('Realignment not found');
    if (r.status !== 'proposed') throw badRequest('Realignment already resolved');
    const pid = req.practitionerId!;
    const now = new Date();
    const payload = (r.payload ?? {}) as { volumeDelta?: number; difficultyDelta?: number; shiftRemaining?: boolean };

    await prisma.$transaction(async (tx) => {
      const clampDial = (n: number) => Math.max(1, Math.min(5, n));
      if (payload.volumeDelta || payload.difficultyDelta) {
        await tx.trial.update({
          where: { id: trial.id },
          data: {
            volumeDial: clampDial(trial.volumeDial + (payload.volumeDelta ?? 0)),
            difficultyDial: clampDial(trial.difficultyDial + (payload.difficultyDelta ?? 0)),
          },
        });
        await regenerateFutureTx(tx, trial.id, pid, now);
      }
      if (payload.shiftRemaining) {
        // Re-lay this week's slipped quests onto the days still ahead (same or next week).
        const weekStart = scheduledDateFor(trial.startDate, Math.max(0, weekIndexFor(trial.startDate, now)), 0);
        const slipped = await tx.plannedSession.findMany({
          where: { trialId: trial.id, fulfilledBySessionId: null, scheduledOn: { gte: weekStart, lt: utcMidnight(now) } },
          orderBy: { scheduledOn: 'asc' },
        });
        const taken = new Set(
          (
            await tx.plannedSession.findMany({
              where: { trialId: trial.id, scheduledOn: { gte: utcMidnight(now) } },
              select: { scheduledOn: true },
            })
          ).map((x) => x.scheduledOn.getTime()),
        );
        let cursor = utcMidnight(now).getTime();
        for (const q of slipped) {
          while (taken.has(cursor)) cursor += DAY_MS;
          const target = new Date(cursor);
          if (!canMove(q.scheduledOn, target, trial.startDate, now)) continue; // never beyond the adjacent week
          await tx.plannedSession.update({ where: { id: q.id }, data: { scheduledOn: target } });
          taken.add(cursor);
        }
      }
      await tx.trialRealignment.update({
        where: { id: r.id },
        data: { status: 'accepted', resolvedAt: now },
      });
    });

    const fresh = await prisma.trial.findUniqueOrThrow({ where: { id: trial.id } });
    const planned = await prisma.plannedSession.findMany({ where: { trialId: trial.id }, orderBy: { scheduledOn: 'asc' } });
    res.json(serializeTrial(fresh, planned));
  }),
);

trialsRouter.post(
  '/:id/realignments/:rid/dismiss',
  wrap(async (req: AuthedRequest, res) => {
    const trial = await ownedTrial(req.practitionerId!, req.params.id);
    const r = await prisma.trialRealignment.findUnique({ where: { id: req.params.rid } });
    if (!r || r.trialId !== trial.id) throw notFound('Realignment not found');
    if (r.status !== 'proposed') throw badRequest('Realignment already resolved');
    const updated = await prisma.trialRealignment.update({
      where: { id: r.id },
      data: { status: 'dismissed', resolvedAt: new Date() },
    });
    res.json({ realignment: updated });
  }),
);

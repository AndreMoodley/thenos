import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, wrap } from '../lib/http.js';
import { logSession } from '../lib/sessionLog.js';
import { publicPractitioner, serializeTrial, serializeSaga } from '../lib/serialize.js';
import { realmForHammerCount } from '../lib/realms.js';
import { utcMidnight, canMove } from '../lib/protocol.js';

export const syncRouter = Router();
syncRouter.use(requireAuth);

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Offline mutation queue. Server-authoritative systems (currency, ownership, gacha, and the
// trial/saga GENERATORS) are NOT accepted here — only effort/intent that is safe to replay
// idempotently: sessions/leaks by clientId, plan_move/soul_profile as absolute-sets.
const mutationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('session'),
    clientId: z.string().min(1).max(64),
    modality: z.enum(['origin', 'pull', 'push', 'core', 'cardio', 'recovery']),
    reps: z.number().int().min(0).max(100000),
    rating: z.number().int().min(1).max(5).optional(),
    note: z.string().max(500).optional(),
    occurredOn: z.coerce.date().optional(),
    plannedSessionId: z.string().max(64).optional(),
  }),
  z.object({
    kind: z.literal('leak'),
    clientId: z.string().min(1).max(64),
    category: z.enum(['social', 'food', 'media', 'argument', 'validation', 'doubt']),
    label: z.string().min(1).max(120),
    cost: z.number().int().min(1).max(100),
  }),
  z.object({ kind: z.literal('anchor'), clientId: z.string().min(1).max(64), occurredOn: z.coerce.date().optional() }),
  z.object({ kind: z.literal('seal'), clientId: z.string().min(1).max(64), amount: z.number().int().min(1).max(20) }),
  z.object({
    kind: z.literal('plan_move'),
    clientId: z.string().min(1).max(64),
    plannedSessionId: z.string().min(1).max(64),
    scheduledOn: z.coerce.date(),
  }),
  z.object({
    kind: z.literal('soul_profile'),
    clientId: z.string().min(1).max(64),
    currentSelf: z.string().min(1).max(400),
    higherSelf: z.string().min(1).max(400),
    outcome: z.string().min(1).max(400),
    obstacleCategory: z.enum(['social', 'food', 'media', 'argument', 'validation', 'doubt']),
    obstacleName: z.string().min(1).max(60),
    obstacleDetail: z.string().min(1).max(400),
    wardPlan: z.string().min(1).max(400),
    styleKey: z.string().max(32).optional(),
  }),
]);

syncRouter.post(
  '/flush',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ mutations: z.array(mutationSchema).max(200) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid sync batch');
    const pid = req.practitionerId!;
    const results: any[] = [];

    for (const m of parsed.data.mutations) {
      try {
        if (m.kind === 'session') {
          const r = await prisma.$transaction((tx) => logSession(tx, pid, { ...m, clientId: m.clientId }));
          results.push({
            clientId: m.clientId,
            ok: true,
            struck: r.struck,
            crossed: r.crossed,
            idempotent: r.idempotentHit,
            fulfilledPlanned: r.fulfilledPlanned,
            unlockedChapters: r.unlockedChapters,
          });
        } else if (m.kind === 'plan_move') {
          // Absolute-set: replaying the same move is a no-op. An impossible move (date now
          // past, quest fulfilled meanwhile) reports ok:false and the client drops it.
          const ps = await prisma.plannedSession.findUnique({
            where: { id: m.plannedSessionId },
            include: { trial: { select: { startDate: true, status: true } } },
          });
          const newDate = utcMidnight(m.scheduledOn);
          if (!ps || ps.practitionerId !== pid || ps.trial.status !== 'active') {
            results.push({ clientId: m.clientId, ok: false, error: 'quest not found' });
          } else if (ps.scheduledOn.getTime() === newDate.getTime()) {
            results.push({ clientId: m.clientId, ok: true, idempotent: true });
          } else if (ps.fulfilledBySessionId || !canMove(ps.scheduledOn, newDate, ps.trial.startDate, new Date())) {
            results.push({ clientId: m.clientId, ok: false, error: 'move no longer possible' });
          } else {
            await prisma.plannedSession.update({ where: { id: ps.id }, data: { scheduledOn: newDate } });
            results.push({ clientId: m.clientId, ok: true });
          }
        } else if (m.kind === 'soul_profile') {
          const { kind: _k, clientId: _c, ...fields } = m;
          await prisma.soulProfile.upsert({
            where: { practitionerId: pid },
            update: fields,
            create: { practitionerId: pid, ...fields },
          });
          results.push({ clientId: m.clientId, ok: true });
        } else if (m.kind === 'leak') {
          await prisma.$transaction(async (tx) => {
            const dup = await tx.kiLeak.findUnique({ where: { practitionerId_clientId: { practitionerId: pid, clientId: m.clientId } } });
            if (dup) return;
            await tx.kiLeak.create({ data: { practitionerId: pid, category: m.category, label: m.label, cost: m.cost, clientId: m.clientId } });
            const cur = await tx.practitioner.findUniqueOrThrow({ where: { id: pid }, select: { ki: true } });
            await tx.practitioner.update({ where: { id: pid }, data: { ki: clamp(cur.ki - m.cost, 0, 100) } });
          });
          results.push({ clientId: m.clientId, ok: true });
        } else if (m.kind === 'anchor') {
          await prisma.practitioner.update({ where: { id: pid }, data: { anchorCompletedAt: m.occurredOn ?? new Date(), dormantSince: null } });
          results.push({ clientId: m.clientId, ok: true });
        } else if (m.kind === 'seal') {
          const cur = await prisma.practitioner.findUniqueOrThrow({ where: { id: pid }, select: { ki: true } });
          await prisma.practitioner.update({ where: { id: pid }, data: { ki: clamp(cur.ki + m.amount, 0, 100) } });
          results.push({ clientId: m.clientId, ok: true });
        }
      } catch (e: any) {
        results.push({ clientId: (m as any).clientId, ok: false, error: e?.message ?? 'failed' });
      }
    }

    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: pid } });
    res.json({ results, practitioner: publicPractitioner(p) });
  }),
);

// Snapshot for client hydration on reconnect (last-write-wins reconcile is by practitioner.updatedAt).
syncRouter.get(
  '/state',
  wrap(async (req: AuthedRequest, res) => {
    const pid = req.practitionerId!;
    const [p, sessions, vows, leaks, trial, saga, soulProfile] = await Promise.all([
      prisma.practitioner.findUniqueOrThrow({ where: { id: pid }, include: { entity: true, bond: true } }),
      prisma.voidSession.findMany({ where: { practitionerId: pid }, orderBy: { occurredOn: 'desc' }, take: 50 }),
      prisma.vow.findMany({ where: { practitionerId: pid }, include: { progressions: true }, orderBy: { resolutionDate: 'asc' } }),
      prisma.kiLeak.findMany({ where: { practitionerId: pid }, orderBy: { occurredAt: 'desc' }, take: 50 }),
      // COMPLETE payloads, not pages — the Quest Log and Chronicle must render offline
      // from this snapshot alone (invariant #6).
      prisma.trial.findFirst({
        where: { practitionerId: pid, status: 'active' },
        include: {
          plannedSessions: { orderBy: { scheduledOn: 'asc' } },
          realignments: { where: { status: 'proposed' }, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.saga.findFirst({
        where: { practitionerId: pid, status: { in: ['active', 'completed'] } },
        orderBy: { createdAt: 'desc' },
        include: { chapters: { orderBy: { index: 'asc' } } },
      }),
      prisma.soulProfile.findUnique({ where: { practitionerId: pid } }),
    ]);
    res.json({
      practitioner: publicPractitioner(p),
      realm: realmForHammerCount(p.hammerCount),
      sessions,
      vows,
      leaks,
      bond: p.bond,
      trial: trial ? serializeTrial(trial, trial.plannedSessions, trial.realignments) : null,
      saga: saga ? serializeSaga(saga) : null,
      soulProfile,
      serverTime: new Date().toISOString(),
    });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, wrap } from '../lib/http.js';
import { logSession } from '../lib/sessionLog.js';
import { publicPractitioner } from '../lib/serialize.js';
import { realmForHammerCount } from '../lib/realms.js';

export const syncRouter = Router();
syncRouter.use(requireAuth);

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Offline mutation queue. Server-authoritative systems (currency, ownership, gacha) are NOT
// accepted here — only effort/intent that is safe to replay idempotently by clientId.
const mutationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('session'),
    clientId: z.string().min(1).max(64),
    modality: z.enum(['origin', 'pull', 'push', 'core', 'cardio', 'recovery']),
    reps: z.number().int().min(0).max(100000),
    rating: z.number().int().min(1).max(5).optional(),
    note: z.string().max(500).optional(),
    occurredOn: z.coerce.date().optional(),
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
          results.push({ clientId: m.clientId, ok: true, struck: r.struck, crossed: r.crossed, idempotent: r.idempotentHit });
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
    const [p, sessions, vows, leaks] = await Promise.all([
      prisma.practitioner.findUniqueOrThrow({ where: { id: pid }, include: { entity: true, bond: true } }),
      prisma.voidSession.findMany({ where: { practitionerId: pid }, orderBy: { occurredOn: 'desc' }, take: 50 }),
      prisma.vow.findMany({ where: { practitionerId: pid }, include: { progressions: true }, orderBy: { resolutionDate: 'asc' } }),
      prisma.kiLeak.findMany({ where: { practitionerId: pid }, orderBy: { occurredAt: 'desc' }, take: 50 }),
    ]);
    res.json({
      practitioner: publicPractitioner(p),
      realm: realmForHammerCount(p.hammerCount),
      sessions,
      vows,
      leaks,
      bond: p.bond,
      serverTime: new Date().toISOString(),
    });
  }),
);

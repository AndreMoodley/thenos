import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, conflict, forbidden, notFound, wrap } from '../lib/http.js';
import { summon, disclosedRates } from '../lib/gacha.js';
import { utcMidnight } from '../lib/protocol.js';

export const companionsRouter = Router();
companionsRouter.use(requireAuth);

// Abyssal scrolls are premium; here they cost crystals (server-authoritative). In production a real
// Abyssal Scroll is an IAP consumable verified via /premium before the summon executes.
const ABYSSAL_COST_CRYSTALS = 160;
const DAILY_LESSER_CAP = 10; // free Lesser summons per UTC day — caps the faucet (audit H2)

companionsRouter.get(
  '/',
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.findUniqueOrThrow({
      where: { id: req.practitionerId! },
      include: { entity: true },
    });
    const [catalog, owned] = await Promise.all([
      prisma.companion.findMany(),
      prisma.practitionerCompanion.findMany({ where: { practitionerId: req.practitionerId! }, select: { companionKey: true } }),
    ]);
    const ownedSet = new Set(owned.map((o) => o.companionKey));
    res.json({
      companions: catalog.map((c) => ({ ...c, owned: ownedSet.has(c.companionKey) })),
      active: p.entity?.activeCompanionId ?? null,
      rates: disclosedRates(), // odds disclosure
      pity: {
        pullsSinceAncient: p.pullsSinceAncient,
        pullsSinceHerald: p.pullsSinceHerald,
      },
    });
  }),
);

// Server RNG only. Never resolves offline (invariant #6/#8). Pity is server-authoritative.
companionsRouter.post(
  '/summon',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ scrollType: z.enum(['lesser', 'abyssal']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid summon payload');
    const { scrollType } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      if (scrollType === 'abyssal') {
        const p = await tx.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! }, select: { crystals: true } });
        if (p.crystals < ABYSSAL_COST_CRYSTALS) throw forbidden('Not enough Void Crystals for an Abyssal Scroll');
        await tx.practitioner.update({ where: { id: req.practitionerId! }, data: { crystals: { decrement: ABYSSAL_COST_CRYSTALS } } });
      } else {
        // Free Lesser Scrolls are daily-capped so they can't be scripted into a faucet (audit H2).
        const usedToday = await tx.companionSummon.count({
          where: { practitionerId: req.practitionerId!, scrollType: 'lesser', createdAt: { gte: utcMidnight(new Date()) } },
        });
        if (usedToday >= DAILY_LESSER_CAP) {
          throw forbidden(`Daily free summons spent (${DAILY_LESSER_CAP}/day) — return tomorrow or use an Abyssal Scroll`);
        }
      }
      return summon(tx, req.practitionerId!, scrollType);
    });

    const companion = await prisma.companion.findUniqueOrThrow({ where: { companionKey: result.companionKey } });
    res.status(201).json({ result, companion });
  }),
);

companionsRouter.post(
  '/activate',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ companionKey: z.string().min(1).max(80) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid activate payload');
    const owned = await prisma.practitionerCompanion.findUnique({
      where: { practitionerId_companionKey: { practitionerId: req.practitionerId!, companionKey: parsed.data.companionKey } },
    });
    if (!owned) throw forbidden('You have not summoned this companion');
    await prisma.practitionerEntity.upsert({
      where: { practitionerId: req.practitionerId! },
      update: { activeCompanionId: parsed.data.companionKey },
      create: { practitionerId: req.practitionerId!, activeCompanionId: parsed.data.companionKey },
    });
    res.json({ ok: true, active: parsed.data.companionKey });
  }),
);

import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, forbidden, notFound, wrap } from '../lib/http.js';
import { publicPractitioner } from '../lib/serialize.js';
import { emit } from '../lib/events.js';
import { utcMidnight } from '../lib/protocol.js';
import { wagerCriterionSchema, evaluateWager } from '../lib/wager.js';

export const premiumRouter = Router();
premiumRouter.use(requireAuth);

// Map an entitlement kind to its ownership join table. forms/domains/bloodlines/cosmetics =
// non-consumable entitlements (restorable). Calling reconcile again = Restore Purchases.
async function grantEntitlement(practitionerId: string, kind: string, productKey: string) {
  await prisma.entitlement.upsert({
    where: { practitionerId_kind_productKey: { practitionerId, kind: kind as any, productKey } },
    update: {},
    create: { practitionerId, kind: kind as any, productKey },
  });
  if (kind === 'form') {
    await prisma.practitionerForm.upsert({
      where: { practitionerId_formKey: { practitionerId, formKey: productKey } },
      update: {},
      create: { practitionerId, formKey: productKey },
    });
  } else if (kind === 'domain') {
    await prisma.practitionerDomain.upsert({
      where: { practitionerId_domainKey: { practitionerId, domainKey: productKey } },
      update: {},
      create: { practitionerId, domainKey: productKey },
    });
  } else if (kind === 'bloodline') {
    await prisma.practitionerBloodline.upsert({
      where: { practitionerId_bloodlineKey: { practitionerId, bloodlineKey: productKey } },
      update: {},
      create: { practitionerId, bloodlineKey: productKey },
    });
  } else if (kind === 'cosmetic' || kind === 'aura' || kind === 'artifact') {
    await prisma.practitionerCosmetic.upsert({
      where: { practitionerId_cosmeticItemId: { practitionerId, cosmeticItemId: productKey } },
      update: {},
      create: { practitionerId, cosmeticItemId: productKey },
    });
  }
}

// Verified-purchase reconcile (RevenueCat). Idempotent → also serves Restore Purchases.
// Crystals are the only consumable: server-authoritative, never expiring.
premiumRouter.post(
  '/reconcile',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({
      entitlements: z
        .array(z.object({ kind: z.enum(['form', 'domain', 'bloodline', 'cosmetic', 'aura', 'artifact']), productKey: z.string().min(1).max(80) }))
        .default([]),
      consumables: z.array(z.object({ productKey: z.string().max(80), crystals: z.number().int().min(0).max(100000) })).default([]),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Invalid reconcile payload');

    for (const e of parsed.data.entitlements) await grantEntitlement(req.practitionerId!, e.kind, e.productKey);
    const crystalTotal = parsed.data.consumables.reduce((s, c) => s + c.crystals, 0);
    if (crystalTotal > 0) {
      await prisma.practitioner.update({ where: { id: req.practitionerId! }, data: { crystals: { increment: crystalTotal } } });
    }
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.json({ practitioner: publicPractitioner(p), grantedCrystals: crystalTotal });
  }),
);

// ── Soul Escrow ───────────────────────────────────────────────
// Wagered Ki (crystals) is fully server-authoritative. Heavenly Restriction (real money) settles via
// Stripe; the Stripe hold/settlement is stubbed here (no live keys) but the state machine is real.
const MAX_ACTIVE_FOCUS = 5; // cap on concurrent open commitments (clutter — NOT a currency stake)
const PENANCE_REQUIRED = 7; // full sessions to earn a cleanse (mirrors lib/sessionLog)

// Gather the REAL facts a commitment is judged on (since it began). Used by both the Focus and the
// Heavenly Restriction — the outcome is always derived here, never sent by the client (audit C2).
async function gatherWagerFacts(tx: Prisma.TransactionClient, pid: string, since: Date) {
  const [pr, sessions, strikes] = await Promise.all([
    tx.practitioner.findUniqueOrThrow({ where: { id: pid }, select: { streak: true } }),
    tx.voidSession.count({ where: { practitionerId: pid, occurredOn: { gte: since } } }),
    tx.strikeEvent.aggregate({ where: { practitionerId: pid, occurredAt: { gte: since } }, _sum: { amount: true } }),
  ]);
  return { streak: pr.streak, sessionsSinceStart: sessions, strikeAmountSinceStart: strikes._sum.amount ?? 0 };
}

// Swear a Focus: a self-commitment to a dynamic, self-chosen condition (a streak of N days, or a
// sessions/reps goal within a window). NOTHING is staked — currency is cosmetics-only (see
// docs/HONEST_ECONOMY_DESIGN.md). The outcome is DERIVED server-side from real logged data; the only
// reward is the truth of having kept your word. Dishonesty just delays your own growth.
premiumRouter.post(
  '/wager-ki/start',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ criterion: wagerCriterionSchema });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid focus payload');
    const startedAt = new Date();
    const resolveAt = new Date(utcMidnight(startedAt).getTime() + parsed.data.criterion.days * 86_400_000);
    const wager = await prisma.$transaction(async (tx) => {
      const open = await tx.wagerEvent.count({ where: { practitionerId: req.practitionerId!, kind: 'wagered_ki', status: 'pending' } });
      if (open >= MAX_ACTIVE_FOCUS) throw forbidden(`You already hold ${MAX_ACTIVE_FOCUS} open commitments — resolve one first`);
      return tx.wagerEvent.create({
        data: {
          practitionerId: req.practitionerId!,
          kind: 'wagered_ki',
          amount: 0, // no stake — currency is cosmetics-only
          currency: 'crystal',
          status: 'pending',
          weekOf: startOfIsoWeek(startedAt),
          criterion: parsed.data.criterion as Prisma.InputJsonValue,
          resolveAt,
        },
      });
    });
    res.status(201).json({ wager });
  }),
);

// Settle a wager. The client supplies ONLY the wagerId — the server evaluates the stored criterion
// against real logged facts (streak, sessions/reps since the wager started) and decides won/lost.
// Can only resolve on/after resolveAt, so a win can't be claimed before the commitment is met.
premiumRouter.post(
  '/wager-ki/settle',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ wagerId: z.string() }); // no client-declared outcome (audit C2)
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid settle payload');
    const pid = req.practitionerId!;
    const out = await prisma.$transaction(async (tx) => {
      const w = await tx.wagerEvent.findUnique({ where: { id: parsed.data.wagerId } });
      if (!w || w.practitionerId !== pid || w.kind !== 'wagered_ki') throw notFound('Wager not found');
      if (w.status !== 'pending') throw badRequest('Wager already settled');
      if (!w.criterion || !w.resolveAt) throw badRequest('This wager has no criterion to evaluate');
      const now = new Date();
      if (now < w.resolveAt) throw forbidden(`This wager resolves on ${w.resolveAt.toISOString().slice(0, 10)} — keep showing up`);

      const criterion = wagerCriterionSchema.parse(w.criterion);
      const verdict = evaluateWager(criterion, await gatherWagerFacts(tx, pid, w.createdAt));
      // No payout — currency is cosmetics-only. The reward is the kept word (the WagerSettled event).
      const updated = await tx.wagerEvent.update({ where: { id: w.id }, data: { status: verdict.won ? 'won' : 'lost', settledAt: new Date() } });
      await emit(tx, { type: 'WagerSettled', practitionerId: pid, wagerId: w.id, outcome: verdict.won ? 'won' : 'lost' });
      return { wager: updated, verdict };
    });
    res.json({ wager: out.wager, kept: out.verdict.won, detail: out.verdict.detail });
  }),
);

premiumRouter.post(
  '/heavenly-restriction/start',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({
      title: z.string().min(1).max(160),
      criterion: wagerCriterionSchema,
      // OPTIONAL external accountability (real money to forfeit) — never in-app currency, never a reward.
      wagerUsdCents: z.number().int().min(500).max(1000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid Heavenly Restriction payload');
    const startedAt = new Date();
    const resolveAt = new Date(utcMidnight(startedAt).getTime() + parsed.data.criterion.days * 86_400_000);
    const result = await prisma.$transaction(async (tx) => {
      const vow = await tx.vow.create({
        data: {
          practitionerId: req.practitionerId!,
          title: parsed.data.title,
          type: 'major',
          vowSubtype: 'heavenly_restriction',
          resolutionDate: resolveAt,
          wagerAmount: parsed.data.wagerUsdCents ?? 0,
          wagerStatus: 'pending',
        },
      });
      const wager = await tx.wagerEvent.create({
        data: {
          practitionerId: req.practitionerId!,
          kind: 'heavenly_restriction',
          amount: parsed.data.wagerUsdCents ?? 0,
          currency: 'usd',
          status: 'pending',
          vowId: vow.id,
          criterion: parsed.data.criterion as Prisma.InputJsonValue,
          resolveAt,
          stripePaymentIntentId: parsed.data.wagerUsdCents ? `pi_stub_${vow.id}` : null,
        },
      });
      return { vow, wager };
    });
    res.status(201).json({ ...result, stripe: { stubbed: true, note: 'Optional Stripe hold (manual capture) would be authorized here in production.' } });
  }),
);

premiumRouter.post(
  '/heavenly-restriction/settle',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ wagerId: z.string() }); // success is DERIVED from real work, never declared (audit C2)
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid settle payload');
    const pid = req.practitionerId!;
    const out = await prisma.$transaction(async (tx) => {
      const w = await tx.wagerEvent.findUnique({ where: { id: parsed.data.wagerId } });
      if (!w || w.practitionerId !== pid || w.kind !== 'heavenly_restriction') throw notFound('Restriction not found');
      if (w.status !== 'pending') throw badRequest('Already settled');
      if (!w.criterion || !w.resolveAt) throw badRequest('This restriction has no criterion to evaluate');
      if (new Date() < w.resolveAt) throw forbidden(`This resolves on ${w.resolveAt.toISOString().slice(0, 10)} — the work is not done yet`);
      const criterion = wagerCriterionSchema.parse(w.criterion);
      const verdict = evaluateWager(criterion, await gatherWagerFacts(tx, pid, w.createdAt));
      await tx.wagerEvent.update({ where: { id: w.id }, data: { status: verdict.won ? 'won' : 'lost', settledAt: new Date() } });
      if (w.vowId) await tx.vow.update({ where: { id: w.vowId }, data: { status: verdict.won ? 'kept' : 'broken', wagerStatus: verdict.won ? 'won' : 'lost', resolvedAt: new Date() } });
      if (verdict.won) {
        // The Transcendent form is EARNED through real, verified work — never granted on a claim.
        await grantEntitlement(pid, 'form', 'transcendent_heavenly');
      } else {
        await tx.practitioner.update({ where: { id: pid }, data: { restrictionScars: { increment: 1 } } });
      }
      await emit(tx, { type: 'WagerSettled', practitionerId: pid, wagerId: w.id, outcome: verdict.won ? 'won' : 'lost' });
      return { success: verdict.won, detail: verdict.detail };
    });
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: pid } });
    res.json({ success: out.success, detail: out.detail, practitioner: publicPractitioner(p), stripe: { stubbed: true } });
  }),
);

// Cleansing is EARNED through the Penance Protocol (7 full sessions, applied in lib/sessionLog),
// never purchased — keeping with currency = cosmetics-only and "the only cheat code is showing up".
premiumRouter.post(
  '/cleanse',
  wrap(async (req: AuthedRequest, res) => {
    const cur = await prisma.practitioner.findUniqueOrThrow({
      where: { id: req.practitionerId! },
      select: { corruptedSince: true, penanceProgress: true },
    });
    if (!cur.corruptedSince) {
      const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
      return res.json({ practitioner: publicPractitioner(p), cleansed: false, note: 'Nothing to cleanse.' });
    }
    if (cur.penanceProgress < PENANCE_REQUIRED) {
      throw forbidden(`Cleansing is earned: ${cur.penanceProgress}/${PENANCE_REQUIRED} penance sessions — keep training`);
    }
    const p = await prisma.practitioner.update({
      where: { id: req.practitionerId! },
      data: { corruptedSince: null, penanceProgress: 0 },
    });
    res.json({ practitioner: publicPractitioner(p), cleansed: true });
  }),
);

function startOfIsoWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - day);
  return date;
}

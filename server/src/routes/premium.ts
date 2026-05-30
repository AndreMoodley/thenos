import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, forbidden, notFound, wrap } from '../lib/http.js';
import { publicPractitioner } from '../lib/serialize.js';

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
const WEEKLY_WAGER_CAP = 500;

premiumRouter.post(
  '/wager-ki/start',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ amount: z.number().int().min(1).max(WEEKLY_WAGER_CAP) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid wager payload');
    const weekOf = startOfIsoWeek(new Date());
    const wager = await prisma.$transaction(async (tx) => {
      const p = await tx.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! }, select: { crystals: true } });
      if (p.crystals < parsed.data.amount) throw forbidden('Not enough Void Crystals to wager');
      const wagered = await tx.wagerEvent.aggregate({
        where: { practitionerId: req.practitionerId!, kind: 'wagered_ki', weekOf, status: 'pending' },
        _sum: { amount: true },
      });
      if ((wagered._sum.amount ?? 0) + parsed.data.amount > WEEKLY_WAGER_CAP) throw forbidden('Weekly wager cap reached');
      await tx.practitioner.update({ where: { id: req.practitionerId! }, data: { crystals: { decrement: parsed.data.amount } } });
      return tx.wagerEvent.create({
        data: { practitionerId: req.practitionerId!, kind: 'wagered_ki', amount: parsed.data.amount, currency: 'crystal', status: 'pending', weekOf },
      });
    });
    res.status(201).json({ wager });
  }),
);

premiumRouter.post(
  '/wager-ki/settle',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ wagerId: z.string(), won: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid settle payload');
    const out = await prisma.$transaction(async (tx) => {
      const w = await tx.wagerEvent.findUnique({ where: { id: parsed.data.wagerId } });
      if (!w || w.practitionerId !== req.practitionerId!) throw notFound('Wager not found');
      if (w.status !== 'pending') throw badRequest('Wager already settled');
      if (parsed.data.won) {
        await tx.practitioner.update({ where: { id: req.practitionerId! }, data: { crystals: { increment: w.amount * 2 } } });
      }
      return tx.wagerEvent.update({ where: { id: w.id }, data: { status: parsed.data.won ? 'won' : 'lost', settledAt: new Date() } });
    });
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.json({ wager: out, practitioner: publicPractitioner(p) });
  }),
);

premiumRouter.post(
  '/heavenly-restriction/start',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ title: z.string().min(1).max(160), wagerUsdCents: z.number().int().min(500).max(1000), resolutionDate: z.coerce.date() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid Heavenly Restriction payload');
    const result = await prisma.$transaction(async (tx) => {
      const vow = await tx.vow.create({
        data: {
          practitionerId: req.practitionerId!,
          title: parsed.data.title,
          type: 'major',
          vowSubtype: 'heavenly_restriction',
          resolutionDate: parsed.data.resolutionDate,
          wagerAmount: parsed.data.wagerUsdCents,
          wagerStatus: 'pending',
        },
      });
      const wager = await tx.wagerEvent.create({
        data: {
          practitionerId: req.practitionerId!,
          kind: 'heavenly_restriction',
          amount: parsed.data.wagerUsdCents,
          currency: 'usd',
          status: 'pending',
          vowId: vow.id,
          // Stripe PaymentIntent (manual capture / hold) would be created here with a live key.
          stripePaymentIntentId: `pi_stub_${vow.id}`,
        },
      });
      return { vow, wager };
    });
    res.status(201).json({ ...result, stripe: { stubbed: true, note: 'Authorize a hold via Stripe PaymentIntent (manual capture) in production.' } });
  }),
);

premiumRouter.post(
  '/heavenly-restriction/settle',
  wrap(async (req: AuthedRequest, res) => {
    const schema = z.object({ wagerId: z.string(), success: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid settle payload');
    const out = await prisma.$transaction(async (tx) => {
      const w = await tx.wagerEvent.findUnique({ where: { id: parsed.data.wagerId } });
      if (!w || w.practitionerId !== req.practitionerId! || w.kind !== 'heavenly_restriction') throw notFound('Wager not found');
      if (w.status !== 'pending') throw badRequest('Already settled');
      const wager = await tx.wagerEvent.update({ where: { id: w.id }, data: { status: parsed.data.success ? 'won' : 'lost', settledAt: new Date() } });
      if (w.vowId) await tx.vow.update({ where: { id: w.vowId }, data: { status: parsed.data.success ? 'kept' : 'broken', wagerStatus: parsed.data.success ? 'won' : 'lost', resolvedAt: new Date() } });
      if (parsed.data.success) {
        // Success unlocks a Transcendent form available no other way (proof, not cosmetic).
        await grantEntitlement(req.practitionerId!, 'form', 'transcendent_heavenly');
      } else {
        // Failure forfeits the hold (Stripe capture) and brands a permanent Restriction Scar.
        await tx.practitioner.update({ where: { id: req.practitionerId! }, data: { restrictionScars: { increment: 1 } } });
      }
      return wager;
    });
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.json({ wager: out, practitioner: publicPractitioner(p), stripe: { stubbed: true } });
  }),
);

// Purification Talisman — instant cleanse of Corruption (a ~$1.99 microtransaction in production).
premiumRouter.post(
  '/cleanse',
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.update({
      where: { id: req.practitionerId! },
      data: { corruptedSince: null, penanceProgress: 0 },
    });
    res.json({ practitioner: publicPractitioner(p) });
  }),
);

function startOfIsoWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - day);
  return date;
}

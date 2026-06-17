// The Summoning Void — the ONLY randomized system in VOIDBORN (invariant #8).
// Rates are DISCLOSED (see ratesFor) and pity is SERVER-SIDE. RNG only ever runs here, on the server.

import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;
export type ScrollType = 'lesser' | 'abyssal';
export type CompanionRarity = 'wandering' | 'bound' | 'ancient' | 'void_herald';

const RARITY_ORDER: CompanionRarity[] = ['wandering', 'bound', 'ancient', 'void_herald'];
const rank = (r: CompanionRarity) => RARITY_ORDER.indexOf(r);

// Disclosed base rates per scroll (must sum to 1). Surfaced verbatim by GET /companions.
const RATES: Record<ScrollType, Record<CompanionRarity, number>> = {
  lesser: { wandering: 0.6, bound: 0.3, ancient: 0.09, void_herald: 0.01 },
  abyssal: { wandering: 0.4, bound: 0.35, ancient: 0.2, void_herald: 0.05 },
};

// Pity, server-authoritative: 50 pulls → guaranteed Ancient+; 100 → guaranteed Void Herald.
export const PITY_ANCIENT = 50;
export const PITY_HERALD = 100;

export function ratesFor(scroll: ScrollType) {
  return {
    scroll,
    rates: RATES[scroll],
    pity: { ancientAt: PITY_ANCIENT, voidHeraldAt: PITY_HERALD },
  };
}

export function disclosedRates() {
  return { lesser: ratesFor('lesser'), abyssal: ratesFor('abyssal') };
}

function sampleRarity(scroll: ScrollType, roll: number): CompanionRarity {
  const table = RATES[scroll];
  let acc = 0;
  for (const r of RARITY_ORDER) {
    acc += table[r];
    if (roll < acc) return r;
  }
  return 'wandering';
}

/**
 * Pure rarity decision (no DB) — server pity + disclosed-rate sampling. Unit-tested.
 * `pullsSinceAncient/Herald` are the counters BEFORE this pull.
 */
export function decideRarity(
  scroll: ScrollType,
  roll: number,
  pullsSinceAncient: number,
  pullsSinceHerald: number,
): { rarity: CompanionRarity; wasPity: boolean } {
  if (pullsSinceHerald + 1 >= PITY_HERALD) return { rarity: 'void_herald', wasPity: true };
  if (pullsSinceAncient + 1 >= PITY_ANCIENT) {
    const a = RATES[scroll].ancient;
    const h = RATES[scroll].void_herald;
    return { rarity: roll < h / (a + h) ? 'void_herald' : 'ancient', wasPity: true };
  }
  return { rarity: sampleRarity(scroll, roll), wasPity: false };
}

/**
 * Duplicate-pull crystal consolation. PAID (abyssal) pulls only — free Lesser pulls never refund
 * crystals, so unlimited free summoning can't be scripted into a currency faucet (audit H2).
 */
export function dupRefund(scroll: ScrollType, rarity: CompanionRarity): number {
  if (scroll !== 'abyssal') return 0;
  return rank(rarity) >= rank('ancient') ? 25 : 5;
}

export interface SummonResult {
  companionKey: string;
  rarity: CompanionRarity;
  wasPity: boolean;
  rolledValue: number;
  duplicate: boolean;
  crystalsRefunded: number;
}

/**
 * Resolve one summon inside a transaction. Server-authoritative; never runs offline.
 * Mutates the practitioner's pity counters and records a CompanionSummon (audit trail).
 */
export async function summon(
  tx: Tx,
  practitionerId: string,
  scroll: ScrollType,
  rng: () => number = Math.random,
): Promise<SummonResult> {
  const p = await tx.practitioner.findUniqueOrThrow({
    where: { id: practitionerId },
    select: { pullsSinceAncient: true, pullsSinceHerald: true },
  });

  const roll = rng();
  const { rarity, wasPity } = decideRarity(scroll, roll, p.pullsSinceAncient, p.pullsSinceHerald);

  // pick a companion of this rarity that's in the chosen scroll pool, weighted
  const poolFilter = scroll === 'lesser' ? { inLesserPool: true } : { inAbyssalPool: true };
  const candidates = await tx.companion.findMany({
    where: { rarity: rarity as any, ...poolFilter },
    select: { companionKey: true, weight: true },
  });
  // fall back up the rarity ladder if a pool happens to have no entry at this tier
  let pick = candidates;
  let r = rank(rarity);
  while (pick.length === 0 && r < RARITY_ORDER.length - 1) {
    r += 1;
    pick = await tx.companion.findMany({
      where: { rarity: RARITY_ORDER[r] as any, ...poolFilter },
      select: { companionKey: true, weight: true },
    });
  }
  if (pick.length === 0) throw new Error('No companions available in pool');

  const total = pick.reduce((s, c) => s + (c.weight || 1), 0);
  let t = rng() * total;
  let chosen = pick[0]!.companionKey;
  for (const c of pick) {
    t -= c.weight || 1;
    if (t <= 0) {
      chosen = c.companionKey;
      break;
    }
  }

  // update pity counters
  const gotAncientPlus = rank(rarity) >= rank('ancient');
  const gotHerald = rarity === 'void_herald';
  await tx.practitioner.update({
    where: { id: practitionerId },
    data: {
      pullsSinceAncient: gotAncientPlus ? 0 : { increment: 1 },
      pullsSinceHerald: gotHerald ? 0 : { increment: 1 },
    },
  });

  await tx.companionSummon.create({
    data: { practitionerId, scrollType: scroll as any, companionKey: chosen, wasPity, rolledValue: roll },
  });

  // grant ownership; duplicates convert to a small crystal consolation
  const already = await tx.practitionerCompanion.findUnique({
    where: { practitionerId_companionKey: { practitionerId, companionKey: chosen } },
  });
  let duplicate = false;
  let crystalsRefunded = 0;
  if (already) {
    duplicate = true;
    crystalsRefunded = dupRefund(scroll, rarity); // 0 for free pulls — no faucet (audit H2)
    if (crystalsRefunded > 0) {
      await tx.practitioner.update({
        where: { id: practitionerId },
        data: { crystals: { increment: crystalsRefunded } },
      });
    }
  } else {
    await tx.practitionerCompanion.create({ data: { practitionerId, companionKey: chosen } });
  }

  return { companionKey: chosen, rarity, wasPity, rolledValue: roll, duplicate, crystalsRefunded };
}

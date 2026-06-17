import type { Subscriber } from '../lib/eventBus.js';
import { dayDiff } from '../lib/metrics.js';

const BOND_PRESENCE_GAIN = 2; // affinity gained the first time you show up on a given day
const BOND_MAX = 100;

/**
 * The Bond deepens with presence (README "The Bond"): a real event-bus subscriber doing real
 * domain writes, added WITHOUT touching the strike producer — the decoupled design paying off.
 * Additive: nothing else writes Bond on a strike today. Counts presence once per UTC day, uses the
 * strike's own occurredOn (so backfilled/offline logs are honored) and never regresses
 * lastPresenceDate on an older log. Idempotent: the relay delivers each StrikeLogged once, and the
 * same-day guard makes a re-run a no-op.
 */
export const bondSubscriber: Subscriber = {
  name: 'bond',
  handles: (e) => e.type === 'StrikeLogged' || e.type === 'Contemplated',
  handle: async (e, { prisma }) => {
    if (e.type !== 'StrikeLogged' && e.type !== 'Contemplated') return;
    const occurredOn = new Date(e.occurredOn);
    await prisma.$transaction(async (tx) => {
      const bond = await tx.bond.findUnique({ where: { practitionerId: e.practitionerId } });
      // Already counted presence for this day (or this is an older backfilled log) ⇒ do nothing.
      if (bond?.lastPresenceDate && dayDiff(occurredOn, bond.lastPresenceDate) <= 0) return;
      const value = Math.min((bond?.value ?? 0) + BOND_PRESENCE_GAIN, BOND_MAX);
      await tx.bond.upsert({
        where: { practitionerId: e.practitionerId },
        update: { value, lastPresenceDate: occurredOn },
        create: { practitionerId: e.practitionerId, value: BOND_PRESENCE_GAIN, lastPresenceDate: occurredOn },
      });
    });
  },
};

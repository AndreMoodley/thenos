import type { Subscriber } from '../lib/eventBus.js';
import { emit } from '../lib/events.js';
import { scoreStrike } from '../lib/anomaly.js';

const HISTORY_WINDOW = 30;

/**
 * Anomaly scorer (audit H3). On every StrikeLogged it scores the strike against the practitioner's
 * own append-only history and, for outliers, emits a durable StrikeFlagged event — the Strava
 * "flag, don't block" model. It never touches the strike or hammerCount (Invariant #2 intact); a
 * future consumer (Pantheon exclusion, admin review) acts on the flag. Added as a subscriber, with
 * no change to the strike producer.
 */
export const anomalySubscriber: Subscriber = {
  name: 'anomaly',
  handles: (e) => e.type === 'StrikeLogged',
  handle: async (e, { prisma }) => {
    if (e.type !== 'StrikeLogged') return;
    const rows = await prisma.strikeEvent.findMany({
      where: { practitionerId: e.practitionerId, sessionId: { not: e.sessionId } },
      orderBy: { occurredAt: 'desc' },
      take: HISTORY_WINDOW,
      select: { amount: true },
    });
    const { score, flagged, reason } = scoreStrike(rows.map((r) => r.amount), e.amount);
    if (flagged) {
      await emit(prisma, {
        type: 'StrikeFlagged',
        practitionerId: e.practitionerId,
        sessionId: e.sessionId,
        amount: e.amount,
        score,
        reason: reason ?? 'anomaly',
      });
    }
  },
};

import type { Subscriber } from '../lib/eventBus.js';
import { advanceSaga } from '../lib/sagaEngine.js';

/**
 * The saga: a true event-bus subscriber. It consumes the beats a strike raised and writes the
 * Chronicle's chapters in its OWN transaction — off the strike's critical path entirely. advanceSaga
 * unlocks chapters idempotently from real events (`unlockedBy` audit), so a relay retry is safe.
 * Returns the freshly unlocked chapters so an eager request-time drain can surface them immediately.
 */
export const sagaSubscriber: Subscriber = {
  name: 'saga',
  handles: (e) => e.type === 'SagaBeatsRaised',
  handle: async (e, { prisma }) => {
    if (e.type !== 'SagaBeatsRaised' || e.beats.length === 0) return;
    const { unlocked } = await prisma.$transaction((tx) => advanceSaga(tx, e.practitionerId, e.beats));
    return { unlocked };
  },
};

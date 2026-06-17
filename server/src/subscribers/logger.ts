import type { Subscriber } from '../lib/eventBus.js';

// Always-on, side-effect-free subscriber: proves the relay reaches consumers in production
// without mutating any domain state. The safe first consumer — never contends with an invariant.
export const loggerSubscriber: Subscriber = {
  name: 'logger',
  handles: () => true,
  handle: async (e) => {
    const who = 'practitionerId' in e ? e.practitionerId : '';
    // eslint-disable-next-line no-console
    console.log(`[event] ${e.type} ${who}`.trimEnd());
  },
};

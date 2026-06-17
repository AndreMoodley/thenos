import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub the saga engine so this test exercises the subscriber's wiring, not the (DB-bound) engine.
vi.mock('../lib/sagaEngine.js', () => ({
  advanceSaga: vi.fn(async () => ({ unlocked: [{ id: 'ch1' }] })),
}));

import { advanceSaga } from '../lib/sagaEngine.js';
import { sagaSubscriber } from '../subscribers/saga.js';

// $transaction just runs the callback with a fake tx — advanceSaga is mocked anyway.
const fakePrisma = () => ({ $transaction: (fn: any) => fn({}) }) as any;
const beatsEvent: any = {
  type: 'SagaBeatsRaised',
  practitionerId: 'p1',
  beats: [{ kind: 'realm_crossed', realmIndex: 2 }],
};

describe('sagaSubscriber', () => {
  beforeEach(() => (advanceSaga as any).mockClear());

  it('only handles SagaBeatsRaised', () => {
    expect(sagaSubscriber.handles(beatsEvent)).toBe(true);
    expect(sagaSubscriber.handles({ type: 'StrikeLogged' } as any)).toBe(false);
  });

  it('advances the saga in its own transaction and returns unlocked chapters', async () => {
    const out = await sagaSubscriber.handle(beatsEvent, { prisma: fakePrisma() });
    expect(advanceSaga).toHaveBeenCalledTimes(1);
    expect(advanceSaga).toHaveBeenCalledWith(expect.anything(), 'p1', beatsEvent.beats);
    expect(out).toEqual({ unlocked: [{ id: 'ch1' }] });
  });

  it('no-ops on an empty beat list', async () => {
    const out = await sagaSubscriber.handle(
      { type: 'SagaBeatsRaised', practitionerId: 'p1', beats: [] } as any,
      { prisma: fakePrisma() },
    );
    expect(advanceSaga).not.toHaveBeenCalled();
    expect(out).toBeUndefined();
  });
});

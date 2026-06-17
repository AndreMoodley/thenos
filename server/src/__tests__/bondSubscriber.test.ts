import { describe, it, expect } from 'vitest';
import { bondSubscriber } from '../subscribers/bond.js';

// Fake prisma holding a single Bond row; $transaction just runs the callback.
function fakePrisma(initial: any) {
  const state: any = { bond: initial };
  const prisma: any = {
    state,
    $transaction: (fn: any) =>
      fn({
        bond: {
          findUnique: async () => state.bond,
          upsert: async ({ update, create }: any) => {
            state.bond = state.bond ? { ...state.bond, ...update } : { practitionerId: 'p1', ...create };
            return state.bond;
          },
        },
      }),
  };
  return prisma;
}

const ev = (occurredOn: string): any => ({
  type: 'StrikeLogged',
  practitionerId: 'p1',
  sessionId: 's',
  amount: 100,
  modality: 'push',
  occurredOn,
  before: 0,
  after: 100,
});

describe('bondSubscriber', () => {
  it('handles only StrikeLogged', () => {
    expect(bondSubscriber.handles(ev('2026-06-16T10:00:00Z'))).toBe(true);
    expect(bondSubscriber.handles({ type: 'SagaBeatsRaised' } as any)).toBe(false);
  });

  it('deepens once per UTC day and never regresses on an older log', async () => {
    const p = fakePrisma({ practitionerId: 'p1', value: 10, lastPresenceDate: new Date('2026-06-15T08:00:00Z') });
    await bondSubscriber.handle(ev('2026-06-16T10:00:00Z'), { prisma: p }); // new day → +2
    expect(p.state.bond.value).toBe(12);
    await bondSubscriber.handle(ev('2026-06-16T20:00:00Z'), { prisma: p }); // same day → no change
    expect(p.state.bond.value).toBe(12);
    await bondSubscriber.handle(ev('2026-06-14T20:00:00Z'), { prisma: p }); // older backfill → no change
    expect(p.state.bond.value).toBe(12);
  });

  it('caps the bond at 100', async () => {
    const p = fakePrisma({ practitionerId: 'p1', value: 99, lastPresenceDate: new Date('2026-06-15T08:00:00Z') });
    await bondSubscriber.handle(ev('2026-06-16T10:00:00Z'), { prisma: p });
    expect(p.state.bond.value).toBe(100);
  });

  it('creates the bond if missing', async () => {
    const p = fakePrisma(null);
    await bondSubscriber.handle(ev('2026-06-16T10:00:00Z'), { prisma: p });
    expect(p.state.bond.value).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';
import { anomalySubscriber } from '../subscribers/anomaly.js';

// Fake prisma: a fixed strike history + an outbox that captures emit().
function fakePrisma(history: number[]) {
  const outbox: any[] = [];
  const prisma: any = {
    _outbox: outbox,
    strikeEvent: { findMany: async () => history.map((amount) => ({ amount })) },
    outboxEvent: { create: async ({ data }: any) => { outbox.push(data); return data; } },
  };
  return prisma;
}

const strike = (amount: number): any => ({
  type: 'StrikeLogged',
  practitionerId: 'p1',
  sessionId: 's1',
  amount,
  modality: 'push',
  occurredOn: new Date().toISOString(),
  before: 0,
  after: amount,
});

describe('anomalySubscriber', () => {
  it('handles only StrikeLogged', () => {
    expect(anomalySubscriber.handles(strike(100))).toBe(true);
    expect(anomalySubscriber.handles({ type: 'SagaBeatsRaised' } as any)).toBe(false);
  });

  it('emits StrikeFlagged for an outlier', async () => {
    const p = fakePrisma([100, 110, 90, 105, 95, 100]);
    await anomalySubscriber.handle(strike(2000), { prisma: p });
    expect(p._outbox).toHaveLength(1);
    expect(p._outbox[0].type).toBe('StrikeFlagged');
    expect(p._outbox[0].payload.amount).toBe(2000);
  });

  it('does not emit for normal progression', async () => {
    const p = fakePrisma([100, 110, 90, 105, 95, 100]);
    await anomalySubscriber.handle(strike(180), { prisma: p });
    expect(p._outbox).toHaveLength(0);
  });
});

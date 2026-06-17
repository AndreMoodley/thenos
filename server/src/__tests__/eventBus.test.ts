import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emit } from '../lib/events.js';
import { register, dispatchPending, _resetSubscribers } from '../lib/eventBus.js';
import type { DomainEvent } from '../events/catalog.js';

// In-memory fake of the two Prisma models the backbone touches — no DB required.
function makeFakePrisma() {
  const outbox: any[] = [];
  const deliveries: any[] = [];
  let oid = 0;
  let did = 0;
  return {
    _outbox: outbox,
    _deliveries: deliveries,
    outboxEvent: {
      create: async ({ data }: any) => {
        const row = { id: `o${++oid}`, occurredAt: new Date(Date.now() + oid), processedAt: null, ...data };
        outbox.push(row);
        return row;
      },
      findMany: async ({ where }: any) =>
        outbox
          .filter((o) => (where?.processedAt === null ? o.processedAt === null : true))
          .filter((o) => (where?.practitionerId ? o.practitionerId === where.practitionerId : true))
          .map((o) => ({ ...o, deliveries: deliveries.filter((d) => d.eventId === o.id) })),
      update: async ({ where, data }: any) => {
        const o = outbox.find((x) => x.id === where.id);
        Object.assign(o, data);
        return o;
      },
    },
    eventDelivery: {
      upsert: async ({ where, update, create }: any) => {
        const { eventId, consumer } = where.eventId_consumer;
        const existing = deliveries.find((d) => d.eventId === eventId && d.consumer === consumer);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `d${++did}`, ...create };
        deliveries.push(row);
        return row;
      },
    },
  } as any;
}

const strike: DomainEvent = {
  type: 'StrikeLogged',
  practitionerId: 'p1',
  sessionId: 's1',
  amount: 100,
  modality: 'push' as any,
  occurredOn: new Date().toISOString(),
  before: 0,
  after: 100,
};

describe('event backbone', () => {
  beforeEach(() => _resetSubscribers());

  it('emit writes one outbox row carrying the event + practitionerId', async () => {
    const prisma = makeFakePrisma();
    await emit(prisma, strike);
    expect(prisma._outbox).toHaveLength(1);
    expect(prisma._outbox[0].type).toBe('StrikeLogged');
    expect(prisma._outbox[0].practitionerId).toBe('p1');
    expect(prisma._outbox[0].payload.after).toBe(100);
  });

  it('delivers exactly once, marks processed, and is idempotent on replay', async () => {
    const prisma = makeFakePrisma();
    const handle = vi.fn(async () => {});
    register({ name: 'test', handles: (e) => e.type === 'StrikeLogged', handle });
    await emit(prisma, strike);

    const r1 = await dispatchPending(prisma);
    expect(r1).toMatchObject({ processed: 1, delivered: 1, failed: 0 });
    expect(handle).toHaveBeenCalledTimes(1);
    expect(prisma._outbox[0].processedAt).not.toBeNull();

    const r2 = await dispatchPending(prisma);
    expect(r2).toMatchObject({ processed: 0, delivered: 0 });
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('aggregates subscriber output (unlocked chapters) for the caller', async () => {
    const prisma = makeFakePrisma();
    register({ name: 'saga', handles: (e) => e.type === 'StrikeLogged', handle: async () => ({ unlocked: [{ id: 'c1' }] }) });
    await emit(prisma, strike);
    const r = await dispatchPending(prisma);
    expect(r.unlocked).toEqual([{ id: 'c1' }]);
  });

  it('retries only the failed subscriber, never the succeeded one', async () => {
    const prisma = makeFakePrisma();
    const good = vi.fn(async () => {});
    let calls = 0;
    const flaky = vi.fn(async () => {
      if (++calls === 1) throw new Error('boom');
    });
    register({ name: 'good', handles: () => true, handle: good });
    register({ name: 'flaky', handles: () => true, handle: flaky });
    await emit(prisma, strike);

    const r1 = await dispatchPending(prisma);
    expect(r1.failed).toBe(1);
    expect(prisma._outbox[0].processedAt).toBeNull();

    const r2 = await dispatchPending(prisma);
    expect(r2.delivered).toBe(1);
    expect(good).toHaveBeenCalledTimes(1);
    expect(flaky).toHaveBeenCalledTimes(2);
    expect(prisma._outbox[0].processedAt).not.toBeNull();
  });

  it('scopes a drain to a single practitioner', async () => {
    const prisma = makeFakePrisma();
    const handle = vi.fn(async () => {});
    register({ name: 't', handles: () => true, handle });
    await emit(prisma, strike); // p1
    await emit(prisma, { ...strike, practitionerId: 'p2' });
    const r = await dispatchPending(prisma, { practitionerId: 'p1' });
    expect(r.processed).toBe(1);
    expect(handle).toHaveBeenCalledTimes(1);
  });
});

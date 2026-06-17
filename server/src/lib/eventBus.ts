import type { PrismaClient } from '@prisma/client';
import type { DomainEvent } from '../events/catalog.js';

/** Optional payload a subscriber can hand back so a request can surface results immediately. */
export interface SubscriberOutput {
  unlocked?: unknown[];
}

export interface Subscriber {
  /** Stable name — the idempotency key in EventDelivery(eventId, consumer). */
  name: string;
  handles: (e: DomainEvent) => boolean;
  /** Do the work. Must be safe to retry; the relay guarantees at-least-once until it records 'ok'. */
  handle: (e: DomainEvent, ctx: { prisma: PrismaClient }) => Promise<SubscriberOutput | void>;
}

const MAX_ATTEMPTS = 10; // after this many failures a delivery is dead-lettered (not retried forever)

const registry: Subscriber[] = [];

export function register(sub: Subscriber): void {
  if (!registry.some((s) => s.name === sub.name)) registry.push(sub);
}
export function subscribers(): readonly Subscriber[] {
  return registry;
}
/** Test helper. */
export function _resetSubscribers(): void {
  registry.length = 0;
}

export interface DispatchResult {
  processed: number; // events whose every interested subscriber reached a terminal state
  delivered: number; // successful (event, subscriber) deliveries this pass
  failed: number; // transient failures this pass (will be retried)
  deadLettered: number; // deliveries that hit MAX_ATTEMPTS this pass (given up on)
  unlocked: unknown[]; // aggregated subscriber output (e.g. saga chapters) for the caller
}

export interface DispatchOptions {
  /** Drain only one practitioner's events — used by a request for an immediate, scoped result. */
  practitionerId?: string;
  batchSize?: number;
}

/**
 * The relay. Publishes unprocessed OutboxEvents to every interested subscriber exactly once each —
 * idempotent via EventDelivery's unique [eventId, consumer]. A retry re-attempts only deliveries
 * that are not yet terminal ('ok' or 'dead'); after MAX_ATTEMPTS failures a delivery is
 * **dead-lettered** so one poison subscriber can never block an event (or the outbox) forever. An
 * event is marked processed once every interested subscriber is terminal.
 */
export async function dispatchPending(prisma: PrismaClient, opts: DispatchOptions = {}): Promise<DispatchResult> {
  const pending = (await prisma.outboxEvent.findMany({
    where: { processedAt: null, ...(opts.practitionerId ? { practitionerId: opts.practitionerId } : {}) },
    orderBy: { occurredAt: 'asc' },
    take: opts.batchSize ?? 100,
    include: { deliveries: true },
  })) as Array<{ id: string; payload: unknown; deliveries: Array<{ consumer: string; status: string; attempts: number }> }>;

  let processed = 0;
  let delivered = 0;
  let failed = 0;
  let deadLettered = 0;
  const unlocked: unknown[] = [];

  for (const row of pending) {
    const event = row.payload as DomainEvent;
    const interested = registry.filter((s) => safeHandles(s, event));
    const byConsumer = new Map(row.deliveries.map((d) => [d.consumer, d]));
    let allTerminal = true;

    for (const sub of interested) {
      const prev = byConsumer.get(sub.name);
      if (prev && (prev.status === 'ok' || prev.status === 'dead')) continue; // terminal — never re-run
      const attempts = prev?.attempts ?? 0;
      try {
        const out = await sub.handle(event, { prisma });
        if (out && Array.isArray(out.unlocked)) unlocked.push(...out.unlocked);
        await recordDelivery(prisma, row.id, sub.name, 'ok', attempts + 1, null);
        delivered++;
      } catch (err) {
        const n = attempts + 1;
        const dead = n >= MAX_ATTEMPTS;
        await recordDelivery(prisma, row.id, sub.name, dead ? 'dead' : 'failed', n, String((err as Error)?.message ?? err));
        if (dead) deadLettered++;
        else {
          allTerminal = false;
          failed++;
        }
      }
    }

    if (allTerminal) {
      await prisma.outboxEvent.update({ where: { id: row.id }, data: { processedAt: new Date() } });
      processed++;
    }
  }

  return { processed, delivered, failed, deadLettered, unlocked };
}

function safeHandles(s: Subscriber, e: DomainEvent): boolean {
  try {
    return s.handles(e);
  } catch {
    return false;
  }
}

async function recordDelivery(
  prisma: PrismaClient,
  eventId: string,
  consumer: string,
  status: 'ok' | 'failed' | 'dead',
  attempts: number,
  error: string | null,
): Promise<void> {
  await prisma.eventDelivery.upsert({
    where: { eventId_consumer: { eventId, consumer } },
    update: { status, attempts, error },
    create: { eventId, consumer, status, attempts, error },
  });
}

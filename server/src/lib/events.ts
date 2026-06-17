import type { Prisma, PrismaClient } from '@prisma/client';
import type { DomainEvent } from '../events/catalog.js';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Transactional outbox. Writes a domain event in the SAME transaction as the domain change, so
 * they commit atomically — the dual-write problem cannot occur. The relay (lib/eventBus.dispatchPending)
 * publishes it afterward to idempotent subscribers; the practitionerId column lets a request drain
 * only its own events for an immediate, scoped result.
 *
 * Call this INSIDE an existing `prisma.$transaction(tx => ...)` block, passing that `tx`.
 */
export async function emit(tx: Tx, event: DomainEvent): Promise<void> {
  const practitionerId = 'practitionerId' in event ? event.practitionerId : null;
  await tx.outboxEvent.create({
    data: { type: event.type, practitionerId, payload: event as unknown as Prisma.InputJsonValue },
  });
}

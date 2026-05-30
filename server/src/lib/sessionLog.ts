import type { Prisma, PrismaClient, Modality } from '@prisma/client';
import { applyStrike } from './metrics.js';
import { realmsCrossed, type Realm } from './realms.js';

type Tx = Prisma.TransactionClient | PrismaClient;
const PENANCE_REQUIRED = 7; // consecutive full sessions to cleanse a corruption

export interface LogSessionInput {
  modality: Modality;
  reps: number;
  rating?: number | null;
  note?: string | null;
  occurredOn?: Date;
  clientId?: string | null;
}

export interface LogSessionResult {
  sessionId: string;
  struck: boolean;
  before: number;
  after: number;
  crossed: Realm[]; // realms crossed by this strike (drives ascension cinematics)
  cleansed: boolean; // did this session complete a Penance cleanse?
  idempotentHit: boolean; // existing session returned for a repeated clientId
}

/**
 * Single path for logging training. Used by /practitioner/me/strike and POST /sessions and
 * the offline sync flush. Idempotent per (practitioner, clientId) so the offline queue can
 * safely retry. reps:0 ⇒ recovery/stillness (no strike, invariant #3).
 */
export async function logSession(
  tx: Tx,
  practitionerId: string,
  input: LogSessionInput,
): Promise<LogSessionResult> {
  if (input.clientId) {
    const existing = await tx.voidSession.findUnique({
      where: { practitionerId_clientId: { practitionerId, clientId: input.clientId } },
      select: { id: true },
    });
    if (existing) {
      const p = await tx.practitioner.findUniqueOrThrow({
        where: { id: practitionerId },
        select: { hammerCount: true },
      });
      return {
        sessionId: existing.id,
        struck: false,
        before: p.hammerCount,
        after: p.hammerCount,
        crossed: [],
        cleansed: false,
        idempotentHit: true,
      };
    }
  }

  const session = await tx.voidSession.create({
    data: {
      practitionerId,
      modality: input.modality,
      reps: input.reps,
      rating: input.rating ?? null,
      note: input.note ?? null,
      occurredOn: input.occurredOn ?? new Date(),
      clientId: input.clientId ?? null,
    },
  });

  const { before, after, struck } = await applyStrike(tx, practitionerId, {
    reps: input.reps,
    sessionId: session.id,
    occurredAt: input.occurredOn,
  });

  // Penance cleanse: a corrupted entity clears once it logs PENANCE_REQUIRED full sessions.
  let cleansed = false;
  if (struck) {
    const p = await tx.practitioner.findUniqueOrThrow({
      where: { id: practitionerId },
      select: { corruptedSince: true, penanceProgress: true },
    });
    if (p.corruptedSince && p.penanceProgress >= PENANCE_REQUIRED) {
      await tx.practitioner.update({
        where: { id: practitionerId },
        data: { corruptedSince: null, penanceProgress: 0 },
      });
      cleansed = true;
    }
  }

  return {
    sessionId: session.id,
    struck,
    before,
    after,
    crossed: struck ? realmsCrossed(before, after) : [],
    cleansed,
    idempotentHit: false,
  };
}

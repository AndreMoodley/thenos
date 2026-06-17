// The shared domain-event vocabulary. Facts and IDs only — never the resolved look (Invariant #1).
// The single source of truth for event shapes (in the target architecture this lives in
// packages/contract and is imported by both the server and the app).
import type { Modality, PlannedKind } from '@prisma/client';
import type { SagaEvent } from '../lib/sagaBeats.js';

export type DomainEvent =
  | {
      type: 'StrikeLogged';
      practitionerId: string;
      sessionId: string;
      amount: number;
      modality: Modality;
      occurredOn: string; // ISO
      before: number;
      after: number;
    }
  | { type: 'RealmCrossed'; practitionerId: string; from: number; to: number }
  | { type: 'StreakReached'; practitionerId: string; days: number }
  | { type: 'QuestFulfilled'; practitionerId: string; plannedSessionId: string; trialId: string; kind: PlannedKind }
  | { type: 'CorruptionCleansed'; practitionerId: string }
  // The narrative beats a strike raised (computed in the strike transaction where the data lives).
  // The saga subscriber writes the chapters from these — so chapter-writing leaves the strike's
  // critical path entirely, while the beats themselves stay a faithful record of real events.
  | { type: 'SagaBeatsRaised'; practitionerId: string; beats: SagaEvent[] }
  // A strike scored as a statistical outlier against the practitioner's own history (audit H3).
  // Non-blocking and append-only (it lives in the outbox) — the strike itself is untouched; a
  // future consumer (Pantheon exclusion, admin review) acts on it.
  | { type: 'StrikeFlagged'; practitionerId: string; sessionId: string; amount: number; score: number; reason: string }
  // A Soul-Escrow wager resolved from real logged data (audit C2). Future consumers: a saga "kept
  // your word" beat, a coach occasion, Chronicle turning points.
  | { type: 'WagerSettled'; practitionerId: string; wagerId: string; outcome: 'won' | 'lost' }
  // A meditation logged — the mind-training analogue of StrikeLogged. Carries occurredOn so it
  // deepens the Bond as presence too (body OR mind both count as showing up).
  | { type: 'Contemplated'; practitionerId: string; hexagram: number; occurredOn: string };

export type DomainEventType = DomainEvent['type'];

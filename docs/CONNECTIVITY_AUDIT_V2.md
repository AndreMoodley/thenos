# VOIDBORN — Connectivity Audit v2 (the real, implemented event graph)

**Date:** 2026-06-17
**Scope:** the event-driven backbone *as actually built* (not the aspirational blueprint). Maps every producer → event → subscriber, flags what's wired vs dangling, and records the completeness fix made this pass.

## The real graph today

**Producers (emit):**
- `lib/sessionLog.ts` → **StrikeLogged**, **SagaBeatsRaised**
- `routes/practitioner.ts` (meditate) → **Contemplated**
- `routes/premium.ts` (Focus / Heavenly-Restriction settle) → **WagerSettled**
- `subscribers/anomaly.ts` → **StrikeFlagged** *(a subscriber emitting a new event — event chaining)*

**Subscribers (registered: logger, saga, bond, anomaly):**

| Event | logger | saga | bond | anomaly | real consumer? |
|---|:--:|:--:|:--:|:--:|---|
| **StrikeLogged** | ✓ | | ✓ (presence) | ✓ (score→flag) | ✅ |
| **SagaBeatsRaised** | ✓ | ✓ (write chapters) | | | ✅ |
| **Contemplated** | ✓ | | ✓ (presence) | | ✅ |
| **WagerSettled** | ✓ | | | | ⚠️ **dangling** |
| **StrikeFlagged** | ✓ | | | | ⚠️ **dangling (groundwork)** |

Declared-but-unused events (`RealmCrossed`, `StreakReached`, `QuestFulfilled`, `CorruptionCleansed`) are reserved vocabulary — fine to keep.

## Completeness fix made this pass — a robust relay (dead-lettering)
**Was:** `dispatchPending` retried a failed delivery on **every** pass with no cap. A single permanently-failing subscriber (a "poison" event) would never reach a terminal state, so its `OutboxEvent` was **retried forever and never marked processed** — it could clog the outbox and be re-attempted indefinitely.
**Now:** `EventDelivery.attempts` is tracked; after **`MAX_ATTEMPTS` (10)** a delivery is **dead-lettered** (`status:'dead'`, terminal). An event is released (`processedAt`) once every interested subscriber is terminal (`ok` **or** `dead`). One bad subscriber can no longer block an event or the queue, and dead letters are visible for inspection. (Schema + migration `20260617113000_relay_dead_letter`.)
**Verified headless:** 4/4 — pending through 9 failures, dead-lettered + released at attempt 10, never retried after, and healthy deliveries still process exactly once.

## Remaining gaps (prioritised) — to make it *fully* complete
1. **Wire the two dangling events** (highest value, low effort):
   - **WagerSettled** → an intrinsic acknowledgement (a saga **"kept your word"** beat or a coach `realign`/`return` reflection) — the *intrinsic* reward the honest-economy design calls for, replacing the removed currency payout.
   - **StrikeFlagged** → **Pantheon exclusion** (don't rank flagged feats) + an **admin review** surface.
2. **Coach occasions onto the bus** (`return`/`ascension`/`oracle`/`chapter`) — currently request-only; touches the external Claude API, so its own increment.
3. **Repository ports (CW3)** — routes still import `prisma` directly; introduce repository interfaces so data access is swappable/testable/traceable.
4. **Relay race → Graphile Worker** — the eager in-request drain and the worker can both grab an event; idempotency + dead-letter make this *correct* today, but `SELECT … FOR UPDATE SKIP LOCKED` (Graphile Worker, see `OSS_INTEGRATION_STACK.md`) removes the race outright.
5. **OpenTelemetry tracing** across producer → outbox → relay → subscriber, so a single act can be followed end-to-end; plus a WORM audit for money/entitlement/verification.

## Health summary
The backbone is **genuinely event-driven and now fault-tolerant**: every consequential act writes a fact + a domain event in one transaction, the relay fans out idempotently with a retry cap, and new subsystems (Bond, anomaly, meditation) attached as subscribers without touching producers. The connectivity is *robust and extensible*; the work left is **wiring the last two events to consumers** and the cross-cutting concerns (Coach, ports, tracing).

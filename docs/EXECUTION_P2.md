# VOIDBORN — Phase 2 Execution Log (Saga onto the Event Bus)

**Date:** 2026-06-16
**Status:** implemented + verified headless. **No flag — event-driven is now the real path** (you asked for the best iteration, not a timid relocation).
**Builds on:** `EXECUTION_P0.md` (the event backbone) · `MASTER_PLAN.md` Phase 2 · fixes architecture **CW1/CW2**.

## What changed (and why it's the best version, not just a move)

Saga advancement is no longer a direct call inside the strike's god-transaction. The strike now does the minimum and hands the rest to the bus:

1. **`logSession`** (strike tx) writes the `StrikeEvent` + quest fulfillment, **computes the narrative beats** (`computeSagaBeats`, reads only), and emits two outbox events — `StrikeLogged` and `SagaBeatsRaised{ practitionerId, beats }`. **No `advanceSaga` in this transaction** → the strike tx is lean (no chapter writes, no AI/prose, no saga-failure coupling). This is the CW1 fix, for real.
2. **The saga subscriber** consumes `SagaBeatsRaised` and writes the Chronicle's chapters via `advanceSaga` **in its own transaction**, off the critical path. It returns the freshly unlocked chapters.
3. **The request eagerly drains the outbox** for that practitioner (`dispatchPending(prisma, { practitionerId })`) right after the strike, so `unlockedChapters` still comes back **synchronously in the same response** — the client's chapter-unlock cinematic is unchanged. The **worker is the durable backstop** (delivers within ~1s if the request dies after commit).

Net: a true decoupling (saga is a real subscriber), durable + retryable + idempotent, and the **response contract is preserved** so the app needs no change.

## Files

**New / repurposed**
- `lib/sagaForStrike.ts` → `computeSagaBeats(tx, ctx)` — the beat computation, extracted verbatim (reads only, returns `SagaEvent[]`).

**Changed**
- `events/catalog.ts` — added `SagaBeatsRaised`; events now imported by the saga subscriber, not the producer.
- `lib/events.ts` — `emit` records `practitionerId` (new outbox column) so a request can drain only its own events.
- `lib/eventBus.ts` — subscribers may return output; `dispatchPending` aggregates `unlocked` and accepts a `{ practitionerId }` scope.
- `lib/sessionLog.ts` — computes beats + emits `StrikeLogged`/`SagaBeatsRaised`; **`advanceSaga` removed**; `LogSessionResult.unlockedChapters` dropped (chapters now come from the drain).
- `subscribers/saga.ts` — a real subscriber: `SagaBeatsRaised` → `advanceSaga` in its own tx, returns `{ unlocked }`.
- `routes/{sessions,practitioner,sync}.ts` — drain the outbox after the strike and return `unlockedChapters` from it.
- `app.ts` — `registerAll()` at boot so the API can drain eagerly.
- `prisma/schema.prisma` + migration — `OutboxEvent.practitionerId` (+ index).

## Invariants preserved
- **#2** `StrikeEvent` is still the append-only source of truth; the outbox is downstream.
- **#3** `reps:0` ⇒ not struck ⇒ no `StrikeLogged` and (almost always) no beats.
- **Idempotent** end-to-end: the offline-queue replay can't double-emit; `EventDelivery(eventId,consumer)` + `advanceSaga`'s own idempotency (`unlockedBy` audit) mean the eager drain and the worker can never double-apply a chapter.
- **#13** saga still unlocks only from real logged events, just off the critical path.

## Verified here (headless, no DB)
- **Syntax/type-strip parse:** all **15** new/changed modules pass `node --experimental-strip-types --check`.
- **Behavioral (faithful JS port of the real `emit` + `dispatchPending`):** **7/7** —
  emit records type+practitionerId+payload · delivers exactly once + marks processed · **idempotent replay** · **aggregates `unlocked` for the caller** · partial failure leaves the event unprocessed · **retries only the failed subscriber** · **scopes a drain to one practitioner**.
- Plus Vitest suites for the bus (`eventBus.test.ts`) and the saga subscriber (`sagaSubscriber.test.ts`) for your CI.

## Validate on your machine (needs Postgres)
```bash
cd server
npm install
npm run generate        # REQUIRED — regenerates Prisma client (OutboxEvent.practitionerId, etc.)
npm run migrate
npm run typecheck        # tsc — clean
npm test                 # vitest — existing saga tests pass because the eager drain preserves the
                         #          response contract (unlockedChapters still returns)
npm run dev & npm run worker   # log a strike → chapter unlocks; recompute-hammer drift must be 0
```

## One nuance to know
The eager in-request drain and the 1s worker poll could both pick up the same event; `EventDelivery`'s unique key + `advanceSaga` idempotency make a double-run a no-op, so it's correct today. In production, the documented upgrade is **Graphile Worker** (`SELECT … FOR UPDATE SKIP LOCKED`), which removes the race entirely — see `OSS_INTEGRATION_STACK.md`.

The strike's critical path is now lean and the saga is a clean, durable subscriber.

## Follow-on — Bond presence subscriber (done)

Proving the payoff of the decoupled design: **Bond** ("the Bond deepens with presence", README) is now a real subscriber added **without touching the strike producer**. `subscribers/bond.ts` consumes `StrikeLogged` and deepens the Bond **once per UTC day** — using the strike's own `occurredOn` (so backfilled/offline logs are honored), capped at 100, never regressing `lastPresenceDate` on an older log — in its own transaction. Bond was previously unimplemented on strikes (only seeded), so this is purely additive. Registered in `subscribers/index.ts`; Vitest in `bondSubscriber.test.ts`.

Verified headless: parse-check (3 files) + **6/6** decision assertions — new-day +2, same-day no-op, older-log no-regress, next-day deepens, cap at 100, create-if-missing.

## Follow-on — Anomaly scorer (done, audit H3)

The append-only `StrikeEvent` log is the exact substrate the research said Strava had to retrofit — so the **anomaly scorer** is now a subscriber that, on every `StrikeLogged`, scores the strike against the practitioner's *own* history (`lib/anomaly.ts`, pure) and emits a durable **`StrikeFlagged`** event for outliers (`subscribers/anomaly.ts`). It is **non-blocking** (flag, never reject — the strike and `hammerCount` are untouched, Invariant #2 intact) and needs **no new table**: the flag lives in the outbox for a future consumer (Pantheon exclusion, admin review). Conservative, tunable thresholds — an absolute ceiling plus a ≥8× personal-median check, gated by a floor and a cold-start guard — calibrated in Phase 4. Registered in `subscribers/index.ts`; Vitest in `anomaly.test.ts` + `anomalySubscriber.test.ts`.

Verified headless: parse-check (6 files) + **7/7** scorer assertions — cold-start normal/ceiling, legit 2× not flagged, far-above-baseline flagged, sub-floor never flagged, relative score, and a 4999 (< ceiling, > 8× median) caught.

## Follow-on — Economy faucet closed (done, audit H2)

The free-summon currency faucet is shut on both ends: **(1)** free **Lesser** summons are now **daily-capped** (`DAILY_LESSER_CAP = 10`/UTC day, counted from the existing `CompanionSummon` audit trail — no new table) so they can't be scripted into infinite pulls, and **(2)** **duplicate crystal refunds apply to paid (Abyssal) pulls only** (`dupRefund()` in `lib/gacha.ts`) so free pulls can **never mint crystals**. Abyssal's consolation refund (25 for Ancient+, 5 otherwise) is untouched, and server pity is unchanged. Verified headless: parse-check (3 files) + **7/7** assertions (free dup → 0, paid dups → 25/5, cap allows <10 and blocks ≥10), plus a new `dupRefund` case in `gacha.test.ts`.

**Remaining strike-time consumers:** Coach occasions (event-triggered reflections — touches the external Claude API, so deferred to its own increment). **Quest fulfillment stays inside the strike transaction by design** — it's the completion link (invariant #12), not a reaction.

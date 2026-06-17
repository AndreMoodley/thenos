# VOIDBORN — Phase 0 Execution Log (The Nervous System)

**Date:** 2026-06-16
**Status:** implemented + verified headless. **Additive and dark-launched — zero behavior change by default.**
**Implements:** the event backbone + edge hardening from `MASTER_PLAN.md` Phase 0 (audit **H1/M3**; architecture **CW1/CW2** groundwork).

## What landed

**New files**
- `server/prisma/migrations/20260616233851_event_backbone/migration.sql` — `OutboxEvent` + `EventDelivery` tables.
- `server/src/events/catalog.ts` — the typed `DomainEvent` union (shared vocabulary).
- `server/src/lib/events.ts` — `emit(tx, event)`: writes the outbox row **inside the caller's transaction** (atomic; no dual-write).
- `server/src/lib/eventBus.ts` — `register()` + `dispatchPending(prisma)`: the relay, **idempotent** via `EventDelivery(eventId, consumer)`, with per-subscriber retry.
- `server/src/subscribers/{logger,saga,index}.ts` — first subscribers + `registerAll()`.
- `server/src/worker.ts` — the relay process (`npm run worker`); production home for Graphile Worker.
- `server/src/__tests__/eventBus.test.ts` — Vitest unit tests.

**Edited (all additive)**
- `prisma/schema.prisma` — added the two models.
- `lib/sessionLog.ts` — emits `StrikeLogged` inside the existing strike transaction, **only when `struck`** (reps:0 ⇒ no event ⇒ invariant #3 holds).
- `app.ts` — `helmet()` + `express-rate-limit` (general + stricter `/auth`), **disabled under `NODE_ENV=test`**.
- `package.json` — `helmet`, `express-rate-limit` deps; `worker` script.

## Why it's safe

- **Dark launch:** the Saga subscriber is gated by `FLAG_EVENTBUS_SAGA` (**default off**) and the inline `advanceSaga` call is untouched — production behaves exactly as before. The backbone runs (events emitted, relayed, deliveries recorded) but the only always-on subscriber is the side-effect-free `logger`.
- **Invariants intact:** `StrikeEvent` stays the append-only source of truth; `OutboxEvent`/`EventDelivery` are a downstream, append-only audit; `reps:0` emits nothing.
- **Idempotent:** the offline-queue replay path can't double-emit (emit sits past the idempotency early-return), and `dispatchPending` never double-delivers.

## Verified here (headless, no DB)

- **Syntax/type-strip parse:** all 10 new/edited modules pass `node --experimental-strip-types --check`.
- **Behavioral (real `emit` + `dispatchPending` against an in-memory fake Prisma):** 6/6 assertions pass —
  emit writes one carrying row · delivers exactly once + marks processed · **replay is idempotent** · partial failure leaves the event unprocessed · **retry re-runs only the failed subscriber** · `handles()` opt-out is respected.

## To fully verify on your machine (needs Postgres)

```bash
cd server
npm install                       # pulls helmet + express-rate-limit
npm run generate                  # REQUIRED: regenerates Prisma client (adds outboxEvent / eventDelivery)
npm run migrate                   # applies 20260616233851_event_backbone  (or: migrate:deploy)
npm run typecheck                 # tsc --noEmit — clean
npm test                          # vitest — existing suites + eventBus.test.ts green
# live smoke:
npm run dev      # API, terminal 1
npm run worker   # relay, terminal 2  → log a strike, watch "[event] StrikeLogged <id>"
curl -XPOST :4000/admin/recompute-hammer/<id>   # drift must be 0 (integrity tripwire)
```

> If `prisma migrate dev` reports drift against the hand-written SQL, delete the migration folder and run `prisma migrate dev --name event_backbone` to let Prisma regenerate it from the schema — the models are the source of truth.

## Next (Phase 2 seam, when ready)

1. Port the full saga beat computation (returns, gates, streak, phase, cleanse — currently inline in `sessionLog.ts`) into `subscribers/saga.ts`.
2. Flip `FLAG_EVENTBUS_SAGA=1` and remove the inline `advanceSaga` call; verify with the parity harness + drift 0.
3. Repeat for Trials fulfillment, Bond, and Coach occasions → `sessionLog` shrinks to "write strike + emit."

The backbone is now live; every future subsystem (Evidence, Strength, Pantheon, Anomaly) attaches as a subscriber — no producer edits.

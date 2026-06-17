# VOIDBORN — Phase 1 Execution Log (Seal the Vault)

**Date:** 2026-06-17
**Theme:** close the money/outcome trust holes from `SECURITY_AUDIT.md`. **Server owns money and outcomes.**

## Done

| Audit item | Fix | Where |
|---|---|---|
| **H1** rate limiting · **M3** helmet · **M2** idempotency | edge hardening | `app.ts` (see `EXECUTION_P0.md`) |
| **H2** free-summon faucet | daily Lesser cap + paid-only dup refunds | `routes/companions.ts`, `lib/gacha.ts` (see `EXECUTION_P2.md`) |
| **C2** wager settled on the client's word | **dynamic, server-derived settlement** | this doc |

## C2 — dynamic, server-derived Wagered-Ki settlement

**The hole:** `/premium/wager-ki/settle` trusted a client `won` boolean → start → settle-as-won loop minted infinite crystals.

**The fix — the outcome is now derived server-side from real logged data, and the win condition is dynamic:**

- **`lib/wager.ts`** (pure, unit-tested) defines the criterion and the evaluator:
  - `streak` — hold a streak of any length you choose (7 / 30 / 90 / …).
  - `sessions` — log ≥ N sessions within a window of `days`.
  - `strikes` — accumulate ≥ N total reps within a window of `days`.
  - `evaluateWager(criterion, facts)` decides `won` from `{ streak, sessionsSinceStart, strikeAmountSinceStart }` — **never from the request**.
- **`/wager-ki/start`** now takes `{ amount, criterion }`, validates the criterion (Zod), stakes the crystals, stores the `criterion` + a computed `resolveAt` (`utcMidnight(start) + days`). Cap reframed from a weekly cap to a **max pending stake**.
- **`/wager-ki/settle`** takes **only `{ wagerId }`**. It refuses before `resolveAt` ("keep showing up"), then gathers real facts (the practitioner's `streak`, and `VoidSession`/`StrikeEvent` since the wager started) and evaluates. Win ⇒ `+amount×2`; otherwise `lost`. The stake was already taken at start, so a loss forfeits it.
- **Seamless connectivity:** settlement emits a **`WagerSettled`** domain event onto the bus (catalog), so future consumers — a saga "kept your word" beat, a coach occasion, Chronicle turning points — attach with no further change here.
- **Schema:** `WagerEvent.criterion (Json?)` + `resolveAt (DateTime?)`, migration `20260617102225_wager_criterion`.

**Why it's safe:** the client cannot declare victory; a win requires the commitment to actually be met *and* the horizon to have elapsed. `StrikeEvent` stays the append-only source of truth (Invariant #2); the stake/payout is server-authoritative (Invariant #6).

**Verified headless:** parse-check (4 files) + **8/8** assertions — streak 7/30/90 met vs missed, sessions/reps goals met vs short, and the 30-day `resolveAt` date math. Vitest in `wager.test.ts` for CI.

## Remaining (needs your input or environment)

- **C1 — verified RevenueCat reconcile:** entitlement grants must be validated against RevenueCat. Needs your **RevenueCat keys / sandbox** (can't fake).
- **C2 — Heavenly-Restriction settle** still trusts a client `success` and grants the Transcendent form + (real-money) Stripe settle. Same server-derivation pattern applies, but its win-criterion is the bound **Vow's** completion and it touches **Stripe** — so it's its own increment once those are defined.
- **L1/L2** — JWT `tokenVersion` revocation + bcrypt cost 12 (small, do alongside C1).

Validate on your machine: `npm run generate && npm run migrate && npm run typecheck && npm test` (the new `wager_criterion` migration applies the two columns).

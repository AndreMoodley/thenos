# VOIDBORN — Security & Integrity Audit (Key Weaknesses)

**Date:** 2026-06-16
**Scope:** `server/src/**` (auth, routes, lib, jobs, middleware), the client auth/sync seam (`voidborn/src/api`, `voidborn/src/store`), and `prisma/schema.prisma`. Cross-checked against the 15 invariants in `CLAUDE.md` and the claims in `docs/STATUS.md`.
**Not in scope:** native/device performance, authored art, R3F/Rive runtime, and a full dependency CVE / penetration test. Payment provider integration is intentionally stubbed (see `STATUS.md` "device-pending") — but the *authorization model* around it is live and is audited below.
**Method:** direct source reading + pattern sweeps. Every finding cites `file:line`.

---

## Summary

The architecture is genuinely strong where the invariants are *structural* — event-sourcing, computed realm/stage, idempotent session logging, server-side gacha + pity. The weaknesses cluster almost entirely at the **trust boundary**: the server frequently treats the client as an honest narrator of money, outcomes, and effort. For a single-player game most of this is "cheating only hurts yourself," but it directly breaks the **monetization** and **real-money escrow** paths, which is where it stops being harmless.

| Severity | Count | Theme |
|---|---|---|
| 🔴 Critical | 2 | Currency & entitlements granted on the client's word; escrow self-settled |
| 🟠 High | 3 | No abuse throttling; free-summon currency faucet; spoofable evolution |
| 🟡 Medium | 3 | Non-idempotent offline ops; optional idempotency key; permissive CORS / no headers |
| ⚪ Low | 3 | JWT lifecycle; bcrypt cost; missing audit log / DB constraints |

### What is already solid (context)
- **Invariant #1 holds.** No `realm`/`stage`/resolved-look column anywhere; `/entity/me` computes the realm from `hammerCount` at read time (`routes/entity.ts:41`, `schema.prisma` Practitioner model).
- **Invariant #2/#3 hold.** `StrikeEvent` is append-only and `hammerCount` is a reconcilable cache (`lib/reconcile.ts`); `reps:0` never strikes (`lib/metrics.ts:35-41`). Admin + nightly recompute correct drift (`routes/admin.ts:30-51`).
- **Idempotent session logging** by `(practitioner, clientId)` (`lib/sessionLog.ts:110-132`, `schema.prisma` `@@unique([practitionerId, clientId])`).
- **Gacha is server-only** with disclosed rates and server-side pity (`lib/gacha.ts`).
- **The JWT token is stored in `expo-secure-store`, not AsyncStorage** (`store/auth.ts:11`) — correct; AsyncStorage is used only for non-secret offline data.

These are the hard parts done right, which is why the findings below are mostly "close the trust boundary," not "re-architect."

---

## 🔴 Critical

### C1 — Entitlements and Void Crystals are granted from unverified client input
**Where:** `routes/premium.ts:48-68` (`POST /premium/reconcile`), helper `grantEntitlement` `:13-44`.
**What:** The endpoint is comment-labelled "Verified-purchase reconcile (RevenueCat)" but performs **no receipt or webhook verification**. It reads an `entitlements[]` + `consumables[]` array straight from the request body and grants them: any `form`/`domain`/`bloodline`/`cosmetic`/`aura`/`artifact`, plus up to `100000` crystals per call, with no upper bound on calls.
**Impact:** Any authenticated user can unlock **all paid content** and mint **unlimited crystals** with a single hand-written request — e.g. granting `form: transcendent_heavenly` (the form that is supposed to be obtainable "no other way"). This breaks Invariant #6 (server-authoritative currency & entitlements) and the entire monetization model.
**Fix:** Move the trust boundary server-side. `reconcile` must take a provider token/receipt and validate it against RevenueCat's REST API (or accept only signature-verified RevenueCat webhooks), then grant *only* what the verified entitlement payload says. Never accept the granted set or crystal amount from the client.

### C2 — Wagers and the real-money escrow are settled on the client's say-so
**Where:** `routes/premium.ts:99-117` (`/wager-ki/settle`, trusts body `won`), `:155-179` (`/heavenly-restriction/settle`, trusts body `success`), `:182-191` (`/cleanse`).
**What:** The settlement endpoints take the *outcome* as a client boolean.
- `wager-ki`: start decrements `N` crystals (`:90`); settle with `won:true` credits `2N` (`:110`). Net **+N crystals per cycle**, callable in a loop. The "weekly cap" only sums *pending* wagers (`:85-89`), so settling-then-restarting bypasses it.
- `heavenly-restriction`: settle with `success:true` self-grants the Transcendent form and skips the Restriction Scar (`:166-172`) — the paid commitment-contract is meaningless and forfeiture never happens.
- `/cleanse` clears corruption instantly with **no cost or purchase at all** — the "$1.99 Purification Talisman" is free.
**Impact:** Infinite soft currency; the marquee "proof, not cosmetic" reward is free; the real-money Soul Escrow has no integrity. Critical for both economy and (for escrow) consumer-protection/fraud exposure.
**Fix:** Derive `won`/`success` **server-side** from real logged state (e.g. the vow's criteria evaluated against `VoidSession`/`StrikeEvent`), not from the request. Gate `/cleanse` behind a verified purchase or the Penance path. Make the weekly cap count settled+pending.

---

## 🟠 High

### H1 — No rate limiting or abuse throttling anywhere
**Where:** `app.ts:22-27` (only `cors` + `express.json`; no limiter/helmet). Confirmed across all routers.
**What:** `/auth/login` and `/auth/signup` (`routes/auth.ts`) are unthrottled → credential stuffing, brute force, and mass account creation. All mutating endpoints (`/sessions`, `/practitioner/me/strike`, `/companions/summon`) are likewise open. The *only* throttle in the codebase is a soft 8-second per-practitioner gap on **live** coach calls (`routes/coach.ts:14,74`, plus `promptHash` caching) — there is no IP- or account-level limiting on auth or anything else, and `helmet`/`express-rate-limit` are not dependencies.
**Impact:** Account takeover via brute force; trivial amplification of every other exploit here (C1/C2/H2/H3) by scripting.
**Fix:** Add `express-rate-limit` (strict per-IP+account on auth; per-user budgets on summon/strike/coach). Consider an exponential lockout on repeated login failures.

### H2 — Free unlimited Lesser summons + duplicate refunds = a currency faucet
**Where:** `routes/companions.ts:40-60` (only `abyssal` costs crystals; `lesser` is free with no cap/cooldown), `lib/gacha.ts:19-21` (pity), `:141-147` (duplicate refund: +25 crystals for Ancient+, +5 otherwise).
**What:** Lesser pulls are free and unlimited, and server pity guarantees an Ancient within ≤50 pulls and a Void Herald within ≤100 — for *either* scroll. Once the collection is owned, every subsequent pity Ancient is a duplicate that **refunds crystals**. So a script that spams free Lesser summons both completes the collection and **mints crystals forever**, undermining Abyssal Scroll IAP and every crystal price.
**Impact:** Collapses the companion economy and a paid IAP. (Invariant #8 keeps RNG on the server — good — but says nothing about *free unlimited* pulls.)
**Fix:** Daily free-pull cap / cooldown on Lesser; exclude Ancient/Herald from the free pool *or* scope pity to paid pulls; remove or cap duplicate crystal refunds on free pulls.

### H3 — Evolution (`hammerCount`) is spoofable via unverified `reps` / `occurredOn`
**Where:** `lib/metrics.ts:59-62` (`StrikeEvent.amount = reps`, `hammerCount += reps`), `routes/sessions.ts:34` & `routes/practitioner.ts:45` (`reps` max **100000**), `occurredOn` client-supplied (`sessions.ts:36`, `practitioner.ts:47`).
**What:** Invariant #2 guarantees `hammerCount == Σ StrikeEvent`, but the strike *amount* is just the client's self-reported reps, uncapped beyond 100k and with no per-day ceiling. A few hand-made sessions reach Divine Master (73,000). Client-chosen `occurredOn` also lets a user manufacture streaks (≥7 unlocks bonus orbit + the "Hidden Master" saga beat) and backfill history.
**Impact:** "Earned, never spoofed" holds for the *cache*, not the *inputs*. Erodes the core ethos and, more concretely, the self-reported success that the real-money Heavenly Restriction ultimately depends on.
**Fix:** Realistic per-session and per-day rep ceilings by modality; reject future/old `occurredOn` beyond a small window; for escrow proofs, require linkage to `PlannedSession`/trial cadence rather than raw reps.

---

## 🟡 Medium

### M1 — Offline `seal` and `anchor` are not idempotent on replay
**Where:** `routes/sync.ts:116-122`. `session` and `leak` dedupe by `clientId`; **`seal` and `anchor` ignore it**.
**What:** STATUS claims "`/sync/flush` idempotent by `clientId` (no double-count)." True for sessions/leaks, but a re-flushed batch re-applies `seal` (ki += amount each replay) and re-stamps `anchor`. `ki` is clamped 0–100 so the blast radius is bounded, but it contradicts the stated invariant and lets a user trivially max `ki` by replaying.
**Fix:** Dedupe `seal`/`anchor` by `(practitioner, clientId)` like the other mutations (a processed-clientId table or unique constraint).

### M2 — `clientId` is optional on the online session writes → retries double-count
**Where:** `routes/sessions.ts:37` and `routes/practitioner.ts:48` (`clientId … optional`).
**What:** The offline queue always sends a `clientId` (`sync.ts` requires `min(1)`), but the direct `POST /sessions` and `/me/strike` make it optional. A network retry without it creates a second `VoidSession` + `StrikeEvent` → real online double-count of `hammerCount`.
**Fix:** Require `clientId` (an idempotency key) on every mutating session/strike write; reject writes without one.

### M3 — Permissive CORS default and no security headers
**Where:** `app.ts:25-26` (`cors(... : {})` reflects any origin when `CORS_ORIGINS` is unset); no `helmet`.
**What:** A production deploy that forgets `CORS_ORIGINS` reflects every origin. Bearer-token-in-header keeps CSRF risk low, but the web "Add to Home Screen" target runs in a browser, and there are no `helmet` headers (HSTS, X-Content-Type-Options, Referrer-Policy, etc.).
**Fix:** Fail closed — require an explicit allow-list in production; add `helmet`.

---

## ⚪ Low

### L1 — JWT lifecycle: 7-day tokens, no revocation or rotation
**Where:** `middleware/auth.ts:18-28`, `routes/auth.ts:68-75` (`/refresh` re-issues without rotation).
**What:** A leaked token is valid for up to 7 days with no server-side invalidation; logout is client-only; refresh doesn't rotate or shorten-lived access + refresh split. Acceptable for a game, but worth a `tokenVersion` claim (bump to revoke) before real money flows.

### L2 — bcrypt cost factor 10
**Where:** `routes/auth.ts:28`. Fine today; 12 is the current recommendation. (`bcryptjs` is pure-JS and slower, so 10 is a deliberate tradeoff — note it, don't block on it.)

### L3 — No audit log on sensitive ops; `StrikeEvent.amount` not constrained
**Where:** `routes/premium.ts` (grants/settles log nothing), `schema.prisma` `StrikeEvent.amount Int` (no `> 0` check / DB constraint).
**What:** Entitlement grants and wager settlements leave no audit trail, and the append-only log has no defense-in-depth guard that `amount > 0`. Add structured audit rows for money/entitlement events and a DB-level check constraint.

---

## Recommended remediation order

1. **C1 + C2** — close the payment/escrow trust boundary (server-verified receipts; server-derived outcomes; gate `/cleanse`). Nothing involving real money should ship before this.
2. **H1** — add rate limiting (also blunts every other exploit).
3. **H2 + H3** — cap the free-summon faucet and add realistic rep/`occurredOn` ceilings.
4. **M1–M3** — idempotency on `seal`/`anchor`, require `clientId`, lock down CORS + add `helmet`.
5. **L1–L3** — token revocation claim, bcrypt 12, audit log + DB constraints.

> Most of these are a few lines each and don't touch the (well-built) event-sourced core. The single highest-leverage change is to stop accepting *money, outcomes, and grants* from the client and derive them server-side.

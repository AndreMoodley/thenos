# VOIDBORN — Master Implementation Plan

**Date:** 2026-06-16
**Implements:** every change from `SECURITY_AUDIT.md`, `RESEARCH_PLAYBOOK.md`, `PROOF_OF_EFFORT_DESIGN.md`, `PRACTITIONER_SHOWCASE_DESIGN.md`, `MASTER_ARCHITECTURE.md`, and `OSS_INTEGRATION_STACK.md` — sequenced so the system stays **hyperconnected** throughout.

---

## Prime directive — how we keep it hyperconnected

Hyperconnected does **not** mean "wire everything to everything." It means **everything is linked through two backbones, and nothing is coupled through code:**

1. **The type backbone** — a monorepo + shared Zod/tRPC contract, so client and server share one source of truth and a change propagates by types, not by hand.
2. **The event backbone** — a transactional **outbox → domain event bus**, so every subsystem reacts to facts as an **idempotent subscriber**, never by a direct cross-module call.

**The rule that preserves it:** *both backbones are built in Phase 0, before any new feature.* From then on, every phase connects by **emitting/subscribing to events** and **calling typed procedures** — so adding Evidence, Strength, or Pantheon never edits the strike hub, and the architecture gets *more* connected without getting *more tangled*.

### Guardrails on every phase (non-negotiable)
- **Green build at all times** — strangler-fig, additive; never a big-bang rewrite. Each phase ships independently.
- **The 15 invariants are sacred** — no stored realm/look; `StrikeEvent` append-only & reconcilable; `reps:0`⇒no strike; server-authoritative currency/gacha; additive-only; trials/saga free & link-not-strike. (See `MASTER_ARCHITECTURE.md §4` for the per-invariant check.)
- **Server owns money, outcomes, and grants** — derived server-side, behind verified adapters.
- **Hyperconnectivity check** — every new behavior flows through the outbox/bus and a typed procedure. If a phase adds a direct cross-module call, it's wrong.

---

## The phases at a glance

| Phase | Theme | Outcome | Critical path? |
|---|---|---|---|
| **P0** | **The Nervous System** | Type + event backbones live; edge hardened | ✅ blocks all |
| **P1** | **Seal the Vault** | Money/outcomes server-derived; exploits closed | ✅ blocks monetization |
| **P2** | **Decouple the Core** | All fan-out is event subscribers; `logSession` slims | ✅ enables subsystems |
| **P3** | **Local-First Reforged** | Modern sync engine; write-path unchanged | parallelizable |
| **P4** | **Proof of the Path** | Evidence tiers + strength score + anti-cheat | needs P2 |
| **P5** | **The Pantheon** | Verified, opt-in showcase | needs P4 |
| **P6** | **Feel, Sight & Sense** | Skia/R3F juice + full observability | parallel track |

---

## Phase 0 — The Nervous System *(connectivity backbone first)*
**Objective:** lay both backbones so everything afterward connects through them.

**Work**
- **Monorepo** (Turborepo + pnpm) with a shared `packages/contract` holding **Zod schemas + tRPC routers + the domain-event catalog** (`StrikeLogged`, `RealmCrossed`, `FeatVerified`, `PurchaseVerified`, …).
- Stand up **tRPC** on 2–3 read routes alongside the existing client (additive).
- Add the **transactional outbox**: an `OutboxEvent` table written *in the same transaction* as the domain change; **Graphile Worker** as the relay (Postgres-native, no Redis) + the event-bus dispatch (LISTEN/NOTIFY or Graphile tasks-as-subscribers).
- Emit `StrikeLogged` from `logSession` inside its existing transaction; **migrate the Saga consumer** to a subscriber (the rest stay inline for now). Verify parity vs the old inline path.
- **Edge hardening (cheap + high-value):** `helmet` + `express-rate-limit` on `/auth/*` and mutating routes; require `clientId` idempotency keys on all session writes. → closes **H1, M2, M3**.

**Hyperconnectivity:** the backbones themselves. From here, "add a feature" = "add a subscriber + a typed procedure."
**OSS introduced:** Turborepo/pnpm, tRPC, Graphile Worker, helmet, express-rate-limit.
**Exit gate:** `StrikeLogged` flows outbox→relay→Saga with identical results to the old call; rate-limit + idempotency verified; build green; invariants intact.

---

## Phase 1 — Seal the Vault *(money & outcome integrity — the must-ship-before-real-money phase)*
**Objective:** close every client-trust hole the audit found.

**Work**
- **Verified purchase adapter (C1):** `/premium/reconcile` accepts only a verified RevenueCat customer-info payload / signature-verified webhook; grant *only* what the store confirms. Behind a hexagonal **Economy port**.
- **Server-derived settlement (C2):** `won`/`success` computed from `VoidSession`/`StrikeEvent`/vow criteria — never from the request. Gate `/cleanse` behind a verified purchase or Penance. Fix the weekly wager cap to count settled+pending.
- **Economy anti-faucet (H2):** daily cap/cooldown on free Lesser summons; remove/limit duplicate crystal refunds on free pulls.
- **Effort ceilings (H3, first cut):** realistic per-session/-day rep caps by modality; reject far-past/future `occurredOn`.
- **Auth lifecycle (L1/L2):** bcrypt cost 12; `tokenVersion` claim for revocation.
- **WORM audit (start L3):** append money/entitlement events to an object-locked store.

**Hyperconnectivity:** settlement emits `PurchaseVerified` / `WagerSettled`; entitlement grants and the WORM audit are **subscribers**, not inline writes.
**OSS introduced:** RevenueCat server SDK (verified adapter), MinIO/S3 object-lock for WORM.
**Exit gate:** no endpoint grants currency/entitlements/forms from client input; wager loop & escrow self-settle exploits closed; audit rows written.

---

## Phase 2 — Decouple the Core *(finish the event migration)*
**Objective:** remove the god-transaction; everything becomes a subscriber.

**Work**
- Migrate the remaining inline fan-out — **Trials fulfillment, Bond, Coach occasions, realm-crossing reactions** — to **subscribers** of `StrikeLogged`/`RealmCrossed`/`QuestFulfilled`.
- `logSession` shrinks to **"write `StrikeEvent` + emit `StrikeLogged`"** in one tx.
- Introduce **repository ports** for Training/Progression/Trials/Saga (routes stop importing Prisma directly → fixes **CW3**).
- Stand up the **Anomaly Scorer** worker (stub) consuming `StrikeLogged`, scoring against the user's own `StrikeEvent` history → flags outliers (H3 groundwork, Strava-style).

**Hyperconnectivity:** this is the phase that *realizes* it — `advanceSaga`'s 4 inline call-sites collapse into one subscriber; new consumers never touch `logSession`.
**OSS introduced:** (none new — uses P0 backbone) + your existing Vitest for parity tests.
**Exit gate:** `logSession` has **zero** direct cross-module calls; saga/trials/bond/coach all fire from events; `recompute-hammer` drift stays 0.

---

## Phase 3 — Local-First Reforged *(client sync & state — parallelizable)*
**Objective:** retire the bespoke offline layer for a battle-tested engine, write-path unchanged.

**Work**
- Adopt **PowerSync** (writes still route through your backend → preserves Inv #6) for read/sync; **fully-MIT alternative: WatermelonDB**.
- **TanStack Query** (+ AsyncStorage persister) for server-state cache; keep **Zustand** for UI state.
- Keep the **append-only `StrikeEvent`** as the grow-only conflict-free set; reserve LWW for scalar fields with logical timestamps (avoid silent loss — CW5).

**Hyperconnectivity:** the client now consumes the same typed contract (tRPC) and hydrates from the same event-sourced state; sync deltas ride the bus on the server side.
**OSS introduced:** PowerSync **or** WatermelonDB, TanStack Query (+persist).
**Exit gate:** offline read/hydrate works from cache; writes remain server-authoritative; flush replay idempotent (the M1 `seal`/`anchor` dedupe lands here too).

---

## Phase 4 — Proof of the Path *(evidence & strength — needs P2)*
**Objective:** make ascension provable; turn the `StrikeEvent` log into anti-cheat.

**Work**
- **Evidence Ladder** (`EvidenceSubmission`/`VerificationResult`, append-only) with tiers **T0→T3**; realm gates read the **max verified tier**.
- **Start tier-1 sensor/manual** (Apple Health / Health Connect + GPS, no CV) — fastest win, fully automated.
- **On-device CV:** `react-native-vision-camera` + `react-native-mediapipe-posedetection` (BlazePose, New-Arch) for rep + ROM; **Skia** skeleton overlay.
- **Discipline adapters** (calisthenics / running / powerlifting) — metric, evidence type, analysis, thresholds, anti-cheat per art.
- **Strength Score** module: **DOTS** (barbell) + relative-strength (calisthenics) → normalized 0–1000.
- **Anti-cheat:** `c2pa-node` provenance + perceptual-hash dedup + sensor fusion; promote the P2 anomaly scorer to production (H3 full).
- **Pipeline plumbing:** **tus** resumable uploads → **MinIO**; presigned; safety moderation on gated submissions.

**Hyperconnectivity:** verification emits `EvidenceSubmitted` / `FeatVerified{tier,strengthScore}`; Progression unlocks gated realms as a **subscriber**; the Strength module is a **subscriber**.
**OSS introduced:** vision-camera, react-native-mediapipe-posedetection, react-native-skia (CV overlay), tus, c2pa-node, perceptual-hash lib.
**Exit gate:** a gated realm requires a verified tier; spoofed/anomalous feats are flagged and **excluded** from progression; stillness (`reps:0`) still never strikes.

---

## Phase 5 — The Pantheon *(showcase — needs P4)*
**Objective:** celebrate top practitioners, ranked only on proven feats.

**Work**
- **Strength & Pantheon** module subscribes to `FeatVerified`; **Pantheon Materializer** worker builds per-art, per-cohort boards (verified-only) + **Risers**.
- **Opt-in `ShowcaseProfile`** with granular visibility; **entity-fronted** cards (R3F/Skia render of `resolveManifestation`); **Proof Reel** of opt-in verified media; **share cards**.
- Consent/safety: pseudonymous, minors excluded, no global last place, one-tap leave. (README already updated to drop "no leaderboards.")

**Hyperconnectivity:** Pantheon is a pure **read-model/subscriber** over `FeatVerified` — adding it touched nothing upstream. Proof of the decoupled design working.
**OSS introduced:** (reuses R3F + Skia from P4/P6); Victory Native for any stat charts.
**Exit gate:** only **verified** feats rank; opt-in + visibility honored; minors/anomalies excluded.

---

## Phase 6 — Feel, Sight & Sense *(parallel track — can run alongside P1–P5)*
**Objective:** native-grade juice, richer spaces, full observability.

**Work**
- **react-native-skia + Reanimated** for the Ki bar, auras, tap-bursts, ascension VFX, and the **2.5D `FallbackEntity`** (500-particle draw calls).
- **R3F ecosystem** — drei / rapier / postprocessing / gltfjsx / **Theatre.js** (cinematics) for Domains + the Pantheon entity render.
- **Observability:** **OpenTelemetry** traces spanning strike→event→subscriber; **Sentry** crash/error; finish the **WORM audit** + structured logging (L3, CW7).

**Hyperconnectivity:** OTel trace context follows the event across every subscriber — you can watch one strike fan out end-to-end.
**OSS introduced:** react-native-skia, @react-three/{drei,rapier,postprocessing}, gltfjsx, Theatre.js, OpenTelemetry, Sentry.
**Exit gate:** 60fps on a mid-range dev build; a single trace spans the whole strike→subscriber chain.

---

## Dependencies & parallel tracks

```
P0 ─▶ P1 ─▶ P2 ─▶ P4 ─▶ P5      (critical path: backbone → money → decouple → evidence → pantheon)
        └─────────┐
P3 (sync) ────────┼─ parallel after P0
P6 (feel/obs) ────┘  parallel after P0 (client-only; obs hooks into the bus from P2)
```
- **Critical path:** P0 → P1 → P2 → P4 → P5.
- **Parallel track A (Client):** P3 (sync) and the Skia/R3F half of P6 are client-only and can run alongside the backend phases once P0's contract exists.
- **Parallel track B (Observability):** the OTel/Sentry half of P6 can start as soon as the bus exists (P2) and grows with each subsequent phase.

---

## Coverage matrix — every prior recommendation has a home

| Source item | Lands in |
|---|---|
| C1 entitlement/crystal grants · C2 escrow self-settle | **P1** |
| H1 rate limiting · M2 idempotency keys · M3 CORS/helmet | **P0** |
| H2 free-summon faucet · H3 effort ceilings (cut 1) · L1 token revocation · L2 bcrypt · L3 audit (start) | **P1** |
| H3 anomaly detection (full) | **P2 stub → P4 prod** |
| M1 `seal`/`anchor` idempotency | **P3** |
| Event-driven modular monolith · outbox+bus · CW1/CW2 | **P0 → P2** |
| Hexagonal ports/adapters · CW3 | **P1 (Economy) → P2 (rest)** |
| Worker tier · CW4 | **P0 (relay) → P4/P5 (jobs)** |
| Offline-first engine · CW5 | **P3** |
| Observability/WORM · CW7 | **P1 (audit) → P6 (tracing)** |
| Evidence Ladder · discipline adapters · DOTS/relative strength · provenance/dedup/sensor-fusion | **P4** |
| Health corroboration | **P4 (tier-1)** |
| Pantheon · profiles · entity cards · consent/ethical leaderboard | **P5** |
| tRPC · monorepo/shared types | **P0** |
| Graphile Worker · PowerSync/WatermelonDB · TanStack Query | **P0 / P3** |
| Skia · R3F ecosystem · Theatre.js · vision-camera+MediaPipe · tus · MinIO · c2pa-node · OTel/Sentry | **P4 / P6** |

---

## Risks & mitigations
- **Refactor regression (P0–P2).** Mitigate with **parity tests**: run old inline path vs new subscriber on the same input until identical; flip behind a flag; keep `recompute-hammer` drift at 0 as the integrity tripwire.
- **Verification cost/abuse (P4).** On-device CV by default (≈$0); server moderation/re-score only on gated submissions; perceptual-hash dedup + anomaly scoring catch reuse.
- **Showcase wellbeing (P5).** Verified-only + peer cohorts + opt-in + minors excluded + no global last place (per `PRACTITIONER_SHOWCASE_DESIGN.md`).
- **OSS license/maintenance.** MinIO/Grafana are AGPL; PowerSync has a paid managed tier; vet the RN-MediaPipe wrapper's license/New-Arch support before locking (see `OSS_INTEGRATION_STACK.md` caveats).
- **Scope for a solo dev.** The phasing lets you **stop after P2** with a hardened, decoupled, monetization-safe app and still have shipped real value; P4–P6 are upside.

---

## Definition of done (the whole plan)
A verified strike enters offline, syncs through a server-authoritative write path, writes an append-only fact **and** a domain event in one transaction, and the bus fans it to Saga, Trials, Strength, Anomaly, Coach, and Bond — each an idempotent subscriber added without touching the others. Money and outcomes are server-derived behind verified adapters; effort is provable through tiered on-device evidence; ascension is comparable through bodyweight-normalized strength and celebrated in a verified, opt-in Pantheon; the entity feels native via Skia/R3F; and one OpenTelemetry trace follows a single strike across the whole chain. Every one of the 15 invariants still holds. **Hyperconnected by events, decoupled in code, unkillable by design.**

---

### Source docs
`SECURITY_AUDIT.md` · `RESEARCH_PLAYBOOK.md` · `PROOF_OF_EFFORT_DESIGN.md` · `PRACTITIONER_SHOWCASE_DESIGN.md` · `MASTER_ARCHITECTURE.md` · `OSS_INTEGRATION_STACK.md`

---
---

# Part II — Execution Detail (the build-ready layer)

Part I is the strategy. Part II is everything you need to actually start: sizing, ticket-level checklists tied to your real files, the schema/event deltas, the test & rollback strategy, metrics, and a concrete Phase-0 starter.

## II.1 Sizing & the solo-dev path

T-shirt sizing (relative effort, not calendar — adjust to your pace). **Critical path** is bold.

| Phase | Size | Depends on | Track | Can ship & stop? |
|---|---|---|---|---|
| **P0 Nervous System** | **M** | — | backbone | hardened edge alone is worth it |
| **P1 Seal the Vault** | **M** | P0 | critical | ✅ monetization-safe milestone |
| **P2 Decouple the Core** | **L** | P0 | critical | ✅ clean, decoupled core |
| P3 Local-First | M | P0 | parallel | optional polish |
| **P4 Proof of the Path** | **XL** | P2 | critical | the differentiator |
| **P5 The Pantheon** | **M** | P4 | critical | growth layer |
| P6 Feel/Sight/Sense | L | P0 (feel), P2 (obs) | parallel | continuous |

**Recommended solo order:** P0 → P1 → P2 → *(start P6-feel in spare cycles)* → P4 → P5 → P3 → finish P6-observability. Stopping after **P2** leaves a hardened, decoupled, monetization-safe app; P4–P5 are the upside.

## II.2 Schema deltas (Prisma) — the complete set

Additive only; no column dropped. New models + two field adds:

```prisma
// NEW — the outbox (append-only audit of domain events; relay marks processedAt)
model OutboxEvent {
  id           String    @id @default(cuid())
  type         String    // 'StrikeLogged' | 'FeatVerified' | 'PurchaseVerified' | ...
  payload      Json
  occurredAt   DateTime  @default(now())
  processedAt  DateTime? // set by the relay after successful dispatch
  @@index([processedAt, occurredAt])
}

// NEW — audit of every consumer run (idempotency + replay safety)
model EventDelivery {
  id        String   @id @default(cuid())
  eventId   String
  consumer  String   // 'saga' | 'trials' | 'pantheon' | ...
  status    String   // 'ok' | 'failed'
  createdAt DateTime @default(now())
  @@unique([eventId, consumer]) // a consumer processes an event at most once
}

// FIELD ADDS
// model StrikeEvent { … proofTier Int @default(0) }          // evidence tier that backed it
// model Practitioner { … tokenVersion Int @default(0) }      // JWT revocation (audit L1)
```

Plus the models already specced in the design docs (reproduced here for one-stop reference): `EvidenceSubmission`, `VerificationResult`, `Discipline` (`PROOF_OF_EFFORT_DESIGN.md §7`); `ShowcaseProfile`, `PantheonEntry` (`PRACTITIONER_SHOWCASE_DESIGN.md §6`).

## II.3 Domain event catalog (payloads)

Single source of truth in `packages/contract/events.ts`. Facts/IDs only — never resolved looks.

```ts
type DomainEvent =
  | { type:'StrikeLogged';     practitionerId:string; strikeId:string; amount:number; modality:Modality; occurredOn:string; before:number; after:number }
  | { type:'RealmCrossed';     practitionerId:string; from:number; to:number }
  | { type:'StreakReached';    practitionerId:string; days:number }
  | { type:'QuestFulfilled';   practitionerId:string; plannedSessionId:string; trialId:string; kind:PlannedKind }
  | { type:'PhaseEntered';     practitionerId:string; trialId:string; phaseKey:string }
  | { type:'EvidenceSubmitted';practitionerId:string; submissionId:string; disciplineKey:string; realmGate?:number }
  | { type:'FeatVerified';     practitionerId:string; submissionId:string; tier:number; strengthScore:number; disciplineKey:string }
  | { type:'FeatFlagged';      practitionerId:string; submissionId:string; reason:string }
  | { type:'PurchaseVerified'; practitionerId:string; entitlements:{kind:string;productKey:string}[]; crystals:number; source:'revenuecat' }
  | { type:'WagerSettled';     practitionerId:string; wagerId:string; outcome:'won'|'lost' }
  | { type:'CorruptionChanged';practitionerId:string; corrupted:boolean }
  | { type:'SeasonRolled';     seasonKey:string };
```

## II.4 Per-phase ticket checklists (grounded in your files)

**P0 — Nervous System**
- [ ] Convert repo to **Turborepo + pnpm**; create `packages/contract` (Zod + tRPC routers + `events.ts`).
- [ ] Add `OutboxEvent` + `EventDelivery` models; migration.
- [ ] `server/src/lib/events.ts`: `emit(tx, event)` writes an `OutboxEvent` **inside the caller's transaction**.
- [ ] Stand up **Graphile Worker** worker entrypoint `server/src/worker.ts`; relay task reads unprocessed `OutboxEvent`s, dispatches, marks `processedAt`.
- [ ] In `lib/sessionLog.ts`, after the strike write, `emit(tx, {type:'StrikeLogged', …})` (keep existing inline calls for now).
- [ ] Move **Saga** off the inline `advanceSaga` call → a subscriber keyed by `EventDelivery(eventId,'saga')`.
- [ ] `app.ts`: add `helmet`, `express-rate-limit` (strict on `/auth/*`); idempotency-key middleware.
- [ ] Make `clientId` **required** in `routes/sessions.ts` + `routes/practitioner.ts` (audit M2).
- [ ] tRPC bootstrap on 2–3 read procedures (`/entity/me`, `/sync/state`) alongside the existing client.

**P1 — Seal the Vault**
- [ ] `Economy` port + RevenueCat **verified** adapter; rewrite `routes/premium.ts` `/reconcile` to grant only store-confirmed entitlements (C1).
- [ ] Server-derive `/wager-ki/settle` & `/heavenly-restriction/settle` from real state; remove client `won`/`success` (C2). Gate `/cleanse`.
- [ ] Fix weekly wager cap to count settled+pending; emit `WagerSettled`/`PurchaseVerified`.
- [ ] `routes/companions.ts`: daily free-summon cap + drop dupe-refund on free pulls (H2).
- [ ] Rep/day ceilings + `occurredOn` window in `lib/metrics.ts`/validators (H3 cut-1).
- [ ] `bcrypt` cost → 12; add `tokenVersion` check in `middleware/auth.ts` (L1/L2).
- [ ] WORM audit subscriber on money/entitlement events (L3 start).

**P2 — Decouple the Core**
- [ ] Move **Trials fulfillment**, **Bond**, **Coach occasions**, **realm-crossing** reactions to subscribers.
- [ ] Reduce `lib/sessionLog.ts` to: idempotency check → write `StrikeEvent` (`applyStrike`) → `emit(StrikeLogged)`.
- [ ] Repository ports for Training/Progression/Trials/Saga; routes call services, not Prisma (CW3).
- [ ] `AnomalyScorer` worker (stub) on `StrikeLogged` → flags outliers vs the user's `StrikeEvent` history.
- [ ] Parity tests green; `recompute-hammer` drift 0.

**P3 — Local-First** · [ ] PowerSync (or WatermelonDB) read-sync; [ ] TanStack Query + persist; [ ] dedupe `seal`/`anchor` in `routes/sync.ts` (M1); [ ] keep server-authoritative writes.

**P4 — Proof of the Path** · [ ] `EvidenceSubmission`/`VerificationResult`/`Discipline` models; [ ] tier-1 Health/GPS first; [ ] vision-camera + MediaPipe pose; Skia overlay; [ ] tus → MinIO; [ ] c2pa-node + perceptual hash; [ ] DOTS/relative `strengthScore`; [ ] `StrikeEvent.proofTier`; [ ] gates read max verified tier; [ ] promote AnomalyScorer to prod (H3 full).

**P5 — The Pantheon** · [ ] `ShowcaseProfile`/`PantheonEntry`; [ ] `PantheonMaterializer` on `FeatVerified`; [ ] opt-in profiles + visibility; [ ] entity cards + proof reel; [ ] share cards.

**P6 — Feel/Sight/Sense** · [ ] Skia Ki bar/auras/particles + 2.5D `FallbackEntity`; [ ] R3F drei/rapier/postprocessing/gltfjsx/Theatre.js; [ ] OpenTelemetry across the chain; [ ] Sentry; [ ] finish WORM audit (L3).

## II.5 Testing & verification strategy

- **Parity harness (P0–P2):** a test runs the *old inline path* and the *new subscriber path* on identical input and asserts equal DB end-state; keep both behind a flag until parity holds.
- **Integrity tripwire (every phase, in CI):** seed → run flows → `POST /admin/recompute-hammer` ⇒ **drift must be 0**. This is the non-negotiable invariant check.
- **Idempotency tests:** replay the same `clientId`/event ⇒ no double-count, `EventDelivery` unique holds.
- **Per-gate automated checks** map 1:1 to each phase's exit gate (Part I).
- **Keep green:** existing Vitest suites (realms, gacha, protocol, adherence, sagaBeats, sagaForge) plus new per-phase suites.

## II.6 Feature flags & rollback

Every migration ships behind a flag; dual-run, verify parity, then flip. Rollback = flip the flag back (no redeploy).

`FLAG_EVENTBUS_SAGA` (P0) · `FLAG_VERIFIED_PREMIUM` (P1) · `FLAG_EVENTBUS_FULL` (P2) · `FLAG_POWERSYNC` (P3) · `FLAG_EVIDENCE_GATES` (P4) · `FLAG_PANTHEON` (P5). The append-only `StrikeEvent` + `recompute-hammer` mean even a bad flip can't corrupt progression.

## II.7 Success metrics (measurable, per phase)

| Phase | Metric → target |
|---|---|
| P0 | events dispatched with **0 lost** (outbox processed == emitted); auth brute-force blocked at rate limit |
| P1 | **0** endpoints grant currency/entitlements from client input (pen-test); wager exploit irreproducible |
| P2 | `sessionLog` cross-module calls **= 0**; drift **= 0**; consumer add touches **0** existing files |
| P3 | full loop works airplane-mode; flush replay **0** double-counts |
| P4 | gated realm requires verified tier; spoofed feat acceptance rate **→ ~0**; on-device CV ≈ **$0**/session |
| P5 | only verified feats rank; **0** non-opted-in profiles public; minors excluded |
| P6 | **60fps** mid-range dev build; **1** trace spans strike→all subscribers |

## II.8 Phase-0 starter (begin here)

**Monorepo layout**
```
voidborn-monorepo/
├─ apps/mobile/        # the Expo app (today's voidborn/)
├─ apps/server/        # Express + worker (today's server/)
├─ packages/contract/  # Zod schemas · tRPC routers · events.ts  ← shared truth
└─ turbo.json · pnpm-workspace.yaml
```

**Atomic emit (transactional outbox)** — `apps/server/src/lib/events.ts`
```ts
import type { Prisma } from '@prisma/client';
import type { DomainEvent } from '@voidborn/contract';
export async function emit(tx: Prisma.TransactionClient, e: DomainEvent) {
  await tx.outboxEvent.create({ data: { type: e.type, payload: e as any } });
}
```
In `lib/sessionLog.ts`, inside the existing `prisma.$transaction`, after the strike: `await emit(tx, { type:'StrikeLogged', practitionerId, strikeId: session.id, amount: input.reps, modality: input.modality, occurredOn: occurredOn.toISOString(), before, after });`

**Relay + subscriber (Graphile Worker)** — `apps/server/src/worker.ts`
```ts
import { run } from 'graphile-worker';
import { subscribers } from './subscribers';        // { saga, trials, ... }
await run({
  connectionString: process.env.DATABASE_URL!,
  concurrency: 4,
  crontab: '* * * * * relay',                        // poll outbox every minute (or LISTEN/NOTIFY)
  taskList: {
    relay: async (_p, h) => {
      const evs = await h.query(`SELECT * FROM "OutboxEvent" WHERE "processedAt" IS NULL ORDER BY "occurredAt" LIMIT 100`);
      for (const ev of evs.rows) {
        for (const [name, fn] of Object.entries(subscribers)) {
          try { await fn(ev.payload); await markDelivered(ev.id, name); }   // EventDelivery unique = idempotent
          catch (e) { /* leave unprocessed → retried */ }
        }
        await h.query(`UPDATE "OutboxEvent" SET "processedAt"=now() WHERE id=$1`, [ev.id]);
      }
    },
  },
});
```
First subscriber — `subscribers/saga.ts`: wrap the existing `advanceSaga` so it runs from `StrikeLogged` instead of the inline call.

**tRPC bootstrap** — `packages/contract/trpc.ts` (router) + `apps/mobile` client over `httpBatchLink`, validated with your existing Zod schemas; wrap reads in TanStack Query.

> Done-when (P0): a real strike writes `StrikeEvent` + `OutboxEvent` in one tx, the relay dispatches `StrikeLogged`, Saga advances **via the subscriber**, `recompute-hammer` drift is 0, and the two tRPC read procedures return type-checked data to the app.

## II.9 Master tracker

```
P0 ▢ monorepo+contract  ▢ outbox+relay  ▢ StrikeLogged→Saga sub  ▢ helmet/rate-limit/idempotency  ▢ tRPC reads
P1 ▢ verified RevenueCat ▢ server-derived settle ▢ /cleanse gate ▢ summon cap ▢ rep ceilings ▢ token rev] ▢ WORM
P2 ▢ trials/bond/coach subs ▢ slim sessionLog ▢ repo ports ▢ anomaly stub ▢ parity+drift0
P3 ▢ PowerSync/Watermelon ▢ TanStack Query ▢ seal/anchor dedupe
P4 ▢ evidence models ▢ tier-1 sensor ▢ CV(pose) ▢ tus+MinIO ▢ c2pa+phash ▢ DOTS/rel ▢ gates ▢ anomaly prod
P5 ▢ showcase models ▢ materializer ▢ opt-in profiles ▢ entity cards+reel ▢ share cards
P6 ▢ Skia juice ▢ R3F eco ▢ Theatre.js ▢ OTel ▢ Sentry ▢ audit finish
```

**The plan is complete: strategy (Part I) + build-ready execution (Part II). Start at II.8.**

# VOIDBORN — Master Architecture (The Immortalized Blueprint)

**Date:** 2026-06-16
**Status:** the canonical, hyperconnected target architecture. Folds together every prior workstream:
`SECURITY_AUDIT.md` · `RESEARCH_PLAYBOOK.md` · `PROOF_OF_EFFORT_DESIGN.md` · `PRACTITIONER_SHOWCASE_DESIGN.md`.
**Goal (the ultimate app):** *earned ascension, made legible and credible* — a being you raise on real training, now provable (evidence), comparable (strength metrics), and celebrated (Pantheons), wired together so each subsystem strengthens the others instead of bolting on.

This document is the **Repo Map + target shape**: where the code is, where it should go, and the connective tissue that makes "hyperconnected" mean *decoupled-but-event-linked*, not *tangled*.

---

## 1. Connectivity audit — how the pieces talk today (grounded in the code)

The current backend is a **modular monolith** (correct for this stage) but its subsystems connect by **direct synchronous calls**, concentrated at one hub. As we add Evidence, Strength/Pantheon, and Anomaly detection, that hub becomes the bottleneck.

| # | Connectivity weakness | Evidence in the code | Why it bites as we grow |
|---|---|---|---|
| **CW1** | **The strike hub is a synchronous god-transaction.** `lib/sessionLog.ts` (called by `routes/practitioner`, `sessions`, `sync`) does — in **one transaction** — strike, penance/cleanse, quest fulfillment, saga-event computation, `advanceSaga`, and realm-crossing. | `sessionLog.ts` imports metrics, realms, protocol, sagaEngine; fans out inline | Each new consumer (evidence, strength, Pantheon, anomaly, coach) lengthens the transaction and couples its failure to the strike. |
| **CW2** | **No event backbone — everything is direct calls.** `advanceSaga` is invoked inline from **4 sites** (`sessionLog`, `trialOps`, `routes/saga`, `routes/vows`). | grep: **no** EventEmitter / outbox / pub-sub anywhere | "Hyperconnected" today means *tightly coupled*. Producers must know every consumer. |
| **CW3** | **Data access isn't behind ports.** **15 of 16** route files import `lib/prisma` directly. | `grep routes/ → 15/16 import prisma` | Domain logic can't be tested or instrumented without the DB; no single seam to add caching/audit/tracing. |
| **CW4** | **One nightly job, no worker tier.** `jobs/reconcileHammer.ts` is the only background process. | `jobs/` has a single file | Anomaly scoring, Pantheon materialization, evidence verification, season resets, coach pre-warm all need async execution. |
| **CW5** | **Coarse conflict resolution on the practitioner row.** Reconcile is **last-write-wins by `updatedAt`** (Invariant #6). | `sync.ts` / schema `updatedAt` | LWW is "notoriously prone to data loss" for concurrent scalar edits — fine for the append-only log, risky for mutable fields. |
| **CW6** | **The payment boundary is a connectivity *and* security hotspot.** `routes/premium.ts` holds 4 transactions and the external RevenueCat/Stripe seams — and (per `SECURITY_AUDIT.md` C1/C2) trusts the client. | `premium.ts` | External connectors belong behind verified adapters, not inline in a route. |
| **CW7** | **No cross-subsystem observability.** Multi-step chains (strike → saga → …) have no trace correlation; money/entitlement ops have no audit log. | no OTel, no audit table | When a chain misbehaves you can't follow it; sensitive events leave no trail. |

**Verdict:** the *modules* are sound; the *connections* are synchronous and centralized. The fix is not microservices — it's an **event-driven modular monolith**.

---

## 2. The modern shape (best-practice research → the decision)

**Stay a modular monolith; make it event-driven.** The 2026 consensus is decisive for a team this size: start modular-monolith with strong module boundaries and extract services only when a real scaling/organizational need appears (Shopify and GitHub publicly champion this; a CNCF survey put ~60% of early-stage startups on monoliths for 12–18 months) ([Horizon Labs](https://www.horizonlabs.com.au/insights/microservices-vs-modular-monolith-choosing-right-architecture-2026); [enqcode](https://enqcode.com/blog/rethinking-microservices-in-2026-when-modular-monolith-architecture-actually-win)). Microservices would buy VOIDBORN distributed-systems pain and zero benefit right now.

Four moves turn the monolith hyperconnected-but-decoupled:

1. **Transactional Outbox + a domain event bus (fixes CW1, CW2).** Write the domain change **and** an `OutboxEvent` row in the **same transaction**; a relay process publishes events to subscribers afterward. This solves the dual-write problem without distributed transactions and gives durable, at-least-once, idempotent delivery ([James Carr](https://james-carr.org/posts/2026-01-15-transactional-outbox-pattern/); [Conduktor](https://www.conduktor.io/glossary/outbox-pattern-for-reliable-event-publishing)). Your **append-only `StrikeEvent` is already the perfect event source** — the outbox is the natural next ring.
2. **Hexagonal ports & adapters (fixes CW3, CW6).** Define repository and connector **ports** (TS interfaces); implement **adapters** (Prisma, RevenueCat, Stripe, Health, object storage, CV/anomaly). Keep a pure domain core — exactly the instinct you already have in `resolveManifestation()`, `protocol.ts`, and the discipline adapters ([bitloops DDD/hexagonal/CQRS/ES reference](https://github.com/bitloops/ddd-hexagonal-cqrs-es-eda); [Chakray](https://chakray.com/hexagonal-architecture-a-complete-guide-to-robust-and-testable-software-design/)).
3. **A worker tier (fixes CW4).** One process runs the **outbox relay** + scheduled jobs (reconcile, anomaly scoring, Pantheon materialization, season reset, evidence verification, coach pre-warm). Same codebase, separate entrypoint.
4. **Observability + WORM audit (fixes CW7).** OpenTelemetry traces share one context so you can jump metric → trace → log across an event chain (OTel is the 2026 de-facto standard); write money/entitlement/verification events to a **write-once/read-many** audit store ([OTel guide](https://dev.to/ottoaria/opentelemetry-in-2026-the-complete-guide-to-observability-for-modern-backends-jpl); [audit logging / WORM](https://oneuptime.com/blog/post/2026-02-06-audit-logging-opentelemetry-telemetry-access/view)).

On the client, the **offline-first** design stays — keep the append-only log local-first and delta-sync; treat `StrikeEvent` as the authoritative CRDT-like grow-only set (already conflict-free), and reserve LWW for genuinely scalar fields with logical timestamps to avoid silent loss ([offline-first/CRDT 2026](https://www.calibraint.com/blog/offline-first-mobile-app-in-2026); [LWW data-loss caveat](https://www.alphasoftware.com/blog/offline-sync-architecture-tutorial-examples-tools-for-field-operations)).

---

## 3. The hyperconnected architecture (the immortalized end-state)

```
                                   ┌──────────────────────────  CLIENT (Expo / RN, offline-first)  ──────────────────────────┐
   Rive entity ◀── inputs ── Manifestation resolver ◀── stores (optimistic) ◀── API client + Offline Queue ── (presigned media upload)
        ▲ render split ▲                                                                   │ delta sync / idempotency keys
   R3F / 2.5D spaces                                                                       ▼
 ───────────────────────────────────────────────  EDGE  ───────────────────────────────────────────────────────────────────
                                   Express (helmet · rate-limit · JWT)  →  application services (use-cases)
                                                                  │ via PORTS
        ┌───────────────── BOUNDED-CONTEXT MODULES (one modular monolith) ─────────────────┐
        │ Identity · Training · Progression · Trials · Saga · Economy · Evidence&Verify ·   │
        │ Strength&Pantheon · Coach                                                         │
        └───────────────┬───────────────────────────────────────────────┬─────────────────┘
                        │ writes domain change + OutboxEvent (same tx)    │ repository ports
                        ▼                                                 ▼
                 ┌─────────────┐   relay (worker)   ┌──────────── DOMAIN EVENT BUS ───────────┐     Adapters:
   StrikeEvent ─▶│   OUTBOX    │ ─────────────────▶ │ StrikeLogged · RealmCrossed · FeatVerified│──▶ Prisma · RevenueCat ·
   (append-only) └─────────────┘                    │ PurchaseVerified · ChapterUnlocked · …   │     Stripe · Health · Storage ·
                        ▲                            └───────┬─────────┬─────────┬─────────────┘     CV/Anomaly · Moderation
                        │                                    ▼         ▼         ▼
                 PostgreSQL (Prisma)            Saga   Trials   Strength→Pantheon   Anomaly   Coach   Bond   (idempotent subscribers)
                                                                                     │
   WORM audit log ◀── money/entitlement/verification events            OpenTelemetry traces span the whole chain
```

**The single idea:** producers write an **event + their change in one transaction**; the **bus** fans out to **idempotent subscribers**. Adding a subsystem = adding a subscriber, never editing `sessionLog`. That is what makes it *hyperconnected yet decoupled*.

### Bounded-context modules
| Module | Owns | Key today → target |
|---|---|---|
| **Identity** | auth, practitioner, JWT | add rate-limit + token revocation (audit H1/L1) |
| **Training** | sessions, strikes, `StrikeEvent`, leaks, anchor | `logSession` slims to: write strike + emit `StrikeLogged`; consumers do the rest |
| **Progression** | realms (computed), forms, manifestation | unchanged; subscribes to `StrikeLogged`/`RealmCrossed` |
| **Trials** | protocol, planned sessions, adherence | quest fulfillment becomes a `StrikeLogged` subscriber |
| **Saga** | beats, forge, chapters | `advanceSaga` becomes a subscriber, not an inline call from 4 sites |
| **Economy** | crystals, gacha, premium/escrow | move external seams behind **verified adapters**; server-derived settlement (audit C1/C2) |
| **Evidence & Verification** *(new)* | submissions, CV/anomaly, proof tiers | `PROOF_OF_EFFORT_DESIGN.md`; emits `FeatVerified` |
| **Strength & Pantheon** *(new)* | DOTS/relative score, cohorts, showcase | `PRACTITIONER_SHOWCASE_DESIGN.md`; subscribes to `FeatVerified` |
| **Coach** | reflections (Claude) | subscribes to occasion events; cache + rate-limit kept |

### Canonical domain events (the connective vocabulary)
`StrikeLogged` · `RealmCrossed` · `StreakReached` · `QuestFulfilled` · `PhaseEntered` · `ChapterUnlocked` · `EvidenceSubmitted` · `FeatVerified` · `FeatFlagged` · `PurchaseVerified` · `WagerSettled` · `CorruptionChanged` · `SeasonRolled`. Each carries IDs + facts only (never resolved looks), is written via the outbox, and is consumed idempotently.

### Three flows, end to end
- **A verified strike:** client (optimistic) → `/sessions`|`/sync` → *Training* writes `StrikeEvent` + `StrikeLogged` (1 tx) → relay → **Saga** advances · **Trials** fulfills · **Strength** rescoring (if a feat) · **Anomaly** scores · **Coach** maybe reflects · **Bond** ticks → entity re-renders from fresh inputs.
- **Evidence → realm gate:** capture → on-device BlazePose → presigned upload → *Verification* adapter (C2PA, dedup, re-score, moderation) → `FeatVerified{tier,strengthScore}` → **Pantheon** updates · **Progression** unlocks the gated realm reward.
- **A purchase:** store → **verified** RevenueCat webhook (adapter) → `PurchaseVerified` → *Economy* grants entitlement → **WORM audit** row. No client-trusted grants.

---

## 4. How this preserves every invariant (integrity check)

The event-driven shape **strengthens** the 15 invariants rather than bending them:
- **#1 no stored realm/look** — unchanged; consumers read facts and recompute.
- **#2 StrikeEvent source of truth** — now also the event source; outbox is downstream, reconcile still authoritative.
- **#3 reps:0 ⇒ no strike** — `StrikeLogged` simply isn't emitted for reps:0.
- **#6 offline-first, server-authoritative** — outbox makes server-side fan-out reliable; gacha/currency still never resolve offline; **verified** settlement closes C1/C2.
- **#8 additive-only / gacha-only RNG** — evidence/strength/Pantheon are additive subscribers; nothing destructive.
- **#12–#15 trials/saga link-not-strike, suggest-only, free-forever** — saga/trial consumers fire from real events exactly as today, just decoupled.
Idempotent subscribers + the append-only log mean **replay is safe**, which is the whole point of the offline queue you already built.

---

## 5. Using Claude Fable 5 to build (and keep) this

Fable 5 (Anthropic, June 9 2026) is strongest exactly where this work lives — **audit, architecture, and planning** — and the community's own guidance is to spend its (token-intensive) budget there, then execute with cheaper models: *"Think with Fable 5 for planning, strategy, architecture… use cheaper models for execution"* ([awesome-claude-fable-5](https://github.com/Anil-matcha/awesome-claude-fable-5); [Anthropic](https://www.anthropic.com/news/claude-fable-5-mythos-5)). Concrete ways to apply it here:
- **Repo-Map & architecture passes** — Fable-5 workflows produce a "purpose / stack / architecture sketch / key directories" map and audit reports (this document is that artifact); re-run per milestone to keep the blueprint alive ("immortalized" = continuously re-derived, not frozen).
- **Outbox/event-bus + ports scaffolding** — one-shot the interfaces and the relay, then hand steady-state to a cheaper model (the relay pattern).
- **Entity/spaces ceiling** — Fable-5 one-shots of **real-time Three.js / WebGPU** scenes (black-hole lensing, on-device diffuse GI, million-particle GPU VFX in the awesome list) are a credible reference for pushing the R3F Domains and the Pantheon entity-card renderer beyond the 2.5D floor.
- **Customization systems** — borrow layered-avatar patterns from the open-source set in `PRACTITIONER_SHOWCASE_DESIGN.md` (CharacterStudio's layer/cull system, msquared slot schema) for the `resolveManifestation` renderer used in the Chamber, profiles, and Pantheon grid.

---

## 6. Migration path (strangler-fig, never a rewrite)

Evolve in place; each step ships independently and keeps the monolith green.
1. **Introduce the outbox + bus alongside `sessionLog`.** Emit `StrikeLogged` in the existing transaction; move **one** consumer (Saga) to subscribe. Verify parity.
2. **Migrate remaining inline fan-out** (Trials fulfillment, Bond, Coach occasions) to subscribers; `logSession` shrinks to "write strike + emit."
3. **Repository ports for the hottest routes** (Training, Economy); add the **verified payment adapter** (closes audit C1/C2).
4. **Stand up the worker tier** (relay + reconcile + new jobs).
5. **Add Evidence & Verification** → `FeatVerified` → **Strength & Pantheon** subscribers.
6. **Anomaly scoring** over `StrikeEvent` + **OTel tracing** + **WORM audit**.
7. **Harden the edge** (rate-limit, helmet, idempotency keys everywhere — audit H1/M1/M2).

Extract a module into its own service later **only** if one genuinely needs independent scaling (e.g., CV verification) — the bus boundary makes that a lift-and-shift, not a rewrite (strangler-fig).

---

## 7. The one-paragraph immortalization

VOIDBORN becomes an **event-driven modular monolith**: a pure domain core behind ports, where every real act of training writes an append-only fact **and** a domain event in one transaction, and a reliable bus fans that fact out to every subsystem that cares — saga, trials, strength scoring, the Pantheon, anomaly detection, the coach — each an idempotent subscriber that can be added without touching the others. Money and outcomes are server-derived behind verified adapters; effort is provable through tiered evidence; ascension is comparable through bodyweight-normalized strength; and the whole chain is observable and audited. It is hyperconnected because everything is linked through events, and durable because nothing is coupled through code. The Void was here first — now the architecture just made it legible, credible, and unkillable.

---

### Sources
- Transactional Outbox — James Carr: https://james-carr.org/posts/2026-01-15-transactional-outbox-pattern/
- Outbox pattern — Conduktor: https://www.conduktor.io/glossary/outbox-pattern-for-reliable-event-publishing
- Event-driven architecture 2026 reference — Digital Applied: https://www.digitalapplied.com/blog/event-driven-architecture-message-queues-2026-engineering-reference
- Modular monolith vs microservices 2026 — Horizon Labs: https://www.horizonlabs.com.au/insights/microservices-vs-modular-monolith-choosing-right-architecture-2026
- Rethinking microservices in 2026 — enqcode: https://enqcode.com/blog/rethinking-microservices-in-2026-when-modular-monolith-architecture-actually-win
- DDD + Hexagonal + CQRS + ES + EDA reference (TypeScript/NestJS) — bitloops: https://github.com/bitloops/ddd-hexagonal-cqrs-es-eda
- Hexagonal architecture guide — Chakray: https://chakray.com/hexagonal-architecture-a-complete-guide-to-robust-and-testable-software-design/
- Offline-first + CRDT 2026 — Calibraint: https://www.calibraint.com/blog/offline-first-mobile-app-in-2026
- Offline sync / LWW data-loss caveat — Alpha Software: https://www.alphasoftware.com/blog/offline-sync-architecture-tutorial-examples-tools-for-field-operations
- OpenTelemetry in 2026 — DEV: https://dev.to/ottoaria/opentelemetry-in-2026-the-complete-guide-to-observability-for-modern-backends-jpl
- Audit logging / WORM — OneUptime: https://oneuptime.com/blog/post/2026-02-06-audit-logging-opentelemetry-telemetry-access/view
- Claude Fable 5 — Anthropic: https://www.anthropic.com/news/claude-fable-5-mythos-5
- awesome-claude-fable-5 (architecture/audit workflows, Three.js/WebGPU one-shots): https://github.com/Anil-matcha/awesome-claude-fable-5

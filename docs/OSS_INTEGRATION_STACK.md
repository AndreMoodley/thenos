# VOIDBORN — Modern Open-Source Integration Stack

**Date:** 2026-06-16
**Companion to:** `MASTER_ARCHITECTURE.md` (every pick below fills a named slot in that blueprint) · `PROOF_OF_EFFORT_DESIGN.md` · `PRACTITIONER_SHOWCASE_DESIGN.md`.
**Brief:** Instead of leaning on a model to write bespoke code, assemble the app from **mature, advanced open-source projects** chosen so they integrate *seamlessly* with what you already run (Expo/RN New-Arch · Express · Prisma · PostgreSQL · Rive · R3F · Zod) and so they *uphold the invariants* (server-authoritative currency, append-only truth, offline-first, degrade-never-fail).

**Three integration principles** drive the choices:
1. **Stay Postgres-native.** Don't add Redis/Kafka/another datastore until real scale demands it — your worker tier, queue, and outbox can all live in Postgres.
2. **One type contract, shared.** Client and server are both TypeScript; a monorepo + tRPC + Zod means the API, the domain events, and the validation are a single source of truth — the deepest "seamless integration" lever there is.
3. **On-device first.** Vision, animation, and rendering run on the phone (free, private, offline) — server only for what must be authoritative.

---

## The stack at a glance (slot → project)

| Architecture slot | Recommended OSS | Why it's the modern pick | Fit / invariant |
|---|---|---|---|
| **End-to-end API** | **tRPC** | Shares TS types client↔server, no codegen, tiny client, Zod inputs you already use | procedures = use-case ports (hexagonal) |
| **Server-state & cache** | **TanStack Query** (+ persist plugin) | De-facto server-state lib; offline persistence via `persistQueryClient` | pairs with your Zustand stores |
| **Offline-first sync** | **PowerSync** (self-host edition) | Postgres→on-device SQLite via CDC; **writes go through your own backend** | preserves server-authority (Inv #6) |
| ↳ pure-OSS alt | **WatermelonDB** (MIT) | reactive SQLite, observable queries, you own the sync protocol | full control, no service |
| **Worker tier + outbox relay** | **Graphile Worker** | Postgres `SKIP LOCKED`, <5ms latency, ~196k jobs/s, **no Redis** | *is* the event-bus relay (fixes CW1/CW2) |
| ↳ scale alt | **BullMQ** (Redis) | full-featured when you exceed ~thousands of jobs/min | adopt only at real scale |
| **2D juice / 2.5D entity** | **react-native-skia + Reanimated** | GPU draw, shaders, **500 particles in one draw call**, UI-thread worklets | the "feel is a requirement" invariant |
| **3D spaces** | **R3F + drei + rapier + postprocessing + gltfjsx** | the mature React-Three ecosystem you already started | Domains + Pantheon entity render |
| **Cinematics** | **Theatre.js** | timeline-based animation control | rebirth/ascension set-pieces |
| **On-device pose/CV** | **react-native-vision-camera + react-native-mediapipe-posedetection** | BlazePose, **New-Architecture-only**, GPU, 33 landmarks, ~12–17ms/frame | matches mandatory New Arch; evidence tiers |
| **Resumable upload** | **tus** (`@tus/server` + Uppy) | resumable large-video upload over flaky gym wifi | offline-first ethos |
| **Media provenance / dedup** | **c2pa-node** + perceptual-hash lib | tamper-evident capture + reused-clip detection | anti-cheat (proof-of-effort §5) |
| **Object storage** | **MinIO** (S3-compatible) *(AGPL)* | self-host evidence media + WORM audit (object-lock) | data minimization |
| **Observability** | **OpenTelemetry** + **Sentry** SDKs (+ Grafana/Tempo/Loki self-host) | OTel is the 2026 standard; trace the event chain | fixes CW7 |
| **Monorepo / shared types** | **Turborepo + pnpm workspaces** | one home for tRPC routers, Zod schemas, domain events | the seamless-integration backbone |

---

## Client (Expo / React Native)

**Type-safe data layer — tRPC + TanStack Query + Zustand.** Replace the hand-rolled `src/api/{client,endpoints,types}` with **tRPC**: the server's router *is* the client's type, so a renamed field is a compile error, not a runtime 500 — "move fast and break nothing," zero codegen, tiny footprint ([tRPC](https://trpc.io/); [tRPC GitHub](https://github.com/trpc/trpc); starter: [expo-trpc-starter](https://github.com/Ernesto385291/expo-trpc-starter)). Wrap reads in **TanStack Query** with the AsyncStorage persister for offline cache that survives restarts ([RN + TanStack Query](https://oneuptime.com/blog/post/2026-01-15-react-native-tanstack-query/view)), and keep **Zustand** for pure client UI state — the standard, complementary split ([React Query + Zustand offline](https://addjam.com/blog/2026-03-20/react-native-offline-data-react-query-zustand/)). Your existing **Zod** schemas become the tRPC input validators verbatim.

**Offline-first engine — PowerSync (or WatermelonDB).** Your custom offline queue + `/sync/state` hydration can be replaced by a real local-first engine. **PowerSync** is the most production-mature for RN + Postgres and, crucially, **routes writes through your own backend API** — so it modernizes the *read/sync* path without violating server-authority (Inv #6); ElectricSQL remains alpha/not-for-production ([PowerSync vs ElectricSQL](https://powersync.com/blog/electricsql-vs-powersync); [2026 sync-engine comparison](https://trybuildpilot.com/648-electric-sql-vs-powersync-vs-zero-2026)). If you want **fully-MIT, self-owned**: **WatermelonDB** gives reactive SQLite + a sync-protocol spec you implement against your Express server ([WatermelonDB + Expo guide](https://dev.to/fasthedeveloper/watermelondb-expo-sdk-54-the-complete-mobile-offline-first-setup-guide-that-actually-works-5he5)). Keep the **append-only `StrikeEvent`** as the grow-only, conflict-free local set — that's already the right local-first instinct.

**Feel & the entity — react-native-skia + Reanimated.** This is the biggest visual modernization. Skia gives GPU-direct 2D drawing, runtime shaders, and **up to 500 particles in a single draw call** (`useRSXformBuffer`), animated by Reanimated worklets on the UI thread — exactly what the Ki bar, auras, tap-effects, ascension bursts, and the **2.5D `FallbackEntity`** need to feel native and never drop frames ([Skia animations](https://shopify.github.io/react-native-skia/docs/animations/animations/); [Skia for RN 2026](https://medium.com/@expertappdevs/skia-game-changer-for-react-native-in-2026-f23cb9b85841); [Skia shaders + Reanimated](https://variantsystems.io/blog/react-native-skia/)). You already ship Reanimated — Skia is the partner that makes "feel is a requirement" real on the low-fidelity path.

**3D spaces — lean into the R3F ecosystem.** Stay on React Three Fiber and adopt its mature satellites: **@react-three/drei** (helpers), **@react-three/rapier** (physics), **@react-three/postprocessing** (bloom/effects for auras), **gltfjsx** (compile your DRACO `.glb` Domains into reusable JSX), and **@react-three/uikit** for WebGL UI inside a scene ([R3F](https://github.com/pmndrs/react-three-fiber); [R3F intro/ecosystem](https://r3f.docs.pmnd.rs/getting-started/introduction)). For customization patterns, borrow **CharacterStudio** (layer system + face culling) and **msquared avatar-creator** (slot schema) for the `resolveManifestation` renderer used in the Chamber, profiles, and the Pantheon grid (see `PRACTITIONER_SHOWCASE_DESIGN.md`).

---

## Edge & API

**tRPC over your Express server** (or its standalone/Fastify adapter): each procedure is an application service that calls a **repository port** (hexagonal) — this is how the typed edge and the event-driven core meet. Harden the edge with **express-rate-limit + helmet** (closes audit H1/M3) and add idempotency-key middleware (M2). Keep JWT, add a `tokenVersion` claim for revocation (L1).

---

## Domain backbone & worker tier (the Postgres-native event bus)

**Graphile Worker is the keystone.** It stores jobs in Postgres and claims them with `SELECT … FOR UPDATE SKIP LOCKED` — sub-5ms latency, ~196k jobs/s, **no second datastore** ([Graphile Worker performance](https://worker.graphile.org/docs/performance); [Postgres queues without Redis](https://dev.to/aws-builders/i-removed-redis-from-my-stack-and-used-postgresql-for-job-queues-instead-2lp5)). It becomes:
- **the Outbox relay** — poll the `OutboxEvent` table, publish each domain event to subscribers (the dual-write-safe pattern from `MASTER_ARCHITECTURE.md`),
- **the worker tier** — anomaly scoring, Pantheon materialization, evidence verification, `reconcileHammer`, season rolls, coach pre-warm.

`pg-boss` is an equally Postgres-native alternative (ACID, `SKIP LOCKED`); reserve **BullMQ** (Redis, the most-downloaded, fullest-featured) for if/when you blow past Postgres-queue throughput ([BullMQ vs pg-boss 2026](https://www.pkgpulse.com/guides/bullmq-vs-bee-queue-vs-pg-boss-job-queues-nodejs-2026); [npm trends](https://npmtrends.com/better-queue-vs-bullmq-vs-graphile-worker-vs-kue-vs-pg-boss)). For dispatch, Postgres **LISTEN/NOTIFY** (or just Graphile tasks as subscribers) keeps the whole bus inside Postgres — no Kafka. **Zod** validates event payloads; **Prisma** stays, now behind repository ports.

---

## Evidence & Verification subsystem

- **Capture/analysis on-device:** **react-native-vision-camera** frame processors + **react-native-mediapipe-posedetection** (BlazePose, **New-Architecture-only** — aligns with your mandatory New Arch — GPU, 33 landmarks, world coords, segmentation) for rep counting + range-of-motion; draw the live skeleton with a **Skia** frame processor ([RN MediaPipe pose](https://github.com/EndLess728/react-native-mediapipe-posedetection); [react-native-mediapipe](https://cdiddy77.github.io/react-native-mediapipe/docs/api_pages/pose-landmark-detection/)).
- **Upload:** **tus** resumable uploads (`@tus/server` + Uppy) so a gym-wifi drop resumes instead of restarting.
- **Authenticity/dedup:** **c2pa-node** for Content Credentials + a perceptual-hash lib for reused-clip detection (proof-of-effort §5).
- **Storage:** **MinIO** (S3-compatible, self-host; *AGPL — note the license*) for media and the **WORM audit log** via object-lock.
- **Strength math:** a small pure module implementing **DOTS / Wilks / IPF GL** (open formulas) → the normalized Strength Score.

---

## Observability

**OpenTelemetry** SDKs (Node + RN) give one trace context across the strike→event→subscriber chain (2026 de-facto standard); **Sentry** SDKs for crash/error capture; self-host **Grafana + Tempo + Loki + Prometheus** (*AGPL stack — note licenses*) if you don't want a SaaS. This closes CW7 and gives the money/entitlement/verification audit trail the security audit asked for.

---

## What to KEEP (already modern — don't churn it)
**Rive** (state-machine entity), **React Three Fiber + expo-gl** (3D), **Expo Router** (file-based spaces), **Prisma + PostgreSQL**, **Reanimated + Gesture Handler**, **Zod**, **RevenueCat/Stripe** SDKs (just move them behind verified adapters). These are current best-in-class; the work is integration, not replacement.

---

## The 5 keystone integrations (highest leverage, do these first)
1. **Monorepo (Turborepo + pnpm) + tRPC + shared Zod** — one type contract across app and server. Everything else gets easier.
2. **Graphile Worker** — instantly gives you the outbox relay *and* the worker tier on infra you already run.
3. **PowerSync (or WatermelonDB)** — retire the bespoke offline layer for a battle-tested sync engine, write-path unchanged.
4. **react-native-skia + Reanimated** — the entity's 2.5D path and all "juice" become native-grade.
5. **vision-camera + MediaPipe pose** — the evidence system's on-device, free, private core.

---

## Adoption order (additive, strangler-fig — never a big-bang)
1. Monorepo + shared types; introduce **tRPC** on a couple of read routes alongside the existing client.
2. **Graphile Worker** as the outbox relay (migrate the first event subscriber to it).
3. **Skia** for one surface (the Ki bar / tap-burst), then the 2.5D entity.
4. **PowerSync/WatermelonDB** for read-sync; keep the server-authoritative write queue.
5. **vision-camera + MediaPipe** behind the Evidence module; **tus** uploads; **MinIO** storage.
6. **OTel + Sentry** tracing/audit across the chain.

---

## Caveats (verify before you commit)
- **Licenses:** MinIO and the Grafana stack are **AGPL**; PowerSync's sync service is open-edition/self-host with a managed paid tier; the smaller RN-MediaPipe wrappers are community-maintained — **check license + maintenance/New-Arch support before adopting**, and prefer the most-starred, recently-updated fork.
- **PowerSync vs WatermelonDB:** PowerSync = less code, a service to run/pay; WatermelonDB = fully MIT, more sync code you own. Pick by how much infra you want.
- **tRPC** assumes a TS monorepo (you have one) and a reachable server in dev (tunnel for device testing).
- **On-device New-Arch:** vision-camera pose + Skia + Reanimated all want the New Architecture — which you've already mandated, so this aligns rather than conflicts.

---

### Sources
- tRPC: https://trpc.io/ · GitHub: https://github.com/trpc/trpc · Expo starter: https://github.com/Ernesto385291/expo-trpc-starter
- TanStack Query (RN server state): https://oneuptime.com/blog/post/2026-01-15-react-native-tanstack-query/view · React Query + Zustand offline: https://addjam.com/blog/2026-03-20/react-native-offline-data-react-query-zustand/ · TanStack DB 0.6: https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes
- PowerSync vs ElectricSQL: https://powersync.com/blog/electricsql-vs-powersync · Sync engines 2026: https://trybuildpilot.com/648-electric-sql-vs-powersync-vs-zero-2026 · WatermelonDB + Expo: https://dev.to/fasthedeveloper/watermelondb-expo-sdk-54-the-complete-mobile-offline-first-setup-guide-that-actually-works-5he5
- Graphile Worker performance: https://worker.graphile.org/docs/performance · Postgres queues w/o Redis: https://dev.to/aws-builders/i-removed-redis-from-my-stack-and-used-postgresql-for-job-queues-instead-2lp5 · BullMQ vs pg-boss 2026: https://www.pkgpulse.com/guides/bullmq-vs-bee-queue-vs-pg-boss-job-queues-nodejs-2026 · npm trends: https://npmtrends.com/better-queue-vs-bullmq-vs-graphile-worker-vs-kue-vs-pg-boss
- react-native-skia animations: https://shopify.github.io/react-native-skia/docs/animations/animations/ · Skia for RN 2026: https://medium.com/@expertappdevs/skia-game-changer-for-react-native-in-2026-f23cb9b85841 · Skia shaders + Reanimated: https://variantsystems.io/blog/react-native-skia/
- React Three Fiber: https://github.com/pmndrs/react-three-fiber · R3F docs/ecosystem: https://r3f.docs.pmnd.rs/getting-started/introduction
- RN MediaPipe pose detection: https://github.com/EndLess728/react-native-mediapipe-posedetection · react-native-mediapipe: https://cdiddy77.github.io/react-native-mediapipe/docs/api_pages/pose-landmark-detection/

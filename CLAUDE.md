# CLAUDE.md — VOIDBORN

Project memory for Claude Code. Read this before touching the codebase. `README.md` is the spec, `GAME_DESIGN.md` is the interface-fusion design, `BUILD_PROMPT.md` is the build order, `docs/CONCEPT_GRAPH.md` is the system anatomy (how every concept connects + the six laws + the seams), `docs/EXPERIENCE_STANDARD.md` is the seamlessness bar (latency contract, eight states, motion grammar, voice rules, the release audit), `NANO_VISION.md` is the far horizon. **This is a greenfield game** — clean New-Architecture build, no legacy/migration baggage.

---

## What this is

VOIDBORN is a single-player ascension game fusing three things: a **creature you grow & customize** (Pokémon GO), an **effortless home-hub interface** (Clash Royale), and a **unique Third Space** — an inhabited, evolving domain that is at once the home screen and the creature's world. Real training is the only fuel; the user is reborn as a **living Void Entity**, molds its form, and raises it **embryo → divine**. Beauty is purchasable; ascension is earned.

---

## Stack (greenfield, New Architecture)

| Concern | Tech |
|---|---|
| Mobile | React Native + Expo, **latest stable SDK, New Architecture (mandatory on SDK 55+)**, TypeScript |
| Shell | **Expo Router** (file-based; routes = spaces) |
| Living entity | **Rive** (`rive-react-native`) — state machines driven by live inputs |
| 3D spaces | **React Three Fiber** (`@react-three/fiber`, `expo-gl`, `expo-three`, `@react-three/drei`, `three`) |
| Motion/gesture/juice | Reanimated, Gesture Handler, `expo-haptics`, `expo-av` |
| Backend | Node/Express · Prisma + PostgreSQL · JWT (HS256, 7d) |
| AI | Anthropic Claude API (the Voice of the Void) |
| Video | Remotion · IAP RevenueCat · Payments Stripe |
| Build | `expo-dev-client` + EAS Build (native modules ⇒ dev build) |

There is **no legacy animation system** to fall back to — the low-fidelity path is Rive-over-2.5D, not an old renderer.

---

## Project layout

```
voidborn/                  # Expo app (TS, Expo Router)
├── app/                   # routes = spaces: _layout (hub shell + bottom bar),
│                          #   (rebirth)/ (Mirror Rite), index (Domain/Dojo),
│                          #   calendar (Quest Log), trophy-hall (The Chronicle), chamber
├── src/entity/            # Rive wrapper + metric→input bridge + stage resolver
├── src/spaces/            # R3F scenes + 2.5D fallbacks
├── src/manifestation/     # resolveManifestation() (pure) + cosmetic types
├── src/store/             # auth, session/metrics, premium, character-config, bond,
│                          #   trial (Quest Log, persisted), saga (Chronicle, persisted)
├── src/api/               # http client + offline queue/flush
├── src/constants/         # realms.ts, forms.ts, cosmetics.ts, theme.ts (+domainConfig),
│                          #   trials.ts (phases/kinds + UTC helpers), saga.ts (styles/beats),
│                          #   feats.ts (feat/title defs — V2), inks.ts (style palettes — V1),
│                          #   arts.ts (families/units/weights — A1), inner.ts (protocols — A2)
├── src/hooks/             # useEntityInputs, useOfflineSync, useCinematic,
│                          #   useAscensionWatcher, useChapterWatcher
├── src/lib/               # device-tier + reduce-motion, haptics/audio juice, persist
├── assets/rive/           # .riv per form (void/beast/humanoid), artboards per stage
└── assets/models/         # DRACO glTF (3D phase)
server/
├── src/index.ts           # PORT 4000
├── src/routes/            # auth, practitioner, vows, trials, saga, progressions, sessions,
│                          #   entity, spaces, cosmetics, companions, coach, sync, premium,
│                          #   cinematics, admin
├── src/lib/               # realms, metrics, sessionLog (fulfillment+beat hook), voice,
│                          #   protocol (plan generator, PURE), adherence (analyzer, PURE),
│                          #   sagaBeats/sagaTemplates/sagaForge/sagaEngine, trialOps, gacha
├── src/middleware/auth.ts # requireAuth, requireAdmin, signToken
├── src/jobs/reconcileHammer.ts
└── prisma/schema.prisma · src/seed.ts
remotion/
```

---

## Commands

```bash
# App scaffold (once)
npx create-expo-app@latest voidborn -t          # TypeScript + Expo Router template
cd voidborn
npx expo install rive-react-native @react-three/fiber @react-three/drei expo-gl expo-three three
npx expo install react-native-reanimated react-native-gesture-handler expo-haptics expo-av expo-dev-client
#   VERIFY Rive + R3F + Reanimated compatibility on the chosen SDK before locking versions.
eas build --profile development --platform ios   # or android — build the dev client once
npx expo start --dev-client

# Backend
cd ../server && npm init -y
npm install express @prisma/client jsonwebtoken bcrypt cors zod && npm i -D prisma tsx typescript
npx prisma init
npx prisma migrate dev --name init && npm run seed && npm run dev   # curl :4000/health → { ok: true }
npx prisma generate    # after schema changes
```

---

## NON-NEGOTIABLE INVARIANTS — do not violate

1. **Never store** the realm, the evolution stage, or the resolved look. `activeFormKey` (`void`/`beast`/`humanoid`) IS stored; the stage within it is computed from `hammerCount` (`constants/realms.ts`). No `realm`/`stage` column.
2. **Evolution is earned, never bought or spoofed.** `hammerCount` must reconcile with the append-only `StrikeEvent` log (`jobs/reconcileHammer.ts` + `/admin/recompute-hammer/:id`).
3. **`reps = 0` ⇒ no `StrikeEvent`**, no `hammerCount` change. Recovery/Stillness use `reps: 0`.
4. **No `/api/` prefix.** Routes mount directly (`/auth`, `/entity`, `/spaces`, `/coach`, …). Bearer JWT via `middleware/auth.ts`. All client calls through `src/api/`.
5. **Render split:** Rive (entity, logic in the asset's state machines + inputs) composed **on top of** R3F/2.5D (spaces) by the screen. The two are coupled only by the screen.
6. **Offline-first, server authoritative** for currency (Void Crystals), ownership/entitlements, and ALL gacha/pity — those never resolve offline; queue and confirm on reconnect. Reconcile practitioner state last-write-wins by `updatedAt`; `StrikeEvent` is the source of truth.
7. **Respect reduce-motion + device tier.** OS reduce-motion ⇒ calm Rive state + shortened/skipped cinematics. Low-end ⇒ fall back R3F 3D → 2.5D. Degrade fidelity, never function.
8. **Cosmetics, forms, spaces = DIRECT purchases — never gacha.** Companions are the only RNG (disclosed rates + server-side pity). **Additive-only** — never alter/remove an owned item or change a default look without opt-in.
9. **Feel is a requirement.** Every meaningful action gets haptics + audio + a snappy spring; the bottom bar is always live; animations are interruptible; depth ≤ 1 (deeper flows render in-place, not as new screens).
10. **`JWT_SECRET` set before boot** (`signToken`/`requireAuth` read it). **Android emulator = `10.0.2.2`** via `Platform.OS`; never hardcode `localhost`.
11. **Native modules ⇒ dev build.** Verify the Rive + R3F + Reanimated matrix on the SDK before locking. New Architecture is mandatory on SDK 55+.
12. **PlannedSessions never strike.** Completing a quest IS logging a real `VoidSession`; the `fulfilledBySessionId` link (set inside `lib/sessionLog.ts`) is the ONLY completion mechanism. Stillness quests (`targetReps: 0`) pair only with `reps: 0`. Trial weeks/phases/adherence are **derived from `startDate` + params** (`lib/protocol.ts`, pure) — never stored.
13. **Saga chapters unlock ONLY from real logged events** — `unlockedBy` is the audit. AI writes flavor (titles/teases/prose), never structure or history: the authored beat skeleton (`lib/sagaBeats.ts`) is force-merged server-side, strict-Zod-validated, and keyless fallbacks (`lib/sagaTemplates.ts`) exist at every AI seam. Locked chapters expose teases, never prose.
14. **Adaptation is suggest-only.** A `TrialRealignment` changes nothing until the practitioner accepts; accept rewrites only future, **unfulfilled** quests. The past is immutable; regeneration never touches a fulfilled row.
15. **Trials and Sagas are progression ⇒ FREE forever.** No priceModel on any of their models, nothing gacha, additive-only (reforging archives the old saga; abandoning a trial cancels its vow — never `broken`, no corruption for re-planning).
16. **Feats/Titles/story-marks are COMPUTED from the ledger, never granted.** Definitions are versioned code constants; every award stores an `earnedBy` audit; progress is never stored (recompute like realms). Titles (`activeTitleKey`) equip only if earned. **Beauty renders the ledger:** all art (P0 procedural — seeded from real `unlockedBy`/`earnedBy` events — P1 authored, P2 generated) illustrates real events/state and never invents, obscures, or replaces a readout. Entity mood is computed, never stored; the embodied Demon's size/distance derive only from real leak/ward rows.
17. **The myth is a mechanism; the world is self-contained.** Every in-world ritual wraps a real, evidence-based practice (breath pacing, motor imagery, attentional-focus cues, interoception — citations live in `GAME_DESIGN.md §15`, NEVER in product copy). UI strings never name external fiction/franchises/studies and never make medical/diagnostic claims; the Voice cites only the practitioner's own data. Inner sessions log at `reps: 0` and can NEVER strike — inner work amplifies, the body alone swings the hammer. Arts are additive organization: one entity, one hammerCount (per-family weights, versioned), `artId` columns optional, per-Art mastery always derived (generalizes `originArtMastery`). One Focus Art at a time; switching focus is consent-gated.

---

## Entity metrics → Rive inputs

`hammerCount` (0→∞) → realm = stage · `ki` (0–100) → eye brightness/aura integrity · `shadowLevel` (1–5) → spread/pulse · `streak` (≥7 → bonus orbit) · `originArtMastery` (`hammerCount×0.001`) → glow.
Realm thresholds: 0 / 1,500 / 4,000 / 9,000 / 18,000 / 36,500 / 73,000 (Foundation → Divine Master). Cosmetics change look; metrics drive motion — never let a cosmetic disable a readout.

## Manifestation resolver (`resolveManifestation()`, pure, unit-tested)
`form line → realm base stage → lineage → equipped cosmetics → reactive auras → artifacts → corruption`. Higher overrides lower; a lineage may lock slots; compatibility rules live here. `avatarConfig` (per-layer `{itemKey,tint}` + `demeanor`) persists in `store/character-config`; `activeFormKey` on the practitioner. Only these persist — appearance is always rebuilt.

## Monetization / RevenueCat
Soft paywall: free Void form + full evolution + Dojo/Calendar/Trophy Hall + a free option per layer. Paid = identity/expression/environment, never progression. Forms/spaces/cosmetics/lineages/auras/artifacts = **non-consumable entitlements** (restorable). Void Crystals = **consumable**, server-authoritative, never expiring. Verified purchase → `/premium/reconcile` grants. Stripe settles Soul Escrow.

## The Voice of the Void
`/coach/reflect`: compose recent metrics/streaks/leaks/active vows **+ the sworn trial (phase/week/adherence)** → Claude → entity-voiced reflection. Occasions: `rebirth/ascension/return/oracle/gate/realign/chapter`. **Supportive, never punitive/diagnostic, never invents data.** Rate-limited + cached.

## Trials & Saga (the two engines)
**Trial** (Runna-modeled): goal → `generateProtocol()` lays Gathering → Tribulation → Quieting weeks of `PlannedSession`s around the **Pillar Day**; dials regenerate **future weeks only**; `lib/adherence.ts` proposes suggest-only Realignments; completing a trial keeps its auto-linked major Vow and **chains an Open Path** (never a dead end). **Saga** (Yugen+WOOP-modeled): the **Mirror Rite** captures current self → higher self → **Inner Demon** (nature = `LeakCategory`) → if-then **Ward**; the **Saga Forge** writes a 4-style manhwa/isekai arc (murim/isekai/tower/regression) over the fixed 10-beat skeleton; `advanceSaga()` unlocks chapters in-transaction from real events with fallback prose, Claude refines lazily. Trophy Hall = **The Chronicle** (route unchanged); Calendar = **the Quest Log**; the Domain shows **Today's Quest**.

## The Codex of Arts + the Inner Art (A1–A2, design-specced in GAME_DESIGN §14–15)
**Codex** (A1): a Practitioner `Art` (name · family body/mind/craft/voice/abstinence · unit · weight · Mastery Vision · status) is the life-project object — it OWNS chained trials, a saga thread, feats, and a ledger slice; Body Arts map 1:1 onto the six modalities (nothing removed); all Arts strike the one hammer; one **Focus Art** holds the prime surfaces; the Codex is the Quest Log's top stratum (no fifth space). **Inner Art** (A2): the guided Begin flow — Gathering Breath (~6/min) → Intent Circulation (imagery) → kind-correct focus cue (internal for flow/surge hypertrophy, external for gate/pillar performance) → the Seal; Stillness quests carry guided body-scan/imagined-training; protocols log as Mind-Art `reps:0` rows that seal ki through the ledger and feed chapters/feats/readiness/the demon. Every step skippable in ≤2 taps.

## The look + earned identity (V1–V3, design-specced in GAME_DESIGN §11–13)
**Ink & Ember** (V1): story surfaces are image-first panels — per-style ink systems (murim/isekai/tower/regression), phase grading (Gathering/Tribulation/Quieting tint the app), materials system-glass/ink-wash/foil, panel-grammar motion with reduce-motion variants; **P0 procedural panel engine** (deterministic, event-seeded) must make the Chronicle screenshot-beautiful with zero authored assets — P1 authored kits and P2 generated covers are additive. **Hall of Feats** (V2): `lib/feats.ts` (pure) computes 8 feat families from the ledger; awards write `PractitionerFeat` + `earnedBy` in the saga-advancing hooks; `feat_earned` is a saga event; Titles equip via `activeTitleKey`. **Entity Embodied** (V3): persistent presence layer across spaces; computed mood engine; `react_*` trigger contract with `FallbackEntity` parity; the **embodied Demon** (ledger-driven size/distance); **story-marks** resolver layer between lineage and cosmetics.

---

## Verification gates
- `curl :4000/health` → `{ ok: true }`; seeded demo account logs in.
- **Phase 0:** Rive entity + one DRACO glTF dojo at 60fps on a mid-range Android **dev build**.
- **Phase 1:** sign up → rebirth → entity reacts to real metrics at 60fps.
- Migrations apply on a fresh DB; seeder runs; `hammerCount` reconciles with `StrikeEvent`.
- No stored realm/stage/look; nothing non-Companion in the gacha; reduce-motion + offline paths work; depth ≤ 1 everywhere.
- **Trials:** stillness quest completed at `reps:0` ⇒ fulfilled with **no StrikeEvent and hammer unchanged**; flush replay idempotent (no double-fulfill); regenerate/accept never touches fulfilled or past rows; `recompute-hammer` drift stays 0.
- **Saga:** keyless `POST /saga/forge` returns a valid fallback arc; chapters unlock in beat order only from real events (`unlockedBy` audit); locked chapters expose no prose; demo account shows a mid-plan trial + mid-arc saga with a next-chapter tease.
- **V1:** Chronicle screenshot-beautiful at P0 (no authored assets); no readout obscured; reduce-motion variants verified.
- **V2:** feats recompute identically from the raw ledger; `earnedBy` audit matches; titles equip only if earned; Hidden feats expose a veiled count, never conditions.
- **V3:** entity present + reactive in all four spaces at 60fps; demon size/distance derive provably from leak/ward rows; story-marks earned-only.
- **A1:** a v1 account behaves identically as one implicit Body Art (zero-change migration); two concurrent Arts keep one hammer + correct per-Art mastery; focus switch is consent-gated and emits a saga event.
- **A2:** inner protocols log at `reps:0` with hammer unchanged; protocol completion seals ki via the ledger; no UI string names an external work/study or makes a clinical claim (voice lint passes); every rite step skippable in ≤2 taps.

# Claude Code Build Prompt — VOIDBORN (greenfield)

> Paste into Claude Code in an **empty directory**. This is a from-scratch build. `README.md`, `GAME_DESIGN.md`, and `CLAUDE.md` (place them in the repo root) are the source of truth — read all three before writing code.

---

You are building **VOIDBORN** from zero: a single-player ascension game that fuses a **Pokémon-GO-style creature you grow and customize** with a **Clash-Royale-style home hub**, unified by a **Third Space** — an inhabited, evolving domain that is both the home screen and the creature's world. Real training is the only fuel; the user is reborn as a living Void Entity (rendered in Rive), molds its form, and raises it embryo → divine through logged effort. This is a clean **New-Architecture** project — no legacy code, no migration.

## Source of truth
- `README.md` → full spec (stack, realms, entity, third spaces, customization, systems, schema, API, monetization, roadmap, invariants).
- `GAME_DESIGN.md` → the interface-fusion design: screen architecture, the hub, the creature, the Third Space synthesis, the "juice" spec, the loop.
- `CLAUDE.md` → conventions, commands, and the **NON-NEGOTIABLE INVARIANTS**. Re-read the invariants before every phase.

## Before you start
1. Read all three documents end to end.
2. Restate, in one short message: (a) the fusion thesis (creature × hub = Third Space), (b) the two entity axes (Form vs Stage) and that **stage is never stored**, (c) the resolver precedence, (d) the render split (Rive entity over R3F/2.5D space), and (e) what is server-authoritative. I'll confirm before you proceed.
3. **Confirm the toolchain matrix first.** Before locking versions, verify that your chosen Expo SDK, `rive-react-native`, `@react-three/fiber`/`expo-gl`/`expo-three`, and Reanimated are mutually compatible on the New Architecture. Report the versions you'll pin. (On SDK 55+ the New Architecture is mandatory.)

## Hard constraints (full list in CLAUDE.md — these override convenience)
- **Never store** realm, evolution stage, or the resolved look. `activeFormKey` is stored; the stage is computed from `hammerCount`.
- **Evolution is earned, never bought.** `hammerCount` reconciles with the append-only `StrikeEvent` log.
- **Render split:** Rive (entity, logic in the asset's state machines) over R3F/2.5D (spaces), composed by the screen. No legacy animation system.
- **Offline-first, server authoritative** for currency, ownership/entitlements, and all gacha/pity.
- **Respect reduce-motion + device tier** (R3F 3D → 2.5D). Degrade fidelity, never function.
- **Cosmetics, forms, spaces = direct purchases, never gacha.** Companions are the only RNG (disclosed rates + server pity). **Additive-only.**
- **Feel is a requirement:** haptics + audio + snappy springs on meaningful actions; bottom bar always live; depth ≤ 1 (deeper flows render in-place).
- **No `/api/` prefix.** Bearer JWT. `reps:0` ⇒ no strike. `10.0.2.2` for Android. `JWT_SECRET` required before boot.

## Working style
- **One phase at a time.** After each phase, run its gate, summarize changes, and **pause for my review** before the next.
- TypeScript throughout. Expo Router routes = spaces. Keep `resolveManifestation()` pure and unit-tested.
- Schema changes: edit `schema.prisma` → `npx prisma migrate dev --name <desc>` → `npx prisma generate`. Migrations must apply on a fresh DB; seed any new catalog so features are demoable.
- From Phase 2 on, the offline queue, reduce-motion, device-tier fallback, and the juice layer are **requirements, not extras.**

---

## PHASE 0 — Scaffold & spike (prove the hard parts first)
- Scaffold the app: `npx create-expo-app@latest voidborn -t` (TypeScript + Expo Router), New Architecture. Add `rive-react-native`, `@react-three/fiber`/`@react-three/drei`/`expo-gl`/`expo-three`/`three`, Reanimated, Gesture Handler, `expo-haptics`, `expo-av`, `expo-dev-client` (pin the verified matrix). Set up EAS + a dev client build.
- Scaffold the server: Express + Prisma + PostgreSQL, `/health` route, `.env` (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `ANTHROPIC_API_KEY`, `PORT=4000`).
- **Spike Rive:** one entity artboard, idle state machine driven by a fake `ki` input, in the dev build.
- **Spike R3F:** load one DRACO-compressed glTF dojo (<5MB), `frameloop="demand"`; confirm frame time + battery.
- **Gate:** both spikes run on a mid-range Android **dev build** at 60fps; `curl :4000/health` → `{ ok: true }`. *Do not proceed until this passes.*

## PHASE 1 — Entity, rebirth, form choice (Rive, 2.5D)
- Build the **Void form** Rive file: idle state machine + a `rebirth` one-shot; inputs `ki`, `shadowLevel`, `streak`, `realm`.
- `src/entity/` — Rive wrapper + **metric→input bridge** (`useEntityInputs`) mapping live state to inputs.
- Auth (`/auth/*`), practitioner + sessions + strike (`StrikeEvent` append-only; `reps:0` ⇒ no strike); `constants/realms.ts`, `forms.ts`; `EntityForm` + `PractitionerEntity` models; `/entity/*` routes.
- **Rebirth on first launch**; Manifestation Chamber **form selector** (Void live; Beast/Humanoid stubbed premium).
- **Gate:** sign up → rebirth → entity reacts to real metrics at 60fps; stage computed, never stored.

## PHASE 2 — Hub shell & 2.5D spaces + offline + a11y + juice
- Expo Router **hub shell** in `app/_layout.tsx`: persistent bottom bar (Domain · Calendar · Trophy Hall · Manifestation), thumb-reachable, **depth ≤ 1**, horizontal swipe; the **juice layer** (haptics + audio + springs) in `src/lib/`.
- **Domain (Dojo)** 2.5D home with the Rive entity composited in; **2.5D Calendar** (vows on a timeline + live countdowns) and **2.5D Trophy Hall**; vows + progressions (`/vows/*`).
- **Offline-first:** queue/flush in `src/api/` + `useOfflineSync` + `/sync/*`; optimistic entity updates; server-authoritative reconnect.
- **Accessibility:** reduce-motion (calm entity, shortened cinematics) + device-tier fallback (3D → 2.5D) in `src/lib/`.
- **Gate:** one-tap navigation across spaces with juice; live data; works offline and reconciles; reduce-motion honored; depth ≤ 1 everywhere.

## PHASE 3 — Evolution arc + the Voice of the Void
- Author the Void form's **seven stage artboards**; bind the displayed stage to the computed realm; **ascension cinematics** (`Rebirth`/`RealmAscension`) via `useAscensionWatcher` (Remotion or Rive one-shots).
- **`/coach/reflect`** (the Voice): compose recent metrics/streaks/leaks/active vows → Claude → entity-voiced reflection at rebirth/return/on-request — supportive, never punitive/diagnostic, rate-limited + cached.
- **Vows-as-Trials** (major vow → Trophy + one-time evolution flourish), the **Bond** affinity layer, the **Stillness** recovery timer (seals ki, `reps:0`), and the nightly **`hammerCount` reconcile** job + `/admin/recompute-hammer/:id`.
- **Gate:** crossing a realm visibly evolves the entity; the coach speaks grounded only in real data; `hammerCount` reconciles with `StrikeEvent`.

## PHASE 4 — Customization economy
- Full **cosmetic layer system** (`resolveManifestation()` across all layers) + recolor + **Manifestation Presets**; `constants/cosmetics.ts`; `/cosmetics/*`.
- **Void Crystals** (consumable, server-authoritative) + **RevenueCat** non-consumable entitlements; `/premium/reconcile` grants on verified purchase; **Restore Purchases**. Space/trophy decor.
- **Gate:** equip/recolor/save persists + syncs; first paid cosmetic purchasable and restorable; nothing cosmetic behind RNG.

## PHASE 5 — True 3D + Companions + Soul Escrow
- Convert Dojo/Calendar/Trophy Hall to **R3F 3D** (DRACO glTF, baked lighting, on-demand); **Domain Packs** as real 3D environments (`/spaces/*`, `domainConfig`).
- **Companions** gacha (`/companions/*`): Lesser/Abyssal scrolls, **disclosed rates + server-side pity**, server RNG only; equip one at a time.
- **Soul Escrow** (Stripe): Heavenly Restriction holds/settlement, Corruption + cleansing, Wagered Ki. **Lineages**, **Reactive Auras**, **Artifacts**.
- **Gate:** 3D scenes load <5MB at frame/battery target and degrade to 2.5D; gacha compliant; wagers settle.

## PHASE 6 — Premium forms & social third places
- **Beast** + **Humanoid** form lines (each fully staged across the seven realms) as non-consumable IAP; **Void Seasons** (`Season` time-limited drops).
- **Social:** visiting another practitioner's domain/entity/Trophy Hall (read-only), **Sects** (`Sect`/`SectMember`), decor gifting — consent-gated, **no leaderboards.**
- **Gate:** forms purchasable/restorable; first social loop live; "third place" earned.

---

# The Two Engines — Trials (Runna-modeled) + Saga (Yugen/WOOP-modeled)

> Invariants 12–15 in `CLAUDE.md` govern everything below. The mantra: **quests are fulfilled only by
> real sessions; story follows fact; adaptation is by consent; progression stays free.**

## PHASE T1 — Trials schema + the protocol core
- Schema: `Trial` / `PlannedSession` / `TrialRealignment` (+ `SoulProfile` / `Saga` / `SagaChapter` for T4) — weeks/phases/adherence **derived, never stored**; `PlannedSession.fulfilledBySessionId → VoidSession` with `onDelete: SetNull`.
- `server/src/lib/protocol.ts` — PURE deterministic generator: `phasePlanFor` (Gathering → Tribulation → Quieting), `generateProtocol` (week laid around the **Pillar Day**: pillar/surge/flow + one stillness; Gates as replaced slots; every 4th Tribulation week deloads; Quieting holds 45–55% of peak), `regenerateFrom`, `canMove`, UTC-Monday helpers.
- **Gate:** migration applies on a fresh DB; generator unit tests green (determinism, phase splits at 6/10/26 weeks, taper bounds, pillar-day placement, stillness `targetReps: 0`, regen never emits past weeks).

## PHASE T2 — Trials server
- `/trials` router: create (rejects a second active trial; generates the plan; **auto-creates the linked major Vow** `vowSubtype:'trial'`), `GET /active`, regenerate (**future-unfulfilled rows only**), move (same/adjacent week, never the past), complete (**keeps the vow + chains an Open Path** — never a dead end), abandon (vow `cancelled`, never `broken`).
- `lib/sessionLog.ts` hook: explicit `plannedSessionId` or auto-match (UTC day + modality; stillness ⇔ `reps:0` only; gate > pillar > surge > flow) — **the link is the only completion mechanism and never strikes**.
- `/sync`: session mutations carry `plannedSessionId?`; new `plan_move` + `soul_profile` absolute-set mutations; `/sync/state` ships the FULL active trial.
- **Gate (curl):** stillness quest @ `reps:0` ⇒ fulfilled, **no `StrikeEvent`, hammer unchanged**; flush replay idempotent (no double-fulfill); `/admin/recompute-hammer` drift 0.

## PHASE T3 — Adaptation (suggest-only)
- `lib/adherence.ts` — PURE: `summarizeWeeks` + `proposeRealignments` (ease after two <50% weeks; intensify after two perfect, well-rated weeks; re-lay a slipped week; eased re-entry after a ≥7-day silence).
- Realignment endpoints: `check` (≤1 new proposal/day) · `accept` (**the only suggestion→plan path**; future-unfulfilled regen) · `dismiss`.
- **Gate:** a seeded missed week yields a data-grounded proposal; accept rewrites only the future; dismiss is a no-op; unit tests green.

## PHASE T4 — Saga server (the Chronicle's engine)
- `SoulProfile` (Mirror Rite record: current self / higher self / outcome / **Inner Demon** = `LeakCategory` / **Ward** if-then / style).
- `lib/sagaBeats.ts` — the authored **10-beat skeleton** (awakening → … → next_path; regression optional) + `triggerMatches`; `lib/sagaTemplates.ts` — 4 authored style arcs (murim/isekai/tower/regression), keyless floor; `lib/sagaForge.ts` — Claude flavors the arc, **skeleton force-merged server-side**, strict Zod, fallback at every seam; `lib/sagaEngine.ts` — `advanceSaga(tx, …)` unlocks chapters in-transaction from REAL events with `unlockedBy` audit + synchronous fallback prose (Claude refines lazily, promptHash-cached).
- `/saga` router (`styles` / `profile` / `forge` / `state` / `chapters/:id`); coach occasions + trial context; 4 new cinematics; seed a demo trial mid-plan + saga mid-arc.
- **Gate:** keyless forge returns a Zod-valid fallback arc; chapters unlock in beat order only from logged events; locked chapters expose teases, never prose.

## PHASE T5 — Client loop (the System Window)
- `store/trial.ts` + `store/saga.ts` (persisted — Quest Log + Chronicle render **offline**); `metrics.logStrike(+plannedSessionId)` optimistic fulfill; flush results surface `fulfilledPlanned` + `unlockedChapters`; `useChapterWatcher` plays `chapter_unlock`.
- Calendar → **the Quest Log** (phase banner, 7-day strip, in-place day panel: Begin prefills the QuickLog, Move is canMove-constrained; the Realignment banner with Accept/Dismiss; vows preserved beneath). Domain gains **Today's Quest**.
- **Gate:** demo shows Today's Quest; complete + move offline → relaunch renders from the persisted stores → reconnect flushes with no dupes; reduce-motion shortens `chapter_unlock`.

## PHASE T6 — The Mirror Rite + The Chronicle + docs
- Rebirth: signup → **Mirror Rite** (WOOP steps, every step skippable: "Walk on — shape it later") → trial wizard → the birth beat; both rites reusable as in-place sheets from the Chronicle / Quest Log.
- Trophy Hall → **The Chronicle**: saga card, manhwa chapter cards (locked teases; next-chapter highlight; prose expands in place), Turning Points, and the old hall folded in as Monuments. `BottomBar` labels: Quest Log · Chronicle (routes unchanged).
- Docs: README sections + data model + API + roadmap; GAME_DESIGN §10; CLAUDE invariants 12–15; STATUS rows.
- **Gate:** fresh signup walks the rite → forged saga visible in the Chronicle; demo shows mid-arc + the next-chapter tease; depth ≤ 1 audit; `tsc --noEmit` both sides + all unit tests green.

---

# The Beautiful Build — Ink & Ember, the Hall of Feats, the Entity Embodied

> Design spine: `GAME_DESIGN.md §11–13`. Governing law: invariant 16 — **feats/titles/marks are
> computed from the ledger with an audit; beauty renders the ledger and never invents, obscures, or
> replaces a readout.** The data never changes; only its costume does.

## PHASE V1 — Ink & Ember (the look)
- **First, the spine:** run the `docs/EXPERIENCE_STANDARD.md §10` punch list (skeletons, surfaced
  errors/offline/pending states, arm-confirm destructives, token lint, virtualized lists) — the
  seamless feel precedes the costume; the §9 audit becomes the PR checklist from here on.
- **P0 procedural panel engine** (`src/lib/panels/`): deterministic generative compositions seeded
  from a chapter's `unlockedBy` / a feat's `earnedBy` hash — ink-bloom fields, particle
  constellations, style motifs, entity silhouette composited; one renderer skins chapters, feats,
  arc covers, and trial headers. Offline always renders; no two panels alike.
- **Style ink systems** (`constants/inks.ts`): per-saga-style palettes + motifs (murim
  vermillion-seal/ink-wash · isekai system-glass blue/scanline · tower brass/verdigris/floor-plates ·
  regression dusk-violet/ember/double-exposure) tinting all story chrome while that saga is active.
- **Phase grading:** Gathering (dawn-grey) → Tribulation (storm) → Quieting (pre-dawn calm) as a
  subtle app-wide grade derived from the trial's computed phase.
- **Materials + type + motion:** system-glass (quest chips/HUD), ink-wash (panels), foil (gates/
  trophies/titles, sweep on tilt/focus); display brush-serif for chapter titles, tabular numerals
  for the numbers that matter; panel-grammar motion (ink-bloom chapter reveal, vermillion seal-stamp
  on fulfillment, speed-lines on gates, splash-page ascensions) — every beat with a reduce-motion
  calm variant.
- **Gate:** the Chronicle is **screenshot-beautiful with zero authored assets** (P0 only); identical
  data renders before/after (no readout obscured); reduce-motion verified; 60fps held on the
  mid-range target. P1 authored kits / P2 generated covers slot in later, additively.

## PHASE V2 — The Hall of Feats & Titles
- `constants/feats.ts` + server `lib/feats.ts` (PURE, unit-tested): 8 families (Iron · Tempo ·
  Gates · Demon · Path · Realm · Return · Hidden), each definition a predicate over ledger rows;
  **progress never stored** — recomputed like realms.
- Awards: evaluated transactionally in the same hooks that advance the saga (`logSession`, vow keep,
  trial complete); write `PractitionerFeat` + **`earnedBy` audit**; emit `feat_earned` as a saga
  event (Hidden chapters may listen); Voice gains the `feat` occasion; seal-stamp set-piece.
- **Titles:** feat-set → title defs; `activeTitleKey` on Practitioner (equip via `POST /feats/title`,
  earned-only, validated server-side); rendered under the name in every space; one-off aura shimmer
  on equip (expression, never a stat).
- Chronicle: the **Hall of Feats** between Turning Points and Monuments — P0 medallion panels;
  earned = ink + foil; unearned = silhouette + condition tease; Hidden = veiled count only.
- **Gate:** wiping `PractitionerFeat` and recomputing from the raw ledger reproduces the identical
  award set with matching audits; nothing but ledger truth can mint a feat; demo shows earned +
  teased + veiled medallions; unit tests green.

## PHASE V3 — The Entity, Embodied (+ the Demon given a body)
- **Presence layer:** the entity renders once in the shell and composites into all four spaces
  (full-stage Domain · perched on the Quest Log, gazing at Today's Quest · curled beside Chronicle
  prose · mirrored in the Chamber); it travels with the swipe.
- **Mood engine** (computed, never stored): readiness + streak + time-of-day + recent events + Bond
  → idle sets (dawn-stretch, focused, proud loop, vigilant, dormant-soft — wakes *delighted*,
  reading); Bond unlocks deeper idles.
- **Reaction vocabulary:** `react_quest/gate/chapter/feat/ward` trigger inputs on the Rive contract,
  with the procedural `FallbackEntity` implementing **the identical contract** (posture + particles)
  — the soul ships before the art.
- **The embodied Demon:** a shadow-creature in the domain, in the saga style's ink, driven ONLY by
  ledger truth — looms in stated trouble-hours and after logged leaks, recoils on ward-holds,
  shrinks with Demon-family feats; tap → its dossier (the user's own WOOP words + the win/loss
  ledger). Reduce-motion: a still shadow, state by size alone.
- **Story-marks:** resolver layer between lineage and cosmetics — scar-glyph per Breakthrough Gate,
  seal per completed trial, ember per title; earned-only, additive-only, opt-out-able.
- **Gate:** entity present + reactive in all four spaces at 60fps on the mid-range target; demon
  size/distance provably derived from leak/ward rows (unit test on the pure derivation); marks
  appear only from ledger events; reduce-motion stills honored; resolver tests extended and green.

---

# The Life Build — the Codex of Arts + the Inner Art

> Design spine: `GAME_DESIGN.md §14–15`. Governing law: invariant 17 — **the myth is a mechanism;
> the world is self-contained.** All additive: a v1 account must behave identically after every
> migration in this block.

## PHASE A1 — The Codex of Arts (a life, organized)
- Schema (additive only): `Art` (practitionerId, name, family `body/mind/craft/voice/abstinence`,
  unit, weight, masteryVision, status `focus/active/resting/archived`) · optional `artId` on
  `Trial` and `VoidSession`. Migration backfills ONE implicit Body Art per practitioner and points
  nothing else — zero behavior change is the proof of additivity.
- `constants/arts.ts` ⇄ server `lib/arts.ts` (PURE): family defs, unit labels, **versioned
  per-family weights** normalizing art-units into hammer; per-Art mastery derived from the ledger
  slice (the plural of `originArtMastery`) — never stored.
- The Codex stratum at the top of the Quest Log: Art switcher cards (name · family sigil · mastery
  spark-line · current trial week · next quest); one **Focus Art** (consent-gated switch, emits a
  saga event); resting Arts hold heartbeat cadences (their Open Path / single weekly quests).
- Chronicle braiding: chapters/turning points/feats carry their Art's sigil; Hall of Feats groups
  by family. The Mirror Rite asks *"Which Art calls first?"*; the Goal Dialogue classifies free
  text → Art + unit + vision (deterministic generator still lays every plan).
- **Gate:** v1 account migrates with zero behavior change; two Arts run concurrently — one hammer,
  correct per-Art mastery curves, per-Art trials/saga threads; focus switch consent-gated + saga
  event; `lib/arts.ts` unit tests green.

## PHASE A2 — The Inner Art (ki, made real)
- The guided **Begin flow** (`RiteStep` + `BreathGuide` components per EXPERIENCE_STANDARD §3):
  Gathering Breath (~6/min, haptic-paced, entity aura breathes with it) → Intent Circulation
  (20–30s first-person rehearsal; the entity mirrors) → train with the **kind-correct focus cue**
  (internal "press the ki into" on flow/surge hypertrophy quests; external "send the ki through"
  on gate/pillar performance quests) → **the Seal** (60s down-regulation + one felt-sense question).
  Every step skippable in ≤2 taps, forever.
- Stillness quests carry a guided inner session (body-scan / imagined-training, 5–10 min) — still
  `reps: 0`, still never striking.
- Ledger integration: completed protocols log as Mind-Art `VoidSession`s (minutes as unit,
  `reps: 0`); protocol completion IS the canonical ki seal (the +5 tap remains as the shortcut);
  the **Inner feat family** (*First Circulation* · *Deep Channel* · *Unmoved*) computes from these
  rows; readiness and the demon read them; Voice gains the `circulation` occasion.
- **Honesty fences in code:** the voice lint (EXPERIENCE_STANDARD §9.4) extended to external proper
  nouns + clinical verbs runs in CI over user-facing strings; no inner row can ever create a
  `StrikeEvent` (assert in the waist; test it).
- **Gate:** inner sessions ⇒ `reps:0`, hammer unchanged, ki sealed via ledger; chain-of-sealed-
  sessions renders from real rows; every rite step skippable in ≤2 taps; voice lint green; demo
  shows a stillness quest carrying a guided session.

---

When you finish reading the three documents, complete the "Before you start" items (including the toolchain-matrix verification) and begin **Phase 0**. Pause for review at each phase boundary.

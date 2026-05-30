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

When you finish reading the three documents, complete the "Before you start" items (including the toolchain-matrix verification) and begin **Phase 0**. Pause for review at each phase boundary.

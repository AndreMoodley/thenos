# CLAUDE.md — VOIDBORN

Project memory for Claude Code. Read this before touching the codebase. `README.md` is the spec, `GAME_DESIGN.md` is the interface-fusion design, `BUILD_PROMPT.md` is the build order. **This is a greenfield game** — clean New-Architecture build, no legacy/migration baggage.

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
│                          #   (rebirth)/, index (Domain/Dojo), calendar, trophy-hall, chamber
├── src/entity/            # Rive wrapper + metric→input bridge + stage resolver
├── src/spaces/            # R3F scenes + 2.5D fallbacks
├── src/manifestation/     # resolveManifestation() (pure) + cosmetic types
├── src/store/             # auth, session/metrics, premium, character-config, bond
├── src/api/               # http client + offline queue/flush
├── src/constants/         # realms.ts, forms.ts, cosmetics.ts, theme.ts (+domainConfig)
├── src/hooks/             # useEntityInputs, useOfflineSync, useCinematic, useAscensionWatcher
├── src/lib/               # device-tier + reduce-motion, haptics/audio juice
├── assets/rive/           # .riv per form (void/beast/humanoid), artboards per stage
└── assets/models/         # DRACO glTF (3D phase)
server/
├── src/index.ts           # PORT 4000
├── src/routes/            # auth, practitioner, vows, progressions, sessions, entity, spaces,
│                          #   cosmetics, companions, coach, sync, premium, cinematics, admin
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

---

## Entity metrics → Rive inputs

`hammerCount` (0→∞) → realm = stage · `ki` (0–100) → eye brightness/aura integrity · `shadowLevel` (1–5) → spread/pulse · `streak` (≥7 → bonus orbit) · `originArtMastery` (`hammerCount×0.001`) → glow.
Realm thresholds: 0 / 1,500 / 4,000 / 9,000 / 18,000 / 36,500 / 73,000 (Foundation → Divine Master). Cosmetics change look; metrics drive motion — never let a cosmetic disable a readout.

## Manifestation resolver (`resolveManifestation()`, pure, unit-tested)
`form line → realm base stage → lineage → equipped cosmetics → reactive auras → artifacts → corruption`. Higher overrides lower; a lineage may lock slots; compatibility rules live here. `avatarConfig` (per-layer `{itemKey,tint}` + `demeanor`) persists in `store/character-config`; `activeFormKey` on the practitioner. Only these persist — appearance is always rebuilt.

## Monetization / RevenueCat
Soft paywall: free Void form + full evolution + Dojo/Calendar/Trophy Hall + a free option per layer. Paid = identity/expression/environment, never progression. Forms/spaces/cosmetics/lineages/auras/artifacts = **non-consumable entitlements** (restorable). Void Crystals = **consumable**, server-authoritative, never expiring. Verified purchase → `/premium/reconcile` grants. Stripe settles Soul Escrow.

## The Voice of the Void
`/coach/reflect`: compose recent metrics/streaks/leaks/active vows → Claude → entity-voiced reflection. **Supportive, never punitive/diagnostic, never invents data.** Rate-limited + cached.

---

## Verification gates
- `curl :4000/health` → `{ ok: true }`; seeded demo account logs in.
- **Phase 0:** Rive entity + one DRACO glTF dojo at 60fps on a mid-range Android **dev build**.
- **Phase 1:** sign up → rebirth → entity reacts to real metrics at 60fps.
- Migrations apply on a fresh DB; seeder runs; `hammerCount` reconciles with `StrikeEvent`.
- No stored realm/stage/look; nothing non-Companion in the gacha; reduce-motion + offline paths work; depth ≤ 1 everywhere.

# VOIDBORN — build status & verification

This build was produced and verified in a **headless Linux container** (no device, no EAS, no GPU).
The split below is deliberate and honest: everything that can be verified without a device **was run
and passes**; the gates that inherently need a device/EAS/authored art are marked **device-pending**
with exactly what's required to close them.

## What was actually run here (green)

| Check | Result |
|---|---|
| `server` typecheck (`tsc --noEmit`) | ✅ clean |
| Prisma migration on a **fresh** Postgres DB | ✅ `migrate dev` applies |
| Seeder (`npm run seed`) | ✅ catalog + demo + admin; demo `hammerCount` == Σ `StrikeEvent` |
| `curl :4000/health` | ✅ `{ ok: true }` (Phase 0 server gate) |
| Login → `/entity/me` computed stage | ✅ 5300 → Realm 3, stage derived (never stored) |
| Strike `reps>0` → `hammerCount`↑ + realm-crossing detected | ✅ |
| `reps:0` → **no** `StrikeEvent`, `hammerCount` unchanged (inv #3) | ✅ |
| Reconcile self-heal (force drift → `/admin/recompute-hammer`) | ✅ 999999 → 9090, `corrected:true` (inv #2) |
| Gacha: disclosed rates + server pity + dup handling (inv #8) | ✅ |
| Cosmetic equip writes `avatarConfig` only (inv #1) | ✅ |
| Offline `/sync/flush` idempotent by `clientId` (inv #6) | ✅ no double-count |
| Voice of the Void fallback (no API key) | ✅ grounded in real data, never invents |
| Server unit tests (`vitest`) — realms + gacha | ✅ 12 passing |
| **Pure client logic** typecheck + unit tests | ✅ 16 passing (resolver precedence, realms, bridge) |
| **Full Expo app** typecheck (`tsc --noEmit`, all ~35 files) | ✅ clean against installed SDK 56 types |

Reproduce: `cd server && npm i && npx prisma migrate dev && npm run seed && npm test && npm run dev`
then `curl :4000/health`; and `npm i && npm run test:logic` at the repo root for the pure client logic.

## Device-pending (cannot run in a cloud container — by nature)

| Gate | Why it's pending | To close it |
|---|---|---|
| **Phase 0:** Rive entity + DRACO glTF dojo at **60fps on a mid-range Android dev build** | needs EAS dev build + a physical/emulated GPU device; `rive-react-native` rides the New-Arch interop layer | `eas build --profile development -p android`, run `expo start --dev-client`, profile frame time |
| **Phase 1:** sign up → rebirth → entity reacts at 60fps | same (on-device Rive) | same dev build |
| Authored **art binaries** (`.riv`, DRACO `.glb`, audio) | these are made in Rive/Blender/a DAW, not by code | drop into `voidborn/assets/**` and wire the `require`s (each folder's README shows where) |
| RevenueCat / Stripe live flows | need real store/PSP credentials & sandbox | wire keys; `/premium/reconcile` + escrow state machine are implemented and stubbed at the payment boundary |

Until the art ships, the app renders a **metric-reactive `FallbackEntity`** and a placeholder R3F
shrine — both real and live — so the loop is demonstrable on a dev build now.

## Phase coverage (per BUILD_PROMPT)

- **Phase 0 — Scaffold & spike:** server + DB + health ✅; app scaffold + pinned New-Arch matrix ✅;
  Rive/R3F code paths in place ✅; the 60fps **device** spike is device-pending.
- **Phase 1 — Entity, rebirth, form choice:** auth, practitioner/sessions/strike, `StrikeEvent`,
  realms/forms, `/entity/*` ✅; rebirth flow + Chamber form selector ✅; entity bridge ✅.
- **Phase 2 — Hub & 2.5D spaces + offline + a11y + juice:** hub shell (bar, depth ≤ 1, swipe) ✅;
  2.5D Domain/Calendar/Trophy Hall ✅; vows + progressions ✅; offline queue + reconnect ✅;
  reduce-motion + device-tier fallback ✅; juice layer ✅.
- **Phase 3 — Evolution arc + Voice:** stage bound to computed realm ✅; ascension watcher +
  cinematic overlay + Remotion comps ✅; `/coach/reflect` ✅; vows-as-trials, Bond, Stillness,
  nightly reconcile ✅. (Seven stage **artboards** are art — device-pending.)
- **Phase 4 — Customization economy:** full layer resolver + recolor + presets ✅; Void Crystals +
  `/premium/reconcile` + restore ✅; decor catalog ✅.
- **Phase 5 — 3D + Companions + Soul Escrow:** R3F path + `domainConfig` ✅; companions gacha
  (disclosed rates + server pity) ✅; Soul Escrow (wagered ki fully; Heavenly Restriction + Stripe
  stubbed) ✅; lineages/auras/artifacts in resolver + catalog ✅. (glTF binaries device-pending.)
- **Phase 6 — Premium forms & social:** Beast/Humanoid forms as entitlements + Seasons ✅; Sects /
  visiting models ✅ (schema + ownership). Social UI surfaces are minimal scaffolding.

## Documented deviations (deliberate, spec-faithful)

1. **Expo SDK 56**, not an older line — the spec says "latest stable SDK"; SDK 56 is latest and fully
   New-Arch. See `docs/TOOLCHAIN.md`.
2. **`expo-audio`** instead of `expo-av` — `expo-av` is removed in SDK 54+. Same requirement met.
3. **`bcryptjs`** instead of `bcrypt` — pure-JS, no native build in CI/containers. Drop-in.
4. **`activeFormKey` lives only on `Practitioner`** (not duplicated on `PractitionerEntity`) — single
   source of truth; the README listed it in both places. No field has two homes.
5. **Postgres** is used (per spec); started locally for verification. SQLite is not used.

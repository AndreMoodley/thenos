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
| **Full Expo app** Metro bundle (`expo export -p android`) | ✅ 1757 modules → 5.6MB Hermes bundle, no errors (whole graph resolves: Rive, R3F/`expo-gl`, `expo-audio`, Reanimated worklets) |

Reproduce: `cd server && npm i && npx prisma migrate dev && npm run seed && npm test && npm run dev`
then `curl :4000/health`; and `npm i && npm run test:logic` at the repo root for the pure client logic.

## The Two Engines — Trials + Saga (T1–T6), verified here

| Check | Result |
|---|---|
| `trials_and_saga` migration on a fresh Postgres DB | ✅ applies (init + new in sequence) |
| Protocol generator unit tests (determinism, 6/10/26-wk splits, 40–60% taper, pillar day, stillness reps:0, regen future-only) | ✅ 12 passing |
| Adherence analyzer + saga beats + forge fallback unit tests | ✅ 16 passing (server total: 40) |
| Seeded demo: trial 3 weeks deep (week 3/10, Tribulation), 50 quests, 9 fulfilled via real linked sessions, hammer == Σ strikes (3,500) | ✅ |
| Seeded demo saga: murim arc, chapters 1–3 unlocked w/ real `unlockedBy` events + fallback prose; 4+ locked teases; nextTease | ✅ |
| Counted quest fulfilled via `POST /sessions` + `plannedSessionId` ⇒ struck + hammer↑ + chapters `tower_floor` (phase entered) and `hidden_master` (streak ≥7) unlocked in order | ✅ |
| **Stillness quest @ `reps:0` ⇒ fulfilled, NO StrikeEvent, hammer unchanged** (invariant #12 proof) | ✅ |
| `/sync/flush` replay of both ⇒ `idempotent: true`, no double-fulfill, hammer unchanged | ✅ |
| `/admin/recompute-hammer` after all of the above ⇒ drift 0 | ✅ |
| Fresh account E2E: signup → `PUT /saga/profile` → **keyless** `POST /saga/forge` (tower style, fallback arc) → `awakening` unlocks; `POST /trials` ⇒ 32 quests + `system_window` unlocks | ✅ |
| Realignment accept moves only the current week's slipped quests; regenerate (new pillar day + volume) preserves all fulfilled links | ✅ |
| Client: full Expo typecheck + **web export bundles clean** with Quest Log / Chronicle / Mirror Rite / stores | ✅ |
| Device-pending: Quest Log + Chronicle airplane-mode walkthrough on a dev build (the persisted stores + idempotent queue are the same code paths verified above via curl) | ⏳ |

## The app now RUNS headless (web target) — verified end-to-end here

`bash voidborn/scripts/headless-run.sh` runs the **whole game loop** in **headless Chromium** against
the live backend and screenshots it (artifacts in `voidborn/.artifacts/`):

| Check | Result |
|---|---|
| Web export (dev **and** `NODE_ENV=production`) | ✅ single Hermes bundle, no errors |
| App boots in headless Chromium → **Rebirth** screen renders (entity + auth) | ✅ |
| Demo login → **Domain** hub renders live server state (realm "True Ki Awakening 4/7", streak 11, ki 72, "8,910 to Transcendence", bonus-orbit) | ✅ |
| Log a strike from the UI → server `hammerCount` advances | ✅ 9110 → 9130 |
| Native **Android** export still bundles (web changes are additive, no native regression) | ✅ |

This closes the old "does the app actually run?" gap **without a device**: the entity, hub, four
spaces, offline loop, optimistic metrics, resolver, juice, reduce-motion and device-tier fallback all
execute in a real browser. The **same web build is installable on an iPhone via Safari → Add to Home
Screen** (no Apple account) — see `docs/IOS_BUILD.md`.

Two real bugs were found and fixed by running it headless: (1) `babel.config.js` double-added
`react-native-worklets/plugin` (babel-preset-expo already injects it) → Reanimated infinite render
loop; (2) the auth gate rendered `<Redirect>` during render → router ping-pong. Both fixed; RN library
versions were also realigned to the exact SDK 56 matrix.

## Device-pending (genuinely needs a device/Apple account — by nature)

| Gate | Why it's pending | To close it |
|---|---|---|
| **Native iOS `.ipa` on your iPhone** | Apple code-signing needs your Apple Developer account on EAS (no Apple creds / macOS / EAS access in this container) | `docs/IOS_BUILD.md`: `eas device:create` + `eas build -p ios --profile preview` (one command, ~10–15 min) |
| **60fps native Rive + true R3F 3D** on a mid-range device | needs an EAS dev build + GPU device; the web target uses the 2.5D/fallback path | `eas build --profile development -p ios|android`, `expo start --dev-client`, profile frame time |
| Authored **art binaries** (`.riv`, DRACO `.glb`, audio) | made in Rive/Blender/a DAW, not by code | drop into `voidborn/assets/**` and wire the `require`s (each folder's README shows where) |
| RevenueCat / Stripe live flows | need real store/PSP credentials & sandbox | wire keys; `/premium/reconcile` + escrow state machine are implemented and stubbed at the payment boundary |

Until the art ships, the app renders a **metric-reactive `FallbackEntity`** and a placeholder R3F
shrine — both real and live — so the loop is demonstrable headless now and on a dev build.

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

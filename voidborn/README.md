# VOIDBORN app (Expo)

React Native + Expo (SDK 56, New Architecture), Expo Router, Rive entity over R3F/2.5D spaces.
Native modules ⇒ **dev build** (Expo Go cannot run Rive or `expo-gl`).

## Run

```bash
npm install                                   # (use --legacy-peer-deps if React 19 peers complain)
npx expo install                              # aligns expo-* subversions to the SDK (source of truth)
eas build --profile development --platform android   # build the dev client once
npx expo start --dev-client
npm run typecheck                             # tsc --noEmit (passes)
```

Point the app at the server with `extra.apiUrl` in `app.json`, or rely on the dev default
(`10.0.2.2:4000` on Android emulators, `localhost:4000` elsewhere — invariant #10).

## Architecture (maps to the spec layout)

- `app/` — routes = spaces. `_layout` is the hub shell (persistent `BottomBar`, `TopStatus`, swipe,
  cinematic overlay, auth gate, depth ≤ 1). `index`=Domain, `calendar`, `trophy-hall`, `chamber`,
  `(rebirth)/`.
- `src/entity/` — `RiveEntity` (drives `.riv` state-machine inputs) + `FallbackEntity` (metric-reactive
  orb until art ships) + `stageResolver` (pure stage/input bridge).
- `src/manifestation/` — `resolveManifestation()` (**pure, unit-tested**) merges the 7 sources in
  precedence; never stores a baked look.
- `src/spaces/` — `SpaceBackdrop` chooses `Dojo3D` (R3F) vs `ParallaxDomain` (2.5D) by device tier.
- `src/store/` — zustand: `auth`, `metrics` (optimistic, offline-first), `characterConfig`, `premium`,
  `bond`.
- `src/api/` — HTTP client (no `/api` prefix, Bearer) + persisted offline `queue` + typed `endpoints`.
- `src/hooks/` — `useEntityInputs`, `useOfflineSync`, `useCinematic`, `useAscensionWatcher`, `useManifestation`.
- `src/lib/` — juice (`haptics`/`audio`/`juice`), `reduceMotion`, `deviceTier`.
- `src/constants/` — `realms` (mirrors the server contract), `forms`, `cosmetics`, `theme`, `domainConfig`.

## What renders today vs. needs authored art

The code paths for **Rive** and **R3F** are complete and wired. The `.riv` / `.glb` / audio **binaries**
are authored assets (not code) and are not in the repo — so the entity renders the live
`FallbackEntity` and 3D renders a placeholder shrine until those drop into `assets/` and are wired
(see each `assets/*/README.md`). Everything else — navigation, the offline loop, optimistic metrics,
the resolver, reduce-motion, device-tier fallback, the juice layer — is real.

## Invariants honored
No stored realm/stage/look (stage is computed; only `avatarConfig`+`activeFormKey` persist) · render
split (Rive over space, composed by the screen) · offline-first + server-authoritative · reduce-motion
+ device-tier degradation · cosmetics/forms/spaces are direct (never gacha) · depth ≤ 1 · feel
(haptics+audio+spring) on every meaningful action.

# VOIDBORN — Toolchain Matrix (verification report)

> Required by `BUILD_PROMPT.md` → "Before you start" #3: verify that the chosen Expo SDK,
> `rive-react-native`, R3F/`expo-gl`/`expo-three`, and Reanimated are mutually compatible on the
> **New Architecture**, and report the pinned versions.

_Verified against published docs/changelogs as of 2026-05-30. The one item that genuinely cannot
be settled outside a device — whether `rive-react-native` is happy on the New-Arch interop layer at
60fps — is exactly the **Phase 0 Rive spike**, which must run on a mid-range Android **dev build**._

## Decision — pinned matrix (versions confirmed present on the npm registry, 2026‑05‑30)

| Concern | Pinned | Why |
|---|---|---|
| Expo SDK | **56** (`expo@~56.0.8`) | The spec says "latest stable SDK." SDK 56 (released 2026‑05‑21) is the latest stable and is fully New‑Architecture. No compatibility blocker favours an older line — New Arch is mandatory on 55+ regardless — so "latest" wins. |
| React Native | `0.85.3` | Ships with SDK 56 (new animation backend aligned with New Arch). |
| React / DOM | `19.2.6` | Ships with SDK 56. |
| Expo Router | `~56.2.8` | File-based; routes = spaces. |
| Living entity | `rive-react-native@^9.8.3` | Native 60fps; state machines + inputs live in the `.riv`. Rides the New‑Arch **interop layer** (not yet a Fabric‑native view) — the **Phase 0 spike** validates it on a device (the one gate a cloud container cannot run). |
| 3D spaces | `@react-three/fiber@^9.6.1` + `three@^0.184.0` + `@react-three/drei@^10.7.7` + `expo-gl@~56.0.5` + `expo-three@^8.0.0` | R3F v9 targets React 19. `frameloop="demand"` for static rooms; DRACO glTF < 5MB. |
| Motion / juice | `react-native-reanimated@~4.4.0` + `react-native-worklets@0.9.1` + `react-native-gesture-handler@~3.0.0` | Reanimated 4 is New‑Arch‑only (perfect — we are New‑Arch). Worklets is now its own package. |
| Haptics | `expo-haptics@~56.0.3` | Per the juice spec. |
| Audio | **`expo-audio@~56.0.11`** (spec said `expo-av`) | `expo-av` is **removed** in SDK 54+. `expo-audio` is the supported replacement and covers our need (short per-action SFX + looping soundscapes). Documented deviation; the *requirement* — "an audio cue per meaningful action" — is unchanged. |
| State | `zustand@^5.0.14` | Lightweight stores (auth, metrics, premium, character‑config, bond). |
| Persistence | `@react-native-async-storage/async-storage` + `expo-secure-store@~56.0.4` | Offline queue + token storage. |
| Build | `expo-dev-client@~56.0.18` + EAS | Native modules ⇒ dev build (Expo Go cannot run Rive or `expo-gl`). |

> **Always pin via `npx expo install <pkg>`**, which aligns every `expo-*` subversion to the installed
> SDK. The numbers above are the registry‑confirmed latest at authoring time; `expo install` is the
> source of truth at build time.

### The one gate a container cannot run

`rive-react-native` rides the RN **interop layer** on the New Architecture (it is not yet a Fabric‑native
view). That layer is reliable, but the **Phase 0 Rive + R3F 60fps spike on a mid‑range Android dev build**
is the definitive check — and a dev build (EAS) cannot be produced in this headless environment. That gate
is therefore marked *device‑pending* in `docs/STATUS.md`; everything that does NOT require a device (the
server, the pure client logic, the type‑checked source) is verified here.

> Conservative fallback: if the Phase‑0 spike ever shows interop trouble, drop to `expo@~54` /
> `react-native@0.81` and re‑run the spike. Versions live only in `voidborn/package.json` + `app.json`;
> no application code changes.

## Sources
- Expo SDK 56 changelog / "What's New in Expo SDK 56" (2026‑05) — latest stable, RN 0.85, React 19.2.
- Expo "React Native's New Architecture" guide — New Arch mandatory on SDK 55+, SDK 54 last with opt-out.
- React Native Reanimated compatibility table — Reanimated 4 is New-Arch-only; `react-native-worklets` split out.
- `rive-react-native` GitHub (issue #190, releases) — Fabric/New-Arch status; rides the interop layer.
- React Native 0.85 release blog — new animation backend aligned with New Arch.

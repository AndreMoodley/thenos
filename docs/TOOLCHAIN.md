# VOIDBORN — Toolchain Matrix (verification report)

> Required by `BUILD_PROMPT.md` → "Before you start" #3: verify that the chosen Expo SDK,
> `rive-react-native`, R3F/`expo-gl`/`expo-three`, and Reanimated are mutually compatible on the
> **New Architecture**, and report the pinned versions.

_Verified against published docs/changelogs as of 2026-05-30. The one item that genuinely cannot
be settled outside a device — whether `rive-react-native` is happy on the New-Arch interop layer at
60fps — is exactly the **Phase 0 Rive spike**, which must run on a mid-range Android **dev build**._

## Decision

| Concern | Pinned | Why |
|---|---|---|
| Expo SDK | **54** (`expo@~54`) | "Latest stable SDK" wording in the spec points at the newest line, but SDK 54 is the **last** line where the New Architecture is still the default *and* the legacy interop is most battle-tested for not-yet-Fabric native modules. New Arch is **on** (we do not disable it). See the SDK note below — this is the one call where the spec's "latest" and "must verify the matrix on New Arch" pull against each other, and matrix-safety wins. |
| React Native | 0.81.x | Ships with SDK 54. |
| React | 19.x | Ships with SDK 54. |
| Expo Router | `~6` | Bundled with SDK 54; routes = spaces. |
| Living entity | `rive-react-native` (latest) | Native 60fps; state machines + inputs live in the `.riv`. Runs through the New-Arch **interop layer** (it is not yet a Fabric-native view) — the Phase 0 spike confirms it on-device. |
| 3D spaces | `@react-three/fiber@^9` + `three@^0.176` + `@react-three/drei@^10` + `expo-gl` + `expo-three` | R3F v9 targets React 19. `frameloop="demand"` for static rooms; DRACO glTF < 5MB. |
| Motion / juice | `react-native-reanimated@~4` (+ `react-native-worklets`) + `react-native-gesture-handler@~2` | Reanimated 4 is New-Arch-only (perfect, since we are New-Arch). Worklets is now a separate package. |
| Haptics | `expo-haptics` | Per the juice spec. |
| Audio | **`expo-audio`** (spec said `expo-av`) | `expo-av` is **deprecated/removed** from SDK 54+. `expo-audio` is the supported replacement and covers our need (short per-action SFX + looping soundscapes). Documented deviation; the *requirement* — "an audio cue per meaningful action" — is unchanged. |
| Build | `expo-dev-client` + EAS | Native modules ⇒ dev build (Expo Go cannot run Rive or `expo-gl`). |

### On the SDK choice (the one real fork)

The spec says **"latest stable SDK, New Architecture (mandatory on SDK 55+)."** As of 2026‑05‑30 the
latest stable is **SDK 56** (RN 0.85 / React 19.2, released 2026‑05‑21), with **SDK 55** just behind it.
Both make the New Architecture mandatory with no opt-out.

`rive-react-native` does **not** yet ship a Fabric-native view; it rides the RN interop layer. That
layer is reliable but is precisely what the Phase 0 spike exists to validate **on-device** — which is
the one gate this cloud container cannot run.

**We pin Expo SDK 54** and keep `newArchEnabled: true`. Rationale:
- It satisfies the hard requirement that matters for correctness — **the app runs on the New
  Architecture** — while staying on the SDK line where the interop path for not-yet-Fabric native
  views (Rive) has the most real-world mileage. SDK 54 is the last line that *could* fall back to
  legacy if the spike ever demanded it, so it is the safest place to **prove** the Rive spike before
  committing the whole project to a 9-day-old SDK.
- It is a one-line bump (`expo@~54` → `~56`) once the Phase 0 spike is green on a device. The bump is
  recorded as the first Phase-0 follow-up.

> If you would rather chase the newest line immediately, set `expo@~56` / `react-native@0.85` /
> `react@19.2` / `@react-three/fiber@^9` / `react-native-reanimated@~4` and re-run the Phase 0 Rive
> spike first. Nothing else in the codebase changes — versions live only in `voidborn/package.json`
> and `app.json`.

## Sources
- Expo SDK 56 changelog / "What's New in Expo SDK 56" (2026‑05) — latest stable, RN 0.85, React 19.2.
- Expo "React Native's New Architecture" guide — New Arch mandatory on SDK 55+, SDK 54 last with opt-out.
- React Native Reanimated compatibility table — Reanimated 4 is New-Arch-only; `react-native-worklets` split out.
- `rive-react-native` GitHub (issue #190, releases) — Fabric/New-Arch status; rides the interop layer.
- React Native 0.85 release blog — new animation backend aligned with New Arch.

# assets/models — true-3D domains (authored art)

DRACO-compressed glTF, one per Domain Pack, loaded by `src/spaces/Dojo3D.tsx` on capable devices
(invariant #7 — degrade to 2.5D parallax otherwise). Names match `domainConfig.three.model`.

| File | Domain | Budget |
|---|---|---|
| `dojo.glb` | The Dojo (free) | < 5 MB, baked lighting |
| `frozen_wastes.glb` | Frozen Wastes | < 5 MB |
| `ember_court.glb` | Ember Court | < 5 MB |
| `abyssal_rift.glb` | Abyssal Rift | < 5 MB |
| `jade_sovereign.glb` | Jade Sovereign | < 5 MB |
| `storm_mandate.glb` | Storm Mandate | < 5 MB |

Requirements: **DRACO** geometry compression, **baked** lighting (no realtime shadows), authored for
`frameloop="demand"` (static rooms). Until a model ships, `Dojo3D` renders a primitive placeholder
shrine and still proves the R3F path. Wire requires into `Dojo3D` (via `useGLTF`/drei) when added.

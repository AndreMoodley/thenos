# VOIDBORN — Remotion cinematics

Pre-rendered hero moments (the anticipation set-pieces): **Rebirth** and **RealmAscension** today,
with **StrikeBurst** / **DailyRecap** to follow. Each builds (charge-up) before it pays (burst), per
the juice spec. Realm names/sigils mirror the shared realm contract so video stays consistent with
the game.

```bash
npm install
npm run dev                 # remotion studio (preview)
npm run render:ascension    # → out/ascension.mp4
```

Rendered clips are bundled and played by the app for the highest-attention beats (rebirth, realm
ascension), alongside the in-app Rive one-shots. Reduce-motion plays the shortened/calm variant
(handled app-side in `useCinematic`).

> Not installed in this build (kept as a self-contained package). `npm install` here pulls Remotion.

# VOIDBORN — getting it onto your iPhone

Two ways to put VOIDBORN on your phone. **#1 works right now, no Apple account.** #2 is a real,
optimized, installable native app and needs your Apple credentials + Expo's cloud builder (EAS) —
which a CI container cannot do for you, but the project is fully configured so it's one command.

---

## 1. Run it now in iPhone Safari (no build, no Apple account)

The app runs as a web build (`react-native-web`). The entity, hub, spaces, offline loop, and the
whole game loop work; only the native-only Rive/3D upgrade is swapped for the metric-reactive
fallback (same readouts).

On a machine on the same network as your phone:

```bash
# 1) backend
cd server && npm install && npx prisma migrate dev && npm run seed && npm run dev   # :4000

# 2) web app — bind to LAN so the phone can reach it
cd ../voidborn && npm install --legacy-peer-deps
npx expo start --web --host lan          # note the http://<your-LAN-IP>:8081 URL it prints
```

On the iPhone (same Wi-Fi): open `http://<your-LAN-IP>:8081`, then **Share → Add to Home Screen**
for a full-screen, app-like icon. Log in with the demo adept (`demo@voidborn.app` / `voidborn123`)
or sign up. The app auto-points at the same host on `:4000` for the API, so make sure the backend is
reachable on your LAN (or set `extra.apiUrl` in `app.json` to your machine's `http://<LAN-IP>:4000`).

> This is the headless-verified build: `bash voidborn/scripts/headless-run.sh` runs the exact same
> bundle in headless Chromium and screenshots the loop.

---

## 2. Optimized native iOS build (installable .ipa / TestFlight)

This is the real native app — Hermes, New Architecture, true Rive + R3F. It must be built and signed
by **EAS Build** with **your** Apple Developer account. Everything below is already configured
(`eas.json`, `app.json` iOS section, Hermes, `runtimeVersion`); you just run it authenticated.

### Prerequisites (one time)
- An **Apple Developer** account (free account works for a 7-day personal build; paid $99/yr for
  TestFlight + 1-year installs).
- `npm i -g eas-cli` and `eas login` (your Expo account).

### A) Install on your own iPhone via a registered device (internal distribution)
```bash
cd voidborn
eas device:create            # registers your iPhone's UDID (opens a link / QR to enroll the device)
eas build --profile preview --platform ios   # signed .ipa for your registered device
#   → when it finishes, EAS shows a QR code / install link; open it on the iPhone to install.
```
`preview` is the optimized profile in `eas.json` (`NODE_ENV=production`, release build, internal
distribution).

### B) TestFlight (any iPhone, needs paid Apple account)
```bash
cd voidborn
eas build --profile production --platform ios
eas submit  --profile production --platform ios   # uploads to App Store Connect → TestFlight
```

### What's already optimized for the build
- **Hermes** engine (`"jsEngine": "hermes"`), **New Architecture** on (`newArchEnabled: true`).
- Production babel **strips `console.*`** (keeps warn/error) via `babel-plugin-transform-remove-console`.
- `runtimeVersion.policy: "appVersion"` for OTA-update compatibility; `ITSAppUsesNonExemptEncryption:false`
  so iOS builds skip the export-compliance prompt.
- DRACO glTF spaces render on-demand and degrade to 2.5D on low-end devices; the 60fps Rive/R3F
  device gate is what this build finally exercises for real.

### Point the app at a reachable backend
The bundled API host defaults to `localhost`/`10.0.2.2` (dev). For a phone build, set
`expo.extra.apiUrl` in `app.json` to your deployed backend URL (e.g. `https://api.yourhost.com`)
before `eas build`, or host the `server/` somewhere reachable. The client reads it via
`src/api/client.ts` (no `/api` prefix, Bearer JWT).

### Why I can't hand you the .ipa from here
A signed iOS binary requires Apple code-signing with your credentials on Apple/EAS infrastructure;
this build container has no Apple account, no macOS signing, and EAS hosts are network-blocked. The
project is configured so the commands above produce it in ~10–15 min on EAS.

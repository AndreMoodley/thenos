#!/usr/bin/env bash
# One command to run VOIDBORN fully HEADLESS and prove it end-to-end:
#   1) ensure Postgres + backend (:4000) are up
#   2) export the web build  →  dist-web
#   3) static-serve it        →  :8080
#   4) drive it in headless Chromium (rebirth → demo login → Domain → log a strike)
#   5) screenshots land in voidborn/.artifacts/
#
# Usage:  bash scripts/headless-run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(cd ../ && pwd)"
API_PORT=4000
WEB_PORT=8080

echo "[run] ensuring Postgres is up…"
pg_isready >/dev/null 2>&1 || pg_ctlcluster 16 main start || true

echo "[run] ensuring backend (:$API_PORT)…"
if ! curl -fsS -m3 "http://127.0.0.1:$API_PORT/health" >/dev/null 2>&1; then
  ( cd "$ROOT/server" && nohup npm run dev >/tmp/vb-server.log 2>&1 & )
  for _ in $(seq 1 30); do curl -fsS -m2 "http://127.0.0.1:$API_PORT/health" >/dev/null 2>&1 && break; sleep 1; done
fi
curl -fsS "http://127.0.0.1:$API_PORT/health" && echo

echo "[run] exporting web build…"
rm -rf dist-web
NODE_ENV=production EXPO_ROUTER_IMPORT_MODE=sync EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 CI=1 \
  npx expo export --platform web --output-dir dist-web >/tmp/vb-webexport.log 2>&1
test -f dist-web/index.html

echo "[run] serving dist-web on :$WEB_PORT…"
fuser -k "$WEB_PORT/tcp" 2>/dev/null || true
( cd dist-web && nohup python3 -m http.server "$WEB_PORT" >/tmp/vb-web.log 2>&1 & )
sleep 2

echo "[run] headless smoke…"
BASE_URL="http://127.0.0.1:$WEB_PORT" API_URL="http://127.0.0.1:$API_PORT" node scripts/headless-smoke.mjs

echo "[run] done. screenshots in voidborn/.artifacts/"

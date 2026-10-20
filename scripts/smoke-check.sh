#!/usr/bin/env sh
# MixMaster smoke check: SPA + catalog API (2-3 steps).
# Usage: after `docker compose up --build -d`, run:
#   ./scripts/smoke-check.sh
# Optional base URL: BASE_URL=http://localhost:8080 ./scripts/smoke-check.sh

set -eu

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "1/3 Checking SPA at ${BASE_URL} ..."
code=$(curl -sS -o /tmp/mixmaster-home.html -w "%{http_code}" --max-time 30 "${BASE_URL}/")
if [ "$code" != "200" ]; then
  echo "SPA check failed: HTTP ${code}" >&2
  exit 1
fi
echo "   OK HTTP ${code}"

API_URL="${BASE_URL}/api/v1/cocktails/"
echo "2/3 Checking catalog API at ${API_URL} ..."
code=$(curl -sS -o /tmp/mixmaster-cocktails.json -w "%{http_code}" --max-time 30 "${API_URL}")
if [ "$code" != "200" ]; then
  echo "API check failed: HTTP ${code}" >&2
  exit 1
fi
echo "   OK HTTP ${code}"

echo "3/3 Checking JSON body ..."
# Minimal JSON array/object check without jq dependency
head_c=$(head -c 1 /tmp/mixmaster-cocktails.json)
if [ "$head_c" != "[" ] && [ "$head_c" != "{" ]; then
  echo "API response does not look like JSON" >&2
  exit 1
fi
echo "   OK JSON looks valid"

echo ""
echo "Smoke check passed. Open ${BASE_URL} in a browser for UI verification."

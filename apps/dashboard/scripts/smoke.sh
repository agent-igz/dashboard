#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${DASHBOARD_SMOKE_PORT:-3100}"
npx next dev -p "$PORT" >/tmp/business-rd-dashboard-smoke.log 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${PORT}/api/workflows/business-rd/runs" >/dev/null; then
    break
  fi
  sleep 1
done
PAYLOAD='{"topic":"smoke test run","idea_count":2,"mode":"simple","preset":"solo-founder","constraints":["online only"],"business_model":"productized service","agent_role":"core-engine"}'
RUN_JSON=$(curl -sf -X POST "http://127.0.0.1:${PORT}/api/workflows/business-rd/runs" -H 'content-type: application/json' -d "$PAYLOAD")
RUN_ID=$(printf '%s' "$RUN_JSON" | jq -r '.run.id')
[ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ]
for _ in $(seq 1 120); do
  STATUS=$(curl -sf "http://127.0.0.1:${PORT}/api/workflows/business-rd/runs/$RUN_ID" | jq -r '.run.status')
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  sleep 1
done
curl -sf "http://127.0.0.1:${PORT}/api/workflows/business-rd/runs/$RUN_ID" | jq -e '.run.id == $id' --arg id "$RUN_ID" >/dev/null
curl -sf "http://127.0.0.1:${PORT}/api/workflows/business-rd/runs" | jq -e '.runs | length >= 1' >/dev/null
echo "smoke-ok:$RUN_ID:$STATUS"

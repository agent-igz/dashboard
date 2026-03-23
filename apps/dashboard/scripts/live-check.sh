#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${DASHBOARD_LIVE_CHECK_PORT:-3200}"
npx next dev -p "$PORT" >/tmp/business-rd-dashboard-live-check.log 2>&1 &
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
run_and_wait() {
  local payload="$1"
  local run_json run_id status
  run_json=$(curl -sf -X POST "http://127.0.0.1:${PORT}/api/workflows/business-rd/runs" -H 'content-type: application/json' -d "$payload")
  run_id=$(printf '%s' "$run_json" | jq -r '.run.id')
  for _ in $(seq 1 180); do
    status=$(curl -sf "http://127.0.0.1:${PORT}/api/workflows/business-rd/runs/$run_id" | jq -r '.run.status')
    if [ "$status" = "completed" ] || [ "$status" = "failed" ]; then
      break
    fi
    sleep 1
  done
  curl -sf "http://127.0.0.1:${PORT}/api/workflows/business-rd/runs/$run_id"
}
RUN_A=$(run_and_wait '{"topic":"AI-agent businesses for solo compliance operators","idea_count":2,"mode":"simple","preset":"solo-founder","constraints":["online only"],"business_model":"service","agent_role":"core-engine"}')
RUN_B=$(run_and_wait '{"topic":"AI-agent businesses for developer tooling teams","idea_count":2,"mode":"simple","preset":"solo-founder","constraints":["online only"],"business_model":"software","agent_role":"core-engine"}')
A_FIRST=$(printf '%s' "$RUN_A" | jq -r '.run.roleOutputs.generator.candidates[0].name // empty')
B_FIRST=$(printf '%s' "$RUN_B" | jq -r '.run.roleOutputs.generator.candidates[0].name // empty')
[ -n "$A_FIRST" ] && [ -n "$B_FIRST" ]
if [ "$A_FIRST" = "$B_FIRST" ]; then
  echo "live-check-failed: identical first idea names"
  exit 1
fi
if grep -q 'SAMPLE_REVIEWER_DIR' src/lib/run-service.ts; then
  echo "live-check-failed: sample reviewer fixture path still present"
  exit 1
fi
echo "live-check-ok:$A_FIRST::$B_FIRST"

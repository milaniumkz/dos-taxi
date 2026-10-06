#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_ENV_FILE="$ROOT_DIR/apps/api/.env.local"
API_LOG_FILE="${TMPDIR:-/tmp}/dos-runtime-api.log"
API_PID_FILE="${TMPDIR:-/tmp}/dos-runtime-api.pid"

run_step() {
  local label="$1"
  shift
  echo
  echo "==> $label"
  "$@"
}

info() {
  echo "[info] $*"
}

warn() {
  echo "[warn] $*" >&2
}

fail() {
  echo "[fail] $*" >&2
  exit 1
}

cleanup() {
  if [[ -f "$API_PID_FILE" ]]; then
    local pid
    pid="$(cat "$API_PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$API_PID_FILE"
  fi
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-20}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    if curl -f -s --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      return 1
    fi

    sleep 1
  done
}

is_local_port_open() {
  local port="$1"
  (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
}

resolve_local_api_port() {
  if [[ -n "${RUNTIME_API_PORT:-}" ]]; then
    echo "$RUNTIME_API_PORT"
    return 0
  fi

  local candidate
  for candidate in 3301 3302 3303 3304 3305; do
    if ! is_local_port_open "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done

  fail "No free local API smoke port found in range 3301-3305"
}

trap cleanup EXIT

[[ -f "$API_ENV_FILE" ]] || fail "Missing API env file: $API_ENV_FILE"

set -a
source "$API_ENV_FILE"
set +a

LOCAL_API_PORT="$(resolve_local_api_port)"
LOCAL_API_PREFIX="${API_PREFIX:-api/v1}"
LOCAL_API_BASE_URL="http://127.0.0.1:${LOCAL_API_PORT}/${LOCAL_API_PREFIX}"

run_step "boot local infra" bash scripts/boot_local_infra.sh
run_step "prepare local runtime" bash scripts/prepare_local_runtime.sh
run_step "reset local smoke state" node scripts/reset_local_smoke_state.mjs

info "Starting local API runtime on ${LOCAL_API_BASE_URL}"
(
  cd "$ROOT_DIR/apps/api"
  PORT="$LOCAL_API_PORT" node dist/apps/api/src/main.js >"$API_LOG_FILE" 2>&1
) &
echo "$!" >"$API_PID_FILE"

if ! wait_for_url "$LOCAL_API_BASE_URL/health/ready" 20; then
  echo
  echo "--- API LOG ---"
  cat "$API_LOG_FILE" || true
  fail "Local API runtime did not become ready at $LOCAL_API_BASE_URL/health/ready"
fi

if [[ -n "${ADMIN_API_URL:-}" && "${ADMIN_API_URL%/}" != "$LOCAL_API_BASE_URL" ]]; then
  warn "Overriding ADMIN_API_URL for runtime:smoke: ${ADMIN_API_URL} -> ${LOCAL_API_BASE_URL}"
fi
export ADMIN_API_URL="$LOCAL_API_BASE_URL"

if [[ -z "${ADMIN_API_TOKEN:-}" ]]; then
  info "Generating development admin token for live admin smoke"
  ADMIN_API_TOKEN="$(
    cd "$ROOT_DIR/apps/api" &&
      ./node_modules/.bin/ts-node --project tsconfig.json scripts/generate-dev-admin-token.ts
  )"
  export ADMIN_API_TOKEN
else
  info "Using provided ADMIN_API_TOKEN for live admin smoke"
fi

run_step "admin live http smoke" bash scripts/smoke_admin_live_http.sh

run_step \
  "api http smoke" \
  env API_SMOKE_SKIP_BOOT=true API_SMOKE_BASE_URL="$LOCAL_API_BASE_URL" API_SMOKE_PORT="$LOCAL_API_PORT" API_SMOKE_LOG_FILE="$API_LOG_FILE" bash scripts/smoke_api_http.sh

echo
echo "Local live smoke finished successfully."

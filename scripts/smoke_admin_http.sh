#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ADMIN_PORT="${ADMIN_SMOKE_PORT:-3200}"
ADMIN_BASE_URL="http://127.0.0.1:${ADMIN_PORT}"
LOG_FILE="${TMPDIR:-/tmp}/dos-admin-smoke.log"
PID_FILE="${TMPDIR:-/tmp}/dos-admin-smoke.pid"

info() {
  echo "[info] $*"
}

fail() {
  echo "[fail] $*" >&2
  exit 1
}

cleanup() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$PID_FILE"
  fi
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-20}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    if curl -I -s --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      return 1
    fi

    sleep 1
  done
}

assert_http_ok() {
  local url="$1"
  local label="$2"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url")"
  if [[ "$status" != "200" ]]; then
    fail "${label} is not reachable: ${url} (status=${status})"
  fi
}

assert_health_mode() {
  local url="$1"
  local expected_mode="$2"
  local expected_warning="$3"

  local payload
  payload="$(curl -s --max-time 3 "$url")"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    const expectedMode = process.argv[2];
    const expectedWarning = process.argv[3];

    if (payload.status !== "ok") {
      throw new Error(`unexpected status: ${payload.status}`);
    }

    if (payload.mode !== expectedMode) {
      throw new Error(`unexpected mode: ${payload.mode}`);
    }

    if (expectedWarning && !Array.isArray(payload.warnings)) {
      throw new Error("warnings payload is not an array");
    }

    if (expectedWarning && !payload.warnings.includes(expectedWarning)) {
      throw new Error(`missing warning: ${expectedWarning}`);
    }
  ' "$payload" "$expected_mode" "$expected_warning"
}

trap cleanup EXIT

[[ -f "$ROOT_DIR/apps/admin/.next/BUILD_ID" ]] || fail "Admin build artifact is missing. Run 'corepack pnpm --filter @dos/admin build' first."

info "Starting admin on port ${ADMIN_PORT} in demo mode"
(
  cd "$ROOT_DIR/apps/admin"
  PORT="$ADMIN_PORT" HOSTNAME="127.0.0.1" ADMIN_API_URL="" ADMIN_API_TOKEN="" corepack pnpm start >"$LOG_FILE" 2>&1
) &
echo "$!" >"$PID_FILE"

if ! wait_for_url "$ADMIN_BASE_URL/" 20; then
  echo
  echo "--- ADMIN LOG ---"
  cat "$LOG_FILE" || true
  fail "Admin did not become ready at $ADMIN_BASE_URL"
fi

assert_http_ok "$ADMIN_BASE_URL/" "admin home"
assert_http_ok "$ADMIN_BASE_URL/api/health" "admin health"
assert_http_ok "$ADMIN_BASE_URL/orders" "admin orders"
assert_http_ok "$ADMIN_BASE_URL/notes" "admin notes"
assert_http_ok "$ADMIN_BASE_URL/activity" "admin activity"
assert_http_ok "$ADMIN_BASE_URL/promo-codes/demo-promo?lang=kk" "admin promo detail demo route"
assert_health_mode "$ADMIN_BASE_URL/api/health" "demo" "ADMIN_API_TOKEN_MISSING"

echo
echo "Admin HTTP smoke passed."

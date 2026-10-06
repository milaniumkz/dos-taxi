#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

require_env() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "${value// }" ]]; then
    fail "$key is required"
  fi
}

check_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1
}

normalize_admin_api_url() {
  local raw_url="$1"
  node -e '
    const rawUrl = process.argv[1];
    try {
      const normalized = new URL(rawUrl).toString().replace(/\/$/, "");
      process.stdout.write(normalized);
    } catch {
      process.exit(1);
    }
  ' "$raw_url"
}

assert_http_status() {
  local url="$1"
  local expected="$2"
  local label="$3"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url")"
  if [[ "$status" != "$expected" ]]; then
    fail "${label} returned status=${status}, expected ${expected}: ${url}"
  fi
}

assert_admin_api_orders() {
  local api_base_url="$1"
  local api_token="$2"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer ${api_token}" \
    -H "Content-Type: application/json" \
    "${api_base_url}/admin/orders?limit=1")"
  if [[ "$status" != "200" ]]; then
    fail "admin orders probe returned status=${status}, expected 200: ${api_base_url}/admin/orders?limit=1"
  fi
}

check_command node || fail "node is required"
check_command curl || fail "curl is required"

require_env "ADMIN_API_URL"

if ! ADMIN_API_TOKEN_RESOLVED="$(bash "$ROOT_DIR/scripts/resolve_admin_runtime_token.sh")"; then
  fail "Unable to resolve ADMIN_API_TOKEN for admin runtime preflight"
fi

if ! ADMIN_API_BASE_URL="$(normalize_admin_api_url "$ADMIN_API_URL")"; then
  fail "ADMIN_API_URL must be a valid absolute URL"
fi

info "Admin API target: ${ADMIN_API_BASE_URL}"

assert_http_status "${ADMIN_API_BASE_URL}/health" "200" "api health"
assert_http_status "${ADMIN_API_BASE_URL}/health/ready" "200" "api readiness"
assert_admin_api_orders "$ADMIN_API_BASE_URL" "$ADMIN_API_TOKEN_RESOLVED"

echo
echo "Admin runtime preflight passed."

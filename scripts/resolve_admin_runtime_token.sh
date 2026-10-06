#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

info() {
  echo "[info] $*" >&2
}

fail() {
  echo "[fail] $*" >&2
  exit 1
}

normalize_optional_string() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
  fi
}

extract_url_host() {
  local raw_url="$1"
  node -e '
    try {
      const url = new URL(process.argv[1]);
      process.stdout.write(url.hostname);
    } catch {
      process.exit(1);
    }
  ' "$raw_url"
}

is_local_host() {
  local host="$1"
  [[ "$host" == "localhost" || "$host" == "127.0.0.1" || "$host" == "::1" ]]
}

resolved_token="$(normalize_optional_string "${ADMIN_API_TOKEN:-}")"
if [[ -n "$resolved_token" ]]; then
  printf '%s' "$resolved_token"
  exit 0
fi

resolved_api_url="$(normalize_optional_string "${ADMIN_API_URL:-}")"
if [[ -z "$resolved_api_url" ]]; then
  fail "ADMIN_API_TOKEN is not set and ADMIN_API_URL is missing, so a local dev token cannot be generated"
fi

if ! api_host="$(extract_url_host "$resolved_api_url")"; then
  fail "ADMIN_API_URL must be a valid absolute URL before generating a local dev token"
fi

if ! is_local_host "$api_host"; then
  fail "ADMIN_API_TOKEN is required for non-local ADMIN_API_URL (${resolved_api_url})"
fi

[[ -f "$ROOT_DIR/apps/api/.env.local" ]] || fail "Missing apps/api/.env.local for local dev token generation"
[[ -x "$ROOT_DIR/apps/api/node_modules/.bin/ts-node" ]] || fail "Missing apps/api/node_modules/.bin/ts-node. Install backend dependencies first."

info "Generating local development admin token for ${resolved_api_url}"
(
  cd "$ROOT_DIR/apps/api"
  set -a
  source .env.local
  set +a
  ./node_modules/.bin/ts-node --project tsconfig.json scripts/generate-dev-admin-token.ts
)

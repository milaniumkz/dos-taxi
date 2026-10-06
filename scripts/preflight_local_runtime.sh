#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_ENV_FILE="$ROOT_DIR/apps/api/.env.local"

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

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "Missing required file: $path"
}

check_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1
}

extract_url_part() {
  local raw_url="$1"
  local field="$2"
  node -e '
    const rawUrl = process.argv[1];
    const field = process.argv[2];
    const url = new URL(rawUrl);
    const port = url.port || (
      url.protocol === "postgresql:" ? "5432"
        : url.protocol === "redis:" ? "6379"
        : url.protocol === "http:" ? "80"
        : url.protocol === "https:" ? "443"
        : ""
    );
    const values = {
      host: url.hostname,
      port,
      pathname: url.pathname.replace(/^\//, ""),
      protocol: url.protocol.replace(/:$/, ""),
    };
    process.stdout.write(String(values[field] ?? ""));
  ' "$raw_url" "$field"
}

check_tcp() {
  local host="$1"
  local port="$2"
  node -e '
    const host = process.argv[1];
    const port = Number(process.argv[2]);
    const net = require("node:net");

    const socket = net.createConnection({ host, port });
    socket.setTimeout(1500);
    socket.on("connect", () => {
      socket.end();
      process.exit(0);
    });
    socket.on("timeout", () => {
      console.error(`timeout:${host}:${port}`);
      socket.destroy();
      process.exit(1);
    });
    socket.on("error", (error) => {
      console.error(`${error.code ?? "error"}:${host}:${port}`);
      process.exit(1);
    });
  ' "$host" "$port"
}

check_http() {
  local raw_url="$1"
  curl -I -s --max-time 3 "$raw_url" >/dev/null
}

check_s3_endpoint() {
  local raw_url="${1%/}"
  curl -f -s --max-time 3 "$raw_url/minio/health/live" >/dev/null || check_http "$raw_url"
}

require_file "$API_ENV_FILE"
require_file "$ROOT_DIR/packages/shared-types/dist/index.js"
require_file "$ROOT_DIR/apps/api/dist/apps/api/src/main.js"
require_file "$ROOT_DIR/apps/admin/.next/BUILD_ID"

set -a
source "$API_ENV_FILE"
set +a

check_command node || fail "node is required"
check_command corepack || fail "corepack is required"

DATABASE_HOST="$(extract_url_part "${DATABASE_URL:-}" host)"
DATABASE_PORT="$(extract_url_part "${DATABASE_URL:-}" port)"
DATABASE_NAME="$(extract_url_part "${DATABASE_URL:-}" pathname)"
REDIS_HOST="$(extract_url_part "${REDIS_URL:-}" host)"
REDIS_PORT="$(extract_url_part "${REDIS_URL:-}" port)"
S3_HOST="$(extract_url_part "${S3_ENDPOINT:-}" host)"
S3_PORT="$(extract_url_part "${S3_ENDPOINT:-}" port)"

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set in $API_ENV_FILE"
[[ -n "${REDIS_URL:-}" ]] || fail "REDIS_URL is not set in $API_ENV_FILE"
[[ -n "${S3_ENDPOINT:-}" ]] || fail "S3_ENDPOINT is not set in $API_ENV_FILE"
[[ -n "${S3_BUCKET:-}" ]] || fail "S3_BUCKET is not set in $API_ENV_FILE"

info "API env file: $API_ENV_FILE"
info "Database target: ${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
info "Redis target: ${REDIS_HOST}:${REDIS_PORT}"
info "S3 target: ${S3_ENDPOINT}"

if check_command docker; then
  info "docker: available"
else
  warn "docker: not installed"
fi

if check_tcp "$DATABASE_HOST" "$DATABASE_PORT"; then
  info "database tcp: reachable"
else
  fail "database tcp is not reachable at ${DATABASE_HOST}:${DATABASE_PORT}"
fi

if check_tcp "$REDIS_HOST" "$REDIS_PORT"; then
  info "redis tcp: reachable"
else
  fail "redis tcp is not reachable at ${REDIS_HOST}:${REDIS_PORT}"
fi

if check_s3_endpoint "$S3_ENDPOINT"; then
  info "s3 endpoint: reachable"
else
  fail "s3 endpoint is not reachable at ${S3_ENDPOINT}"
fi

echo
echo "Local runtime preflight passed."

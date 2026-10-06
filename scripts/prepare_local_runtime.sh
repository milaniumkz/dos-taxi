#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_ENV_FILE="$ROOT_DIR/apps/api/.env.local"

info() {
  echo "[info] $*"
}

fail() {
  echo "[fail] $*" >&2
  exit 1
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
      socket.destroy();
      process.exit(1);
    });
    socket.on("error", () => process.exit(1));
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

[[ -f "$API_ENV_FILE" ]] || fail "Missing API env file: $API_ENV_FILE"
check_command node || fail "node is required"
check_command corepack || fail "corepack is required"

set -a
source "$API_ENV_FILE"
set +a

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set in $API_ENV_FILE"
[[ -n "${REDIS_URL:-}" ]] || fail "REDIS_URL is not set in $API_ENV_FILE"
[[ -n "${S3_ENDPOINT:-}" ]] || fail "S3_ENDPOINT is not set in $API_ENV_FILE"
[[ -n "${S3_BUCKET:-}" ]] || fail "S3_BUCKET is not set in $API_ENV_FILE"

DATABASE_HOST="$(extract_url_part "$DATABASE_URL" host)"
DATABASE_PORT="$(extract_url_part "$DATABASE_URL" port)"
REDIS_HOST="$(extract_url_part "$REDIS_URL" host)"
REDIS_PORT="$(extract_url_part "$REDIS_URL" port)"

info "Checking runtime dependencies"
check_tcp "$DATABASE_HOST" "$DATABASE_PORT" || fail "Database is not reachable at ${DATABASE_HOST}:${DATABASE_PORT}"
check_tcp "$REDIS_HOST" "$REDIS_PORT" || fail "Redis is not reachable at ${REDIS_HOST}:${REDIS_PORT}"
check_s3_endpoint "$S3_ENDPOINT" || fail "S3 endpoint is not reachable at ${S3_ENDPOINT}"

info "Building shared-types"
corepack pnpm --filter @dos/shared-types build

info "Building API"
corepack pnpm --filter @dos/api build

info "Running database migrations"
corepack pnpm --filter @dos/api migration:run

info "Ensuring S3 bucket ${S3_BUCKET}"
corepack pnpm --filter @dos/api storage:ensure-bucket

info "Seeding development data"
corepack pnpm --filter @dos/api seed:dev

echo
echo "Local runtime preparation finished successfully."

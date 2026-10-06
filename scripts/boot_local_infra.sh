#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"
API_ENV_FILE="$ROOT_DIR/apps/api/.env.local"
MINIO_PID_FILE="${TMPDIR:-/tmp}/dos-minio.pid"
MINIO_LOG_FILE="${TMPDIR:-/tmp}/dos-minio.log"

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
    const values = {
      host: url.hostname,
      port: url.port || (
        url.protocol === "postgresql:" ? "5432"
          : url.protocol === "redis:" ? "6379"
          : url.protocol === "http:" ? "80"
          : url.protocol === "https:" ? "443"
          : ""
      ),
      pathname: url.pathname.replace(/^\//, ""),
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
    process.stdout.write(String(values[field] ?? ""));
  ' "$raw_url" "$field"
}

wait_for_tcp() {
  local host="$1"
  local port="$2"
  local timeout_seconds="${3:-30}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    if node -e '
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
    ' "$host" "$port" >/dev/null 2>&1; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      return 1
    fi

    sleep 1
  done
}

wait_for_http() {
  local url="$1"
  local timeout_seconds="${2:-30}"
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

start_brew_service() {
  local formula="$1"
  check_command brew || fail "brew is required for Homebrew local infra fallback"
  info "Starting Homebrew service: $formula"
  brew services start "$formula" >/dev/null
}

ensure_database() {
  local database_url="$1"
  local db_name db_user db_password psql_bin createdb_bin

  db_name="$(extract_url_part "$database_url" pathname)"
  db_user="$(extract_url_part "$database_url" username)"
  db_password="$(extract_url_part "$database_url" password)"
  psql_bin="$(brew --prefix postgresql@15)/bin/psql"
  createdb_bin="$(brew --prefix postgresql@15)/bin/createdb"

  [[ -x "$psql_bin" ]] || fail "psql not found at $psql_bin"
  [[ -x "$createdb_bin" ]] || fail "createdb not found at $createdb_bin"
  [[ -n "$db_name" ]] || fail "Database name is empty in DATABASE_URL"
  [[ -n "$db_user" ]] || fail "Database user is empty in DATABASE_URL"

  if [[ "$("$psql_bin" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$db_user'")" != "1" ]]; then
    info "Creating PostgreSQL role: $db_user"
    "$psql_bin" -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE \"$db_user\" LOGIN PASSWORD '$db_password';" >/dev/null
  fi

  if [[ "$("$psql_bin" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$db_name'")" != "1" ]]; then
    info "Creating PostgreSQL database: $db_name"
    "$createdb_bin" -O "$db_user" "$db_name"
  fi
}

start_minio_fallback() {
  local minio_bin minio_data_dir
  minio_bin="$(brew --prefix minio)/bin/minio"
  minio_data_dir="$(brew --prefix)/var/minio"

  [[ -x "$minio_bin" ]] || fail "minio binary not found at $minio_bin"
  mkdir -p "$minio_data_dir"

  if wait_for_http "http://127.0.0.1:9000/minio/health/live" 1; then
    info "MinIO is already reachable"
    return 0
  fi

  if check_command launchctl; then
    info "Starting MinIO Homebrew service with credentials from $API_ENV_FILE"
    launchctl setenv MINIO_ROOT_USER "${S3_ACCESS_KEY_ID:-minio}"
    launchctl setenv MINIO_ROOT_PASSWORD "${S3_SECRET_ACCESS_KEY:-minio123}"
    brew services restart minio >/dev/null
    return 0
  fi

  info "Starting MinIO foreground fallback with credentials from $API_ENV_FILE"
  MINIO_ROOT_USER="${S3_ACCESS_KEY_ID:-minio}" \
    MINIO_ROOT_PASSWORD="${S3_SECRET_ACCESS_KEY:-minio123}" \
    nohup "$minio_bin" server --address ":9000" "$minio_data_dir" >"$MINIO_LOG_FILE" 2>&1 &
  echo "$!" >"$MINIO_PID_FILE"
}

[[ -f "$COMPOSE_FILE" ]] || fail "Missing compose file: $COMPOSE_FILE"

if check_command docker; then
  info "Starting docker compose stack"
  docker compose -f "$COMPOSE_FILE" up -d
else
  [[ -f "$API_ENV_FILE" ]] || fail "Missing API env file: $API_ENV_FILE"
  set -a
  source "$API_ENV_FILE"
  set +a

  info "Docker is not installed; using Homebrew local infra fallback"
  start_brew_service postgresql@15
  start_brew_service redis
  start_brew_service rabbitmq
  start_minio_fallback
fi

info "Waiting for PostgreSQL on 127.0.0.1:5432"
wait_for_tcp "127.0.0.1" "5432" 30 || fail "PostgreSQL did not become reachable on 127.0.0.1:5432"
if ! check_command docker; then
  ensure_database "${DATABASE_URL:-}"
fi

info "Waiting for Redis on 127.0.0.1:6379"
wait_for_tcp "127.0.0.1" "6379" 30 || fail "Redis did not become reachable on 127.0.0.1:6379"

info "Waiting for RabbitMQ on 127.0.0.1:5672"
wait_for_tcp "127.0.0.1" "5672" 30 || fail "RabbitMQ did not become reachable on 127.0.0.1:5672"

info "Waiting for MinIO on http://127.0.0.1:9000/minio/health/live"
if ! wait_for_http "http://127.0.0.1:9000/minio/health/live" 30; then
  [[ -f "$MINIO_LOG_FILE" ]] && tail -n 80 "$MINIO_LOG_FILE" >&2
  fail "MinIO did not become reachable on port 9000"
fi

echo
echo "Local infra stack is ready."

#!/usr/bin/env bash
set -euo pipefail

dump_file="${1:?Usage: scripts/restore-db.sh path/to/platform_db.dump}"

cd "$(dirname "$0")/.."

set -a
source .env
set +a

docker compose --env-file .env -f docker-compose.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  < "$dump_file"

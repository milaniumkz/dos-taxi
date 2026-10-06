#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

set -a
source .env
set +a

backup_dir="${1:-backups/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$backup_dir"

docker compose --env-file .env -f docker-compose.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "$backup_dir/platform_db.dump"

redis_volume="${COMPOSE_PROJECT_NAME:-dos}_redis_data"
if docker volume inspect "$redis_volume" >/dev/null 2>&1; then
  docker run --rm \
    -v "$redis_volume:/data:ro" \
    -v "$(pwd)/$backup_dir:/backup" \
    alpine:3.20 sh -c 'cd /data && tar czf /backup/redis_data.tar.gz .'
fi

if [[ -f .env ]]; then
  cp .env "$backup_dir/env.backup"
  chmod 600 "$backup_dir/env.backup"
fi

echo "Backup written to deploy/vps/$backup_dir"

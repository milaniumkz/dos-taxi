#!/usr/bin/env bash
set -euo pipefail

incoming_dir="${1:?Usage: ci-promote-release.sh /opt/dos/_incoming/SHA /opt/dos SHA}"
target_dir="${2:?Usage: ci-promote-release.sh /opt/dos/_incoming/SHA /opt/dos SHA}"
commit_sha="${3:?Usage: ci-promote-release.sh /opt/dos/_incoming/SHA /opt/dos SHA}"
runtime_mode="${4:-}"
if [[ -n "$runtime_mode" && "$runtime_mode" != "--runtime-config-stdin" ]]; then
  echo "Unsupported runtime configuration mode"
  exit 1
fi

# Capture SSH stdin before Docker's interactive exec can consume the payload.
# Keep credentials in this non-exported shell variable, never in CLI arguments.
runtime_settings=""
if [[ "$runtime_mode" == "--runtime-config-stdin" ]]; then
  runtime_settings="$(cat)"
fi

lock_file="/tmp/dos-production-deploy.lock"
exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Another DOS deployment is running."
  exit 1
fi

timestamp="$(date -u +%Y%m%d-%H%M%S)"
backup_dir="$target_dir/deploy/vps/backups/predeploy-$timestamp-${commit_sha:0:12}"
mkdir -p "$backup_dir"

compose_dir="$target_dir/deploy/vps"
if [[ -f "$compose_dir/.env" && -f "$compose_dir/docker-compose.yml" ]]; then
  (
    cd "$compose_dir"
    docker compose --env-file .env -f docker-compose.yml exec -T postgres \
      sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
      > "$backup_dir/platform_db.dump"

    redis_container="$(docker compose --env-file .env -f docker-compose.yml ps -q redis || true)"
    if [[ -n "$redis_container" ]]; then
      docker run --rm \
        --volumes-from "$redis_container:ro" \
        -v "$backup_dir:/backup" \
        alpine:3.20 sh -c 'cd /data && tar czf /backup/redis_data.tar.gz .'
    fi

    cp .env "$backup_dir/env.backup"
    chmod 600 "$backup_dir/env.backup"
  )
fi

tar \
  --exclude='./_incoming' \
  --exclude='./node_modules' \
  --exclude='./apps/admin/.next' \
  --exclude='./apps/api/dist' \
  --exclude='./apps/mobile/build' \
  --exclude='./deploy/vps/backups' \
  --exclude='./deploy/vps/.env' \
  --exclude='./deploy/hosting-public' \
  --exclude='./deploy/hosting-passenger' \
  --exclude='./deploy/hosting-driver' \
  --exclude='./.git' \
  -czf "$backup_dir/source.tar.gz" \
  -C "$target_dir" .

for role in passenger driver; do
  if [[ -d "$incoming_dir/_web/$role" && -d "$target_dir/deploy/hosting-public/$role" ]]; then
    tar -czf "$backup_dir/$role-web.tar.gz" -C "$target_dir/deploy/hosting-public" "$role"
  fi
done

runtime_nginx_excludes=()
if [[ -f "$target_dir/deploy/vps/nginx/certbot/ip-https/enabled" ]]; then
  runtime_nginx_excludes+=(--exclude='deploy/vps/nginx/templates/default.conf.template')
fi
rsync -a --delete "${runtime_nginx_excludes[@]}" \
  --exclude='_web/' \
  --exclude='_incoming/' \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='apps/admin/.next/' \
  --exclude='apps/api/dist/' \
  --exclude='apps/mobile/build/' \
  --exclude='builds/' \
  --exclude='artifacts/' \
  --exclude='infra/data/' \
  --exclude='.DS_Store' \
  --exclude='._*' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='deploy/.env*.yaml' \
  --exclude='deploy/.env*.json' \
  --exclude='deploy/vps/.env' \
  --exclude='deploy/vps/backups/' \
  --exclude='deploy/vps/nginx/certbot/' \
  --exclude='deploy/hosting-public/' \
  --exclude='deploy/hosting-passenger/' \
  --exclude='deploy/hosting-driver/' \
  --exclude='apps/api/.env.local' \
  --exclude='apps/mobile/android/*.jks' \
  --exclude='apps/mobile/android/*.keystore' \
  --exclude='apps/mobile/android/key.properties' \
  "$incoming_dir/" "$target_dir/"

cd "$target_dir/deploy/vps"

if [[ "$runtime_mode" == "--runtime-config-stdin" ]]; then
  printf '%s' "$runtime_settings" | python3 scripts/configure-smsc.py .env
  unset runtime_settings
fi

docker compose --env-file .env -f docker-compose.yml build api admin
run_db_migrations="$(awk -F= '$1 == "RUN_DB_MIGRATIONS" { print $2 }' .env 2>/dev/null | tail -n 1 | tr -d '\r\"' | tr -d "'")"
if [[ "${run_db_migrations:-true}" == "true" ]]; then
  scripts/migrate.sh
fi
docker compose --env-file .env -f docker-compose.yml up -d api admin nginx

docker compose --env-file .env -f docker-compose.yml exec -T api node -e "
fetch('http://127.0.0.1:3000/api/v1/health')
  .then(async (r) => {
    const body = await r.text();
    console.log(r.status, body);
    process.exit(r.ok ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
"

for role in passenger driver; do
  if [[ -d "$incoming_dir/_web/$role" ]]; then
    [[ -f "$incoming_dir/_web/$role/index.html" && -f "$incoming_dir/_web/$role/main.dart.js" ]]
    mkdir -p "$target_dir/deploy/hosting-public/$role"
    rsync -a --delete "$incoming_dir/_web/$role/" "$target_dir/deploy/hosting-public/$role/"
    printf '%s\n' "$commit_sha" > "$target_dir/deploy/hosting-public/$role/release.txt"
  fi
done

cat > DEPLOYED_VERSION <<EOF_VERSION
commit=$commit_sha
deployed_at=$(date -u +%FT%TZ)
backup=$backup_dir
EOF_VERSION

rm -rf "$incoming_dir"
echo "Deployed $commit_sha"
echo "Backup: $backup_dir"

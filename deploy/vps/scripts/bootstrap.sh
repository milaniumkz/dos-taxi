#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created deploy/vps/.env. Fill domains and secrets, then run again."
  exit 1
fi

docker compose --env-file .env -f docker-compose.yml build
docker compose --env-file .env -f docker-compose.yml up -d postgres redis
docker compose --env-file .env -f docker-compose.yml run --rm api node -r ts-node/register ./node_modules/typeorm/cli.js -d src/database/data-source.ts migration:run
docker compose --env-file .env -f docker-compose.yml up -d

echo "API health:"
docker compose --env-file .env -f docker-compose.yml exec -T api node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(async r=>{console.log(r.status, await r.text()); process.exit(r.ok?0:1)}).catch(e=>{console.error(e); process.exit(1)})"

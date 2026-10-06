#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
docker compose --env-file .env -f docker-compose.yml run --rm api node -r ts-node/register ./node_modules/typeorm/cli.js -d src/database/data-source.ts migration:run

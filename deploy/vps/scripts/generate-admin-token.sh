#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../.."

ENV_FILE="deploy/vps/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

JWT_SECRET="$(grep -E '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2-)"
if [[ -z "$JWT_SECRET" || "$JWT_SECRET" == CHANGE_ME* ]]; then
  echo "Set JWT_SECRET in $ENV_FILE first."
  exit 1
fi

cd apps/api
JWT_SECRET="$JWT_SECRET" node - <<'NODE'
const { JwtService } = require('@nestjs/jwt');
const token = new JwtService({ secret: process.env.JWT_SECRET }).sign(
  {
    sub: '00000000-0000-4000-8000-000000000001',
    phone: '+77000000001',
    role: 'admin',
  },
  { expiresIn: '365d' },
);
process.stdout.write(`${token}\n`);
NODE

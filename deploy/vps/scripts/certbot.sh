#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

source .env

email="${1:?Usage: scripts/certbot.sh admin@example.com}"

docker compose --env-file .env -f docker-compose.yml up -d nginx

docker run --rm \
  -v "$(pwd)/nginx/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/nginx/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --email "$email" \
  --agree-tos \
  --no-eff-email \
  -d "$API_DOMAIN" \
  -d "$ADMIN_DOMAIN"

echo "Certificates issued. Copy nginx/templates/default.ssl.conf.example to default.conf.template and restart nginx."

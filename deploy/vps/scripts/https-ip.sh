#!/usr/bin/env bash
set -euo pipefail

operation="${1:?Usage: https-ip.sh status|setup|renew /opt/dos/deploy/vps IP}"
runtime_dir="${2:?Runtime directory required}"
address="${3:?Public IP required}"
python3 - "$address" <<'PY'
import ipaddress, sys
ipaddress.IPv4Address(sys.argv[1])
PY
cd "$runtime_dir"
compose=(docker compose --env-file .env -f docker-compose.yml)

if [[ "$operation" == status ]]; then
  echo "Runtime user ID: $(id -u)"
  "${compose[@]}" exec -T nginx nginx -T 2>&1 | awk '/^[[:space:]]*(listen|server_name|ssl_certificate|ssl_certificate_key)[[:space:]]/ {print}'
  for certificate in nginx/certbot/conf/live/*/fullchain.pem; do
    [[ -f "$certificate" ]] || continue
    openssl x509 -in "$certificate" -noout -subject -issuer -dates -ext subjectAltName
  done
  exit 0
fi

echo "Unsupported operation: $operation" >&2
exit 1

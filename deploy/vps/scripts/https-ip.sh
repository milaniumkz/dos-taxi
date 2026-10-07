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

[[ "$operation" == setup || "$operation" == renew ]] || { echo "Unsupported operation" >&2; exit 1; }
[[ "$(id -u)" == 0 ]] || { echo "HTTPS setup/renewal requires the VPS administrator" >&2; exit 1; }
exec 9>/tmp/dos-production-deploy.lock
flock -w 60 9
certbot_image=certbot/certbot:v5.8.0
certificate_root="$runtime_dir/nginx/certbot/conf"
webroot="$runtime_dir/nginx/certbot/www"
mkdir -p "$certificate_root" "$webroot"
certbot=(docker run --rm -v "$certificate_root:/etc/letsencrypt" -v "$webroot:/var/www/certbot" "$certbot_image")

if [[ "$operation" == renew ]]; then
  "${certbot[@]}" renew --cert-name dos-ip --quiet
  "${compose[@]}" exec -T nginx nginx -t
  "${compose[@]}" exec -T nginx nginx -s reload
  openssl x509 -in "$certificate_root/live/dos-ip/fullchain.pem" -noout -dates -checkip "$address"
  exit 0
fi

renderer="${4:?Renderer script required for setup}"
systemctl show-environment >/dev/null
[[ "$runtime_dir" =~ ^/[A-Za-z0-9_/-]+$ ]] || { echo "Unsupported runtime path" >&2; exit 1; }
backup="$runtime_dir/backups/https-ip-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$backup"
cp nginx/templates/default.conf.template "$backup/source.template"
"${compose[@]}" exec -T nginx cat /etc/nginx/conf.d/default.conf > "$backup/live.conf"

# HTTP-01 uses the existing nginx webroot, without stopping the application.
"${certbot[@]}" certonly --non-interactive --agree-tos --register-unsafely-without-email \
  --preferred-profile shortlived --webroot --webroot-path /var/www/certbot \
  --ip-address "$address" --cert-name dos-ip
openssl x509 -in "$certificate_root/live/dos-ip/fullchain.pem" -noout -checkip "$address"
# Validate the saved renewal configuration against the ACME staging service.
"${certbot[@]}" renew --cert-name dos-ip --dry-run
python3 "$renderer" "$backup/live.conf" "$backup/candidate.template" "$address" "$certificate_root"
cp "$backup/candidate.template" nginx/templates/default.conf.template
if ! "${compose[@]}" exec -T nginx /docker-entrypoint.d/20-envsubst-on-templates.sh || ! "${compose[@]}" exec -T nginx nginx -t; then
  cp "$backup/live.conf" nginx/templates/default.conf.template
  "${compose[@]}" exec -T nginx /docker-entrypoint.d/20-envsubst-on-templates.sh
  "${compose[@]}" exec -T nginx nginx -t
  echo "Restored the previous nginx configuration" >&2
  exit 1
fi
"${compose[@]}" exec -T nginx nginx -s reload

renewal_dir="$runtime_dir/nginx/certbot/ip-https"
mkdir -p "$renewal_dir"
cp "$0" "$renewal_dir/https-ip.sh"
cp "$renderer" "$renewal_dir/render-ip-https.py"
touch "$renewal_dir/enabled"
cat > /etc/systemd/system/dos-ip-https-renew.service <<EOF
[Unit]
Description=Renew DOS IP HTTPS certificate and reload nginx
After=docker.service network-online.target
Requires=docker.service
[Service]
Type=oneshot
ExecStart=/bin/bash $renewal_dir/https-ip.sh renew $runtime_dir $address
EOF
cat > /etc/systemd/system/dos-ip-https-renew.timer <<'EOF'
[Unit]
Description=Check the six-day DOS IP certificate twice daily
[Timer]
OnBootSec=10min
OnUnitActiveSec=12h
RandomizedDelaySec=15min
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now dos-ip-https-renew.timer
systemctl is-active dos-ip-https-renew.timer
openssl x509 -in "$certificate_root/live/dos-ip/fullchain.pem" -noout -issuer -dates -ext subjectAltName
echo "IP HTTPS configured. Backup: $backup"

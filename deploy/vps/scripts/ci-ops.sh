#!/usr/bin/env bash
set -euo pipefail

operation="${1:?Usage: ci-ops.sh health|logs|restart|rollback [backup-dir]}"
argument="${2:-}"

cd "$(dirname "$0")/.."

redact() {
  sed -E \
    -e 's/([Pp]assword|PASSWORD|[Ss]ecret|SECRET|[Tt]oken|TOKEN|PRIVATE_KEY|API_KEY)=([^[:space:]]+)/\\1=[REDACTED]/g' \
    -e 's/(Bearer )[A-Za-z0-9._~+\\/-]+/\\1[REDACTED]/g'
}

case "$operation" in
  health)
    docker compose --env-file .env -f docker-compose.yml ps
    docker compose --env-file .env -f docker-compose.yml exec -T api node -e "
fetch('http://127.0.0.1:3000/api/v1/health')
  .then(async (r) => {
    console.log(r.status, await r.text());
    process.exit(r.ok ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
"
    [[ -f DEPLOYED_VERSION ]] && cat DEPLOYED_VERSION
    docker compose --env-file .env -f docker-compose.yml exec -T api node -e '
console.log(JSON.stringify({smsProvider:process.env.NOTIFICATIONS_SMS_PROVIDER,smscLoginConfigured:Boolean(process.env.SMSC_LOGIN),smscPasswordConfigured:Boolean(process.env.SMSC_PASSWORD),otpBypass:process.env.OTP_DEV_BYPASS,otpDebug:process.env.OTP_DEBUG_RESPONSE_ENABLED,apiDomain:process.env.API_DOMAIN,adminDomain:process.env.ADMIN_DOMAIN}));
fetch("http://127.0.0.1:3000/api/v1/health/ready").then(async r=>console.log("API readiness",r.status,await r.text())).catch(()=>console.log("API readiness unavailable"));
'
    docker compose --env-file .env -f docker-compose.yml exec -T admin node -e '
fetch("http://127.0.0.1:3001/api/health").then(async r=>{console.log("Admin health",r.status,await r.text());process.exit(r.ok?0:1)}).catch(()=>process.exit(1));
'
    ;;
  logs)
    docker compose --env-file .env -f docker-compose.yml logs --tail=250 api admin nginx | redact
    ;;
  restart)
    docker compose --env-file .env -f docker-compose.yml restart api admin nginx
    docker compose --env-file .env -f docker-compose.yml ps
    ;;
  rollback)
    if [[ -z "$argument" ]]; then
      echo "Pass backup directory, for example: backups/predeploy-YYYYMMDD-HHMMSS-abcdef123456"
      find backups -maxdepth 1 -type d -name 'predeploy-*' | sort | tail -n 10
      exit 1
    fi
    if [[ ! -f "$argument/source.tar.gz" ]]; then
      echo "Missing $argument/source.tar.gz"
      exit 1
    fi
    tar \
      --exclude='./deploy/vps/.env' \
      --exclude='./deploy/vps/backups' \
      -xzf "$argument/source.tar.gz" \
      -C ../..
    if [[ -f "$argument/passenger-web.tar.gz" ]]; then
      tar -xzf "$argument/passenger-web.tar.gz" -C ../hosting-public
    fi
    docker compose --env-file .env -f docker-compose.yml build api admin
    docker compose --env-file .env -f docker-compose.yml up -d api admin nginx
    ;;
  *)
    echo "Unknown operation: $operation"
    exit 1
    ;;
esac

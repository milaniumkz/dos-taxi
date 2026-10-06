# DOS VPS deployment

This deployment runs API, admin, PostgreSQL, Redis and Nginx on one VPS.

## Server requirements

- Ubuntu 22.04/24.04
- 4 GB RAM minimum, 2 vCPU recommended
- Docker Engine + Docker Compose plugin
- DNS A records:
  - `api.your-domain.com` -> VPS IP
  - `admin.your-domain.com` -> VPS IP

Install base packages on a clean Ubuntu VPS:

```bash
sudo ./deploy/vps/scripts/setup-ubuntu.sh
```

## First deploy

```bash
cd /opt
git clone <repo-url> dos
cd dos/deploy/vps
cp .env.example .env
```

Edit `.env`:

- Set `API_DOMAIN` and `ADMIN_DOMAIN`.
- Replace every `CHANGE_ME...` value.
- Set `CORS_ORIGINS` to the final web/mobile origins.
- Set Wappi/Yandex/Firebase values if they are enabled.
- Set S3-compatible storage credentials for executor document uploads.

Generate admin API token after `JWT_SECRET` is set:

```bash
scripts/generate-admin-token.sh
```

Put the printed token into `ADMIN_API_TOKEN` in `.env`.

Start:

```bash
scripts/bootstrap.sh
```

If you do not have domains yet and need a temporary IP-only stand:

```bash
cp nginx/templates/single-host.conf.example nginx/templates/default.conf.template
docker compose --env-file .env -f docker-compose.yml up -d nginx
```

Then API is `http://VPS_IP/api/v1`, admin is `http://VPS_IP/`.

Check:

```bash
curl http://api.your-domain.com/api/v1/health
curl http://api.your-domain.com/api/v1/health/ready
```

## HTTPS

After DNS points to VPS:

```bash
scripts/certbot.sh owner@example.com
cp nginx/templates/default.ssl.conf.example nginx/templates/default.conf.template
docker compose --env-file .env -f docker-compose.yml up -d nginx
```

Then check:

```bash
curl https://api.your-domain.com/api/v1/health
```

## Migrations after updates

```bash
git pull
docker compose --env-file .env -f docker-compose.yml build api admin
scripts/migrate.sh
docker compose --env-file .env -f docker-compose.yml up -d
```

## Backups

```bash
scripts/backup.sh
```

Restore database:

```bash
scripts/restore-db.sh backups/YYYYMMDD-HHMMSS/platform_db.dump
```

## Mobile/web switch

After VPS is live, rebuild mobile with:

```bash
flutter build appbundle --flavor passenger -t lib/main_passenger_prod.dart \
  --dart-define=DOS_API_BASE_URL=https://api.your-domain.com/api/v1 \
  --dart-define=DOS_WS_BASE_URL=https://api.your-domain.com

flutter build appbundle --flavor driver -t lib/main_driver_prod.dart \
  --dart-define=DOS_API_BASE_URL=https://api.your-domain.com/api/v1 \
  --dart-define=DOS_WS_BASE_URL=https://api.your-domain.com
```

For iOS use the same `--dart-define` values with `flutter build ipa`.

## App Store review accounts

Configured by default:

- Passenger: `+77000000001`
- Driver: `+77000000002`
- OTP: `2468`

Keep these values in `.env` until App Store review is completed.

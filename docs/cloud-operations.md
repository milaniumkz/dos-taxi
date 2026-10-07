# DOS Cloud Development And Deployment

## Repository Workflow

- Main branch: `main`.
- Work in feature branches and open pull requests.
- Pull requests run GitHub Actions checks for API, admin and Flutter.
- Pushes to `main` run the same checks and then deploy the checked commit to the VPS.
- Manual production deployment is available from GitHub Actions: `DOS CI/CD` -> `Run workflow`.

## Codex Cloud

Open the GitHub repository in Codex Cloud and use the repo root as the workspace.

Required setup commands for a clean clone:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @dos/shared-types build
corepack pnpm --filter @dos/api typecheck
corepack pnpm --filter @dos/admin typecheck
```

Flutter checks:

```bash
cd apps/mobile
flutter pub get
flutter gen-l10n
flutter analyze
flutter test
```

Use separate test databases for development. Do not point Codex Cloud tasks at the production database.

## GitHub Secrets

Production deploy needs these repository or environment secrets:

- `VPS_HOST`: VPS host/IP.
- `VPS_PORT`: SSH port, usually `22`.
- `VPS_USER`: SSH user used by deployment.
- `VPS_PATH`: project path on server, currently `/opt/dos`.
- `VPS_KNOWN_HOSTS`: output of `ssh-keyscan -H <host>`.
- `VPS_SSH_PRIVATE_KEY`: private deploy key with access only to this VPS.
- `SMSC_LOGIN` and `SMSC_PASSWORD`: optional SMSC credentials used to switch the
  production OTP provider during deployment. Configure both together.

Runtime application secrets stay only on the VPS in `deploy/vps/.env`.
The two SMSC deployment secrets are transmitted over SSH stdin, never as command
arguments or release files. The promotion script backs up the existing runtime
configuration before applying them, preserves other variables and writes the
updated `.env` with mode `600`. Existing SMSC credentials on the VPS may also be
used. When neither source has credentials, deployment preserves the current SMS
configuration and reports that SMSC is not configured.

## VPS Deployment

Deployment keeps the current Docker Compose stack:

- API: NestJS container.
- Admin: Next.js container.
- PostgreSQL: Docker volume `dos_postgres_data`.
- Redis: Docker volume `dos_redis_data`.
- Nginx: public entrypoint.

The GitHub workflow uploads a clean checkout to `/opt/dos/_incoming/<commit>`.
Then `deploy/vps/scripts/ci-promote-release.sh`:

1. Acquires `/tmp/dos-production-deploy.lock`.
2. Creates a pre-deploy backup under `deploy/vps/backups/predeploy-*`.
3. Copies the checked commit into `/opt/dos` without overwriting `.env`, backups or certificates.
4. Builds API/admin Docker images.
5. Runs TypeORM migrations.
6. Restarts API/admin/nginx.
7. Verifies API health.
8. Writes `deploy/vps/DEPLOYED_VERSION`.

Manual deployments record the actual checked-out release commit, including when
`deploy_ref` differs from the workflow's own commit. The `health` operation also
checks admin connectivity, API readiness and SMS provider configuration without
printing credentials.

## Manual Production Operations

Use GitHub Actions workflow `DOS Production Ops`.

Allowed operations:

- `health`: show container status, API health and deployed version.
- `logs`: show redacted recent logs for API/admin/nginx.
- `restart`: restart API/admin/nginx.
- `rollback`: restore source from a pre-deploy backup and rebuild containers.

Rollback input example:

```text
backups/predeploy-20261006-120000-abcdef123456
```

Rollback restores source only. It does not overwrite the current database with an old dump.

## Backups

Manual backup on server:

```bash
cd /opt/dos/deploy/vps
scripts/backup.sh
```

Backups contain:

- `platform_db.dump`: PostgreSQL dump.
- `redis_data.tar.gz`: Redis volume archive when the volume exists.
- `env.backup`: copy of VPS runtime config.

Restore database manually only when explicitly needed:

```bash
cd /opt/dos/deploy/vps
scripts/restore-db.sh backups/YYYYMMDD-HHMMSS/platform_db.dump
```

Do not automatically restore an old database over new production data after a failed deploy.

The checked passenger and driver web builds are uploaded as the `passenger-web` and `driver-web` Actions artifacts and promoted to `/passenger/` and `/driver/` with the API/admin release. Their previous files are backed up as `passenger-web.tar.gz` and `driver-web.tar.gz` and restored by the production rollback operation. Each role’s `release.txt` identifies the deployed commit. Installed Android/iOS apps require a new signed mobile release for UI changes.

## HTTPS for the server IP

Use `DOS Production Ops` with `https-status` to inspect nginx listeners and public certificate metadata, or `https-ip` to configure `89.126.200.51`. The operation uses Certbot 5.8.0 and Let's Encrypt's shortlived IP certificate profile. It retains existing domain certificates/routes, saves the previous live nginx configuration, validates the new configuration before reload and restores the previous configuration if validation fails. The hosted runner verifies both the IP HTTPS readiness endpoint and the existing app hostname with TLS verification enabled.

The `dos-ip-https-renew.timer` systemd unit runs every 12 hours. Renewal uses a pinned Certbot image, then checks and reloads nginx. The initial setup verifies renewal using ACME staging. Inspect it on the VPS with `systemctl status dos-ip-https-renew.timer` and `journalctl -u dos-ip-https-renew.service`. The setup and renewals share the production deployment lock.

After IP HTTPS is enabled, the promotion script preserves the runtime `nginx/templates/default.conf.template`. Certificates, renewal scripts and the activation marker remain under `nginx/certbot`, which deployments already preserve. Change this runtime TLS configuration through a checked production operation, and keep certificate/key files out of Git.

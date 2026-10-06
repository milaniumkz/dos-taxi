# DOS Google Cloud / Firebase Deploy

Target project: `dos-taxi`.

## Current blocker

Cloud deploy requires billing. Check:

```bash
gcloud beta billing projects describe dos-taxi
```

If `billingEnabled` is `false`, enable billing in Google Cloud Console first.

## 1. Create billable cloud infrastructure

This creates Cloud SQL PostgreSQL, Memorystore Redis, Artifact Registry, a VPC connector, a Cloud Storage bucket and a Storage HMAC key.

```bash
CONFIRM_BILLABLE_INFRA=yes bash deploy/create_cloud_infra.sh
```

The script writes `deploy/.env.api.yaml` with generated secrets. This file is ignored by git.

## 2. Prepare admin token

Generate an admin JWT signed with the same `JWT_SECRET` used in `deploy/.env.api.yaml`, then export it:

```bash
export ADMIN_API_TOKEN='...'
```

## 3. Deploy API, run migrations, deploy Admin and Firebase Hosting

```bash
export CLOUD_SQL_INSTANCE=dos-taxi:asia-south1:dos-postgres
export CLOUD_RUN_NETWORK=default
export CLOUD_RUN_SUBNET=default
export API_ENV_FILE=deploy/.env.api.yaml
ADMIN_API_TOKEN="$ADMIN_API_TOKEN" bash deploy/deploy_cloud_run.sh
```

Outputs:

- API: `https://dos-api-...a.run.app/api/v1/health`
- Admin Cloud Run: `https://dos-admin-...a.run.app`
- Firebase Hosting: `https://dos-taxi.web.app`

## Notes

- Firebase Android apps are already created for `com.dos.passenger` and `com.dos.driver`.
- Real FCM backend sending still requires non-empty `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `deploy/.env.api.yaml`.
- SMS is stubbed by default with `NOTIFICATIONS_SMS_STUB: "true"`.

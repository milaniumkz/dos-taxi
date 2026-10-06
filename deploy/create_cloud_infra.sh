#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-dos-taxi}"
REGION="${REGION:-asia-south1}"
SQL_INSTANCE="${SQL_INSTANCE:-dos-postgres}"
SQL_DATABASE="${SQL_DATABASE:-platform_db}"
SQL_USER="${SQL_USER:-platform}"
REDIS_INSTANCE="${REDIS_INSTANCE:-dos-redis}"
VPC_CONNECTOR="${VPC_CONNECTOR:-dos-vpc}"
CLOUD_RUN_NETWORK="${CLOUD_RUN_NETWORK:-default}"
CLOUD_RUN_SUBNET="${CLOUD_RUN_SUBNET:-default}"
USE_VPC_CONNECTOR="${USE_VPC_CONNECTOR:-false}"
BUCKET="${BUCKET:-dos-taxi-files}"
AR_REPOSITORY="${AR_REPOSITORY:-dos}"
STORAGE_SERVICE_ACCOUNT="${STORAGE_SERVICE_ACCOUNT:-dos-storage}"
OUTPUT_FILE="${OUTPUT_FILE:-deploy/.env.api.yaml}"

info() {
  echo "[info] $*"
}

fail() {
  echo "[fail] $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

yaml_quote() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1] ?? ""))' "$1"
}

require_command gcloud
require_command node
require_command openssl

gcloud config set project "$PROJECT_ID" >/dev/null

billing_enabled="$(gcloud beta billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || true)"
[[ "$billing_enabled" == "True" || "$billing_enabled" == "true" ]] || fail "Billing is disabled for ${PROJECT_ID}. Enable billing before creating Cloud Run/SQL/Redis resources."

if [[ "${CONFIRM_BILLABLE_INFRA:-}" != "yes" ]]; then
  fail "This creates billable Cloud SQL, Memorystore Redis, Storage, VPC connector and Artifact Registry resources. Re-run with CONFIRM_BILLABLE_INFRA=yes."
fi

info "Enabling required Google Cloud APIs"
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  vpcaccess.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  --project "$PROJECT_ID"

if ! gcloud artifacts repositories describe "$AR_REPOSITORY" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Creating Artifact Registry repository: ${AR_REPOSITORY}"
  gcloud artifacts repositories create "$AR_REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="DOS Docker images" \
    --project "$PROJECT_ID"
fi

if ! gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Creating Cloud SQL PostgreSQL instance: ${SQL_INSTANCE}"
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="$REGION" \
    --storage-size=10GB \
    --availability-type=zonal \
    --project "$PROJECT_ID"
fi

if ! gcloud sql databases describe "$SQL_DATABASE" --instance "$SQL_INSTANCE" --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Creating Cloud SQL database: ${SQL_DATABASE}"
  gcloud sql databases create "$SQL_DATABASE" \
    --instance="$SQL_INSTANCE" \
    --project "$PROJECT_ID"
fi

SQL_PASSWORD="$(openssl rand -base64 30 | tr -d '\n')"
if ! gcloud sql users list --instance "$SQL_INSTANCE" --project "$PROJECT_ID" --format='value(name)' | grep -Fx "$SQL_USER" >/dev/null 2>&1; then
  info "Creating Cloud SQL user: ${SQL_USER}"
  gcloud sql users create "$SQL_USER" \
    --instance="$SQL_INSTANCE" \
    --password="$SQL_PASSWORD" \
    --project "$PROJECT_ID"
else
  info "Resetting Cloud SQL user password: ${SQL_USER}"
  gcloud sql users set-password "$SQL_USER" \
    --instance="$SQL_INSTANCE" \
    --password="$SQL_PASSWORD" \
    --project "$PROJECT_ID"
fi

if ! gcloud redis instances describe "$REDIS_INSTANCE" --region "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Creating Memorystore Redis instance: ${REDIS_INSTANCE}"
  gcloud redis instances create "$REDIS_INSTANCE" \
    --region="$REGION" \
    --size=1 \
    --tier=basic \
    --redis-version=redis_7_0 \
    --network=default \
    --project "$PROJECT_ID"
fi

if [[ "$USE_VPC_CONNECTOR" == "true" ]] && ! gcloud compute networks vpc-access connectors describe "$VPC_CONNECTOR" --region "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Creating Serverless VPC connector: ${VPC_CONNECTOR}"
  gcloud compute networks vpc-access connectors create "$VPC_CONNECTOR" \
    --region="$REGION" \
    --network=default \
    --range=10.8.0.0/28 \
    --project "$PROJECT_ID"
fi

if ! gcloud storage buckets describe "gs://${BUCKET}" --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Creating Cloud Storage bucket: gs://${BUCKET}"
  gcloud storage buckets create "gs://${BUCKET}" \
    --location="$REGION" \
    --uniform-bucket-level-access \
    --project "$PROJECT_ID"
fi

STORAGE_SA_EMAIL="${STORAGE_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$STORAGE_SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Creating storage service account: ${STORAGE_SA_EMAIL}"
  gcloud iam service-accounts create "$STORAGE_SERVICE_ACCOUNT" \
    --display-name="DOS Storage HMAC" \
    --project "$PROJECT_ID"
fi

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${STORAGE_SA_EMAIL}" \
  --role="roles/storage.objectAdmin" \
  --project "$PROJECT_ID" >/dev/null

info "Creating HMAC key for Cloud Storage XML/S3-compatible API"
HMAC_JSON="$(gcloud storage hmac create "$STORAGE_SA_EMAIL" --project "$PROJECT_ID" --format=json)"
S3_ACCESS_KEY_ID="$(node -e 'const payload = JSON.parse(process.argv[1]); process.stdout.write(payload.metadata?.accessId ?? payload.accessId ?? "");' "$HMAC_JSON")"
S3_SECRET_ACCESS_KEY="$(node -e 'const payload = JSON.parse(process.argv[1]); process.stdout.write(payload.secret ?? payload.secretKey ?? "");' "$HMAC_JSON")"
[[ -n "$S3_ACCESS_KEY_ID" && -n "$S3_SECRET_ACCESS_KEY" ]] || fail "Unable to parse HMAC key output."

REDIS_HOST="$(gcloud redis instances describe "$REDIS_INSTANCE" --region "$REGION" --project "$PROJECT_ID" --format='value(host)')"
REDIS_PORT="$(gcloud redis instances describe "$REDIS_INSTANCE" --region "$REGION" --project "$PROJECT_ID" --format='value(port)')"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
ENCODED_SQL_PASSWORD="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1] ?? ""))' "$SQL_PASSWORD")"
DATABASE_URL="postgresql://${SQL_USER}:${ENCODED_SQL_PASSWORD}@localhost/${SQL_DATABASE}?host=/cloudsql/${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

mkdir -p "$(dirname "$OUTPUT_FILE")"
cat >"$OUTPUT_FILE" <<YAML
NODE_ENV: production
API_PREFIX: api/v1
DATABASE_URL: $(yaml_quote "$DATABASE_URL")
REDIS_URL: $(yaml_quote "redis://${REDIS_HOST}:${REDIS_PORT}")
JWT_SECRET: $(yaml_quote "$JWT_SECRET")
JWT_ACCESS_EXPIRES_IN: 15m
JWT_REFRESH_EXPIRES_IN: 30d
OTP_LENGTH: "4"
OTP_TTL_SECONDS: "300"
OTP_MAX_ATTEMPTS: "3"
OTP_DEV_BYPASS: "false"
APP_REVIEW_OTP_CODE: "2468"
APP_REVIEW_PHONE_NUMBERS: "+77000000001,+77000000002"
S3_ENDPOINT: https://storage.googleapis.com
S3_REGION: auto
S3_ACCESS_KEY_ID: $(yaml_quote "$S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY: $(yaml_quote "$S3_SECRET_ACCESS_KEY")
S3_BUCKET: $(yaml_quote "$BUCKET")
S3_FORCE_PATH_STYLE: "false"
NOTIFICATIONS_SMS_STUB: "true"
NOTIFICATIONS_PUSH_STUB: "true"
FIREBASE_PROJECT_ID: $(yaml_quote "$PROJECT_ID")
FIREBASE_CLIENT_EMAIL: ""
FIREBASE_PRIVATE_KEY: ""
NOMINATIM_BASE_URL: https://nominatim.openstreetmap.org
OSRM_BASE_URL: https://router.project-osrm.org
CURRENCY_RUB_KZT_FALLBACK_RATE: "6.20"
YAML

chmod 600 "$OUTPUT_FILE"

cat <<EOF

Cloud infrastructure is ready.

Generated API env file:
  ${OUTPUT_FILE}

Use these deploy variables:
  export PROJECT_ID=${PROJECT_ID}
  export REGION=${REGION}
  export CLOUD_SQL_INSTANCE=${PROJECT_ID}:${REGION}:${SQL_INSTANCE}
  export CLOUD_RUN_NETWORK=${CLOUD_RUN_NETWORK}
  export CLOUD_RUN_SUBNET=${CLOUD_RUN_SUBNET}
  export API_ENV_FILE=${OUTPUT_FILE}

Next:
  ADMIN_API_TOKEN=<admin-jwt> bash deploy/deploy_cloud_run.sh
EOF

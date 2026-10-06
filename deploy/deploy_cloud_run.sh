#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-dos-taxi}"
REGION="${REGION:-asia-south1}"
AR_REPOSITORY="${AR_REPOSITORY:-dos}"
API_SERVICE="${API_SERVICE:-dos-api}"
ADMIN_SERVICE="${ADMIN_SERVICE:-dos-admin}"
API_ENV_FILE="${API_ENV_FILE:-deploy/.env.api.yaml}"
ADMIN_ENV_FILE="${ADMIN_ENV_FILE:-}"
TAG="${TAG:-$(date +%Y%m%d%H%M%S)}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
DEPLOY_FIREBASE_HOSTING="${DEPLOY_FIREBASE_HOSTING:-true}"

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
require_command firebase
require_command node

[[ -f "$API_ENV_FILE" ]] || fail "Missing API env file: ${API_ENV_FILE}. Copy deploy/env.api.yaml.example or run deploy/create_cloud_infra.sh."
[[ -n "${ADMIN_API_TOKEN:-}" || -n "$ADMIN_ENV_FILE" ]] || fail "Set ADMIN_API_TOKEN or ADMIN_ENV_FILE before deploying admin."

gcloud config set project "$PROJECT_ID" >/dev/null

billing_enabled="$(gcloud beta billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || true)"
[[ "$billing_enabled" == "True" || "$billing_enabled" == "true" ]] || fail "Billing is disabled for ${PROJECT_ID}. Enable billing before Cloud Run deploy."

info "Enabling required Google Cloud APIs"
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  vpcaccess.googleapis.com \
  storage.googleapis.com \
  --project "$PROJECT_ID"

if ! gcloud artifacts repositories describe "$AR_REPOSITORY" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  info "Creating Artifact Registry repository: ${AR_REPOSITORY}"
  gcloud artifacts repositories create "$AR_REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="DOS Docker images" \
    --project "$PROJECT_ID"
fi

API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPOSITORY}/${API_SERVICE}:${TAG}"
ADMIN_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPOSITORY}/${ADMIN_SERVICE}:${TAG}"

info "Building API image: ${API_IMAGE}"
gcloud builds submit \
  --project "$PROJECT_ID" \
  --config deploy/cloudbuild.api.yaml \
  --substitutions "_IMAGE=${API_IMAGE}" \
  .

info "Building Admin image: ${ADMIN_IMAGE}"
gcloud builds submit \
  --project "$PROJECT_ID" \
  --config deploy/cloudbuild.admin.yaml \
  --substitutions "_IMAGE=${ADMIN_IMAGE}" \
  .

NETWORK_FLAGS=()
if [[ -n "${CLOUD_SQL_INSTANCE:-}" ]]; then
  NETWORK_FLAGS+=(--set-cloudsql-instances "$CLOUD_SQL_INSTANCE")
fi
if [[ -n "${VPC_CONNECTOR:-}" ]]; then
  NETWORK_FLAGS+=(--vpc-connector "$VPC_CONNECTOR" --vpc-egress private-ranges-only)
elif [[ -n "${CLOUD_RUN_NETWORK:-}" || -n "${CLOUD_RUN_SUBNET:-}" ]]; then
  NETWORK_FLAGS+=(--network "${CLOUD_RUN_NETWORK:-default}" --subnet "${CLOUD_RUN_SUBNET:-default}" --vpc-egress private-ranges-only)
fi

info "Deploying API Cloud Run service: ${API_SERVICE}"
gcloud run deploy "$API_SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$API_IMAGE" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --no-cpu-throttling \
  --env-vars-file "$API_ENV_FILE" \
  "${NETWORK_FLAGS[@]}"

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  info "Deploying and executing migration job"
  gcloud run jobs deploy "${API_SERVICE}-migrate" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --image "$API_IMAGE" \
    --memory 1Gi \
    --cpu 1 \
    --task-timeout 10m \
    --max-retries 0 \
    --env-vars-file "$API_ENV_FILE" \
    --command node \
    --args="-r,ts-node/register,./node_modules/typeorm/cli.js,-d,src/database/data-source.ts,migration:run" \
    "${NETWORK_FLAGS[@]}"

  gcloud run jobs execute "${API_SERVICE}-migrate" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --wait
fi

API_URL="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
[[ -n "$API_URL" ]] || fail "Unable to resolve API Cloud Run URL."

ADMIN_RUNTIME_ENV="$(mktemp "${TMPDIR:-/tmp}/dos-admin-env.XXXXXX")"
if [[ -n "$ADMIN_ENV_FILE" ]]; then
  cp "$ADMIN_ENV_FILE" "$ADMIN_RUNTIME_ENV"
else
  cat >"$ADMIN_RUNTIME_ENV" <<YAML
ADMIN_API_URL: $(yaml_quote "${API_URL}/api/v1")
ADMIN_API_TOKEN: $(yaml_quote "$ADMIN_API_TOKEN")
YAML
  if [[ -n "${ADMIN_BASIC_AUTH_USERNAME:-}" && -n "${ADMIN_BASIC_AUTH_PASSWORD:-}" ]]; then
    {
      echo "ADMIN_BASIC_AUTH_USERNAME: $(yaml_quote "$ADMIN_BASIC_AUTH_USERNAME")"
      echo "ADMIN_BASIC_AUTH_PASSWORD: $(yaml_quote "$ADMIN_BASIC_AUTH_PASSWORD")"
    } >>"$ADMIN_RUNTIME_ENV"
  fi
fi

info "Deploying Admin Cloud Run service: ${ADMIN_SERVICE}"
gcloud run deploy "$ADMIN_SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$ADMIN_IMAGE" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --env-vars-file "$ADMIN_RUNTIME_ENV"

ADMIN_URL="$(gcloud run services describe "$ADMIN_SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
[[ -n "$ADMIN_URL" ]] || fail "Unable to resolve Admin Cloud Run URL."

if [[ "$DEPLOY_FIREBASE_HOSTING" == "true" ]]; then
  info "Deploying Firebase Hosting rewrite to ${ADMIN_SERVICE}"
  firebase deploy --only hosting --project "$PROJECT_ID" --non-interactive
fi

cat <<EOF

Deploy complete.

API:
  ${API_URL}/api/v1/health

Admin Cloud Run:
  ${ADMIN_URL}

Firebase Hosting:
  https://${PROJECT_ID}.web.app
EOF

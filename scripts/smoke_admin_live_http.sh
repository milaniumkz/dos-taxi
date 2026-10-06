#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ADMIN_PORT="${ADMIN_LIVE_SMOKE_PORT:-3201}"
ADMIN_BASE_URL="http://127.0.0.1:${ADMIN_PORT}"
API_ENV_FILE="$ROOT_DIR/apps/api/.env.local"
LOG_FILE="${TMPDIR:-/tmp}/dos-admin-live-smoke.log"
PID_FILE="${TMPDIR:-/tmp}/dos-admin-live-smoke.pid"
HTTP_TIMEOUT_SECONDS="${ADMIN_LIVE_SMOKE_HTTP_TIMEOUT_SECONDS:-15}"

info() {
  echo "[info] $*"
}

fail() {
  echo "[fail] $*" >&2
  exit 1
}

cleanup() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$PID_FILE"
  fi
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-20}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    if curl -I -s --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      return 1
    fi

    sleep 1
  done
}

assert_http_ok() {
  local url="$1"
  local label="$2"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HTTP_TIMEOUT_SECONDS" "$url")"
  if [[ "$status" != "200" ]]; then
    fail "${label} is not reachable: ${url} (status=${status})"
  fi
}

assert_page_contains() {
  local url="$1"
  local label="$2"
  shift 2

  local payload
  payload="$(curl -s --max-time "$HTTP_TIMEOUT_SECONDS" "$url")"

  for expected in "$@"; do
    if [[ "$payload" != *"$expected"* ]]; then
      fail "${label} did not include expected fragment '${expected}': ${url}"
    fi
  done
}

assert_page_not_contains() {
  local url="$1"
  local label="$2"
  shift 2

  local payload
  payload="$(curl -s --max-time "$HTTP_TIMEOUT_SECONDS" "$url")"

  for unexpected in "$@"; do
    if [[ "$payload" == *"$unexpected"* ]]; then
      fail "${label} unexpectedly included fragment '${unexpected}': ${url}"
    fi
  done
}

extract_url_host() {
  local raw_url="$1"
  node -e '
    try {
      const url = new URL(process.argv[1]);
      process.stdout.write(url.hostname);
    } catch {
      process.exit(1);
    }
  ' "$raw_url"
}

is_local_host() {
  local host="$1"
  [[ "$host" == "localhost" || "$host" == "127.0.0.1" || "$host" == "::1" ]]
}

url_encode() {
  local raw_value="$1"
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1] ?? ""))' "$raw_value"
}

admin_api_get() {
  local path="$1"
  local status
  local body

  body="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-body.XXXXXX")"
  status="$(curl -s --max-time "$HTTP_TIMEOUT_SECONDS" \
    -H "Authorization: Bearer ${ADMIN_API_TOKEN_RESOLVED}" \
    -o "$body" \
    -w "%{http_code}" \
    "${ADMIN_API_URL%/}${path}")"

  if [[ "$status" != "200" ]]; then
    local payload
    payload="$(cat "$body" 2>/dev/null || true)"
    rm -f "$body"
    fail "Admin API request failed for ${path} (status=${status}): ${payload}"
  fi

  cat "$body"
  rm -f "$body"
}

admin_api_json_request() {
  local method="$1"
  local path="$2"
  local token="$3"
  local expected_status="$4"
  local payload="$5"
  local status
  local body

  body="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-body.XXXXXX")"
  status="$(curl -s --max-time "$HTTP_TIMEOUT_SECONDS" \
    -X "$method" \
    -H "Authorization: Bearer ${token}" \
    -H 'content-type: application/json' \
    -o "$body" \
    -w "%{http_code}" \
    -d "$payload" \
    "${ADMIN_API_URL%/}${path}")"

  if [[ "$status" != "$expected_status" ]]; then
    local response_payload
    response_payload="$(cat "$body" 2>/dev/null || true)"
    rm -f "$body"
    fail "Admin API request failed for ${method} ${path} (status=${status}): ${response_payload}"
  fi

  cat "$body"
  rm -f "$body"
}

extract_json_field() {
  local payload="$1"
  local field="$2"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const field = process.argv[2];
    const value = field.split(".").reduce((current, key) => current?.[key], payload);
    if (value === undefined) {
      process.exit(1);
    }
    process.stdout.write(String(value));
  ' "$payload" "$field" || fail "Unable to extract ${field} from payload: ${payload}"
}

resolve_city_id() {
  local payload
  payload="$(admin_api_get "/admin/cities")"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    if (!Array.isArray(payload) || payload.length === 0) {
      process.exit(1);
    }
    const city = payload.find((entry) => entry?.nameRu === "Алматы") ?? payload[0];
    if (!city?.id) {
      process.exit(1);
    }
    process.stdout.write(city.id);
  ' "$payload" || fail "Unable to resolve city fixture from admin API payload: ${payload}"
}

resolve_taxi_tariff_id() {
  local city_id="$1"
  local payload
  payload="$(admin_api_get "/admin/tariffs?serviceType=taxi&cityId=${city_id}")"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    if (!Array.isArray(payload) || payload.length === 0) {
      process.exit(1);
    }
    const tariff =
      payload.find((entry) => entry?.vehicleClass === "economy") ?? payload[0];
    if (!tariff?.id) {
      process.exit(1);
    }
    process.stdout.write(tariff.id);
  ' "$payload" || fail "Unable to resolve taxi tariff fixture from admin API payload: ${payload}"
}

resolve_promo_code_id() {
  local payload
  payload="$(admin_api_get "/admin/promo-codes")"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    if (!Array.isArray(payload) || payload.length === 0) {
      process.exit(1);
    }
    const promo = payload.find((entry) => entry?.code === "DEVPROMO") ?? payload[0];
    if (!promo?.id) {
      process.exit(1);
    }
    process.stdout.write(promo.id);
  ' "$payload" || fail "Unable to resolve promo code fixture from admin API payload: ${payload}"
}

assert_health_mode() {
  local url="$1"
  local payload
  payload="$(curl -s --max-time "$HTTP_TIMEOUT_SECONDS" "$url")"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    if (payload.status !== "ok") {
      throw new Error(`unexpected status: ${payload.status}`);
    }
    if (payload.mode === "demo") {
      throw new Error("live admin fell back to demo mode");
    }
    if (Array.isArray(payload.warnings)) {
      const envWarnings = payload.warnings.filter((warning) =>
        warning === "ADMIN_API_TOKEN_MISSING" || warning === "ADMIN_API_URL_INVALID",
      );
      if (envWarnings.length > 0) {
        throw new Error(`unexpected env warnings: ${envWarnings.join(",")}`);
      }
    }
  ' "$payload"
}

generate_operator_token() {
  (
    cd "$ROOT_DIR/apps/api"
    ADMIN_TOKEN_ROLE=operator ./node_modules/.bin/ts-node --project tsconfig.json scripts/generate-dev-admin-token.ts
  )
}

trap cleanup EXIT

bash "$ROOT_DIR/scripts/preflight_admin_runtime.sh" >/dev/null

if ! ADMIN_API_TOKEN_RESOLVED="$(bash "$ROOT_DIR/scripts/resolve_admin_runtime_token.sh")"; then
  fail "Unable to resolve ADMIN_API_TOKEN for admin live smoke"
fi

[[ -f "$ROOT_DIR/apps/admin/.next/BUILD_ID" ]] || fail "Admin build artifact is missing. Run 'corepack pnpm --filter @dos/admin build' first."

info "Starting admin on port ${ADMIN_PORT} in live mode"
(
  cd "$ROOT_DIR/apps/admin"
  PORT="$ADMIN_PORT" HOSTNAME="127.0.0.1" ADMIN_API_TOKEN="$ADMIN_API_TOKEN_RESOLVED" corepack pnpm start >"$LOG_FILE" 2>&1
) &
echo "$!" >"$PID_FILE"

if ! wait_for_url "$ADMIN_BASE_URL/" 20; then
  echo
  echo "--- ADMIN LOG ---"
  cat "$LOG_FILE" || true
  fail "Admin did not become ready at $ADMIN_BASE_URL"
fi

assert_http_ok "$ADMIN_BASE_URL/" "admin home"
assert_http_ok "$ADMIN_BASE_URL/api/health" "admin health"
assert_http_ok "$ADMIN_BASE_URL/orders" "admin orders"
assert_http_ok "$ADMIN_BASE_URL/notes" "admin notes"
assert_http_ok "$ADMIN_BASE_URL/activity" "admin activity"
assert_http_ok "$ADMIN_BASE_URL/notes?lang=kk" "admin notes kk locale"
assert_health_mode "$ADMIN_BASE_URL/api/health"
assert_page_not_contains \
  "$ADMIN_BASE_URL/" \
  "admin home" \
  "ADMIN_API_TOKEN_MISSING" \
  "ADMIN_API_URL_INVALID"
assert_page_contains \
  "$ADMIN_BASE_URL/notes?lang=kk" \
  "admin notes kk locale" \
  "Операторлық ескертпелер лентасы"
assert_page_not_contains \
  "$ADMIN_BASE_URL/notes?lang=kk" \
  "admin notes kk locale" \
  "ADMIN_API_TOKEN_MISSING" \
  "ADMIN_API_URL_INVALID"

if api_host="$(extract_url_host "${ADMIN_API_URL:-}")" && is_local_host "$api_host"; then
  if [[ -f "$API_ENV_FILE" ]]; then
    set -a
    source "$API_ENV_FILE"
    set +a
  fi

  resolved_city_id="$(resolve_city_id)"
  resolved_taxi_tariff_id="$(resolve_taxi_tariff_id "$resolved_city_id")"
  resolved_promo_code_id="$(resolve_promo_code_id)"
  operator_note_token="$(generate_operator_token)"
  operator_note_marker="smoke-live-note-$(date +%s)"
  operator_note_payload="{\"entityType\":\"order\",\"entityId\":\"${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}\",\"body\":\"${operator_note_marker}\",\"kind\":\"handoff\",\"isPinned\":true,\"assignedToId\":\"${DEV_ADMIN_USER_ID:-00000000-0000-4000-8000-000000000001}\"}"
  operator_note_response="$(admin_api_json_request "POST" "/admin/notes" "$operator_note_token" "201" "$operator_note_payload")"
  operator_note_id="$(extract_json_field "$operator_note_response" "id")"
  operator_note_query="$(url_encode "$operator_note_marker")"
  operator_note_activity_query="$(url_encode "$operator_note_id")"

  order_detail_url="${ADMIN_BASE_URL}/orders/${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
  user_detail_url="${ADMIN_BASE_URL}/users/${DEV_CLIENT_USER_ID:-00000000-0000-4000-8000-000000000002}"
  executor_detail_url="${ADMIN_BASE_URL}/executors/${DEV_EXECUTOR_ID:-00000000-0000-4000-8000-000000000011}"
  city_detail_url="${ADMIN_BASE_URL}/cities/${resolved_city_id}"
  tariff_detail_url="${ADMIN_BASE_URL}/tariffs/${resolved_taxi_tariff_id}"
  promo_detail_url="${ADMIN_BASE_URL}/promo-codes/${resolved_promo_code_id}"
  reports_scoped_url="${ADMIN_BASE_URL}/reports?period=day&cityId=${resolved_city_id}"
  notes_scoped_url="${ADMIN_BASE_URL}/notes?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
  notes_query_url="${ADMIN_BASE_URL}/notes?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}&query=${operator_note_query}"
  activity_scoped_url="${ADMIN_BASE_URL}/activity?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
  activity_note_created_url="${ADMIN_BASE_URL}/activity?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}&action=note.created&query=${operator_note_activity_query}"
  promo_scoped_url="${ADMIN_BASE_URL}/promo-codes/${resolved_promo_code_id}?cityId=${resolved_city_id}&serviceType=taxi&paymentMethod=card&status=completed"
  promo_scoped_kk_url="${ADMIN_BASE_URL}/promo-codes/${resolved_promo_code_id}?lang=kk&cityId=${resolved_city_id}&serviceType=taxi&paymentMethod=card&status=completed"

  assert_http_ok "$order_detail_url" "admin order detail"
  assert_page_contains "$order_detail_url" "admin order detail" "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
  assert_page_not_contains "$order_detail_url" "admin order detail" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$user_detail_url" "admin user detail"
  assert_page_contains "$user_detail_url" "admin user detail" "${DEV_CLIENT_USER_ID:-00000000-0000-4000-8000-000000000002}"
  assert_page_not_contains "$user_detail_url" "admin user detail" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$executor_detail_url" "admin executor detail"
  assert_page_contains "$executor_detail_url" "admin executor detail" "${DEV_EXECUTOR_ID:-00000000-0000-4000-8000-000000000011}"
  assert_page_not_contains "$executor_detail_url" "admin executor detail" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$city_detail_url" "admin city detail"
  assert_page_contains "$city_detail_url" "admin city detail" "$resolved_city_id" "Алматы"
  assert_page_not_contains "$city_detail_url" "admin city detail" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$tariff_detail_url" "admin tariff detail"
  assert_page_contains "$tariff_detail_url" "admin tariff detail" "$resolved_taxi_tariff_id" "economy"
  assert_page_not_contains "$tariff_detail_url" "admin tariff detail" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$promo_detail_url" "admin promo detail"
  assert_page_contains "$promo_detail_url" "admin promo detail" "$resolved_promo_code_id" "DEVPROMO"
  assert_page_not_contains "$promo_detail_url" "admin promo detail" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$reports_scoped_url" "admin reports scoped by city"
  assert_page_contains "$reports_scoped_url" "admin reports scoped by city" "$resolved_city_id"
  assert_page_not_contains "$reports_scoped_url" "admin reports scoped by city" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$notes_scoped_url" "admin notes scoped to order"
  assert_page_contains "$notes_scoped_url" "admin notes scoped to order" "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
  assert_page_not_contains "$notes_scoped_url" "admin notes scoped to order" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$notes_query_url" "admin notes query-filtered live note"
  assert_page_contains \
    "$notes_query_url" \
    "admin notes query-filtered live note" \
    "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}" \
    "$operator_note_id" \
    "$operator_note_marker"
  assert_page_not_contains \
    "$notes_query_url" \
    "admin notes query-filtered live note" \
    "ADMIN_API_TOKEN_MISSING" \
    "ADMIN_API_URL_INVALID"

  assert_http_ok "$activity_scoped_url" "admin activity scoped to order"
  assert_page_contains "$activity_scoped_url" "admin activity scoped to order" "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
  assert_page_not_contains "$activity_scoped_url" "admin activity scoped to order" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$activity_note_created_url" "admin activity query-filtered live note event"
  assert_page_contains \
    "$activity_note_created_url" \
    "admin activity query-filtered live note event" \
    "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}" \
    "$operator_note_id" \
    "Создание внутренней заметки"
  assert_page_not_contains \
    "$activity_note_created_url" \
    "admin activity query-filtered live note event" \
    "ADMIN_API_TOKEN_MISSING" \
    "ADMIN_API_URL_INVALID"

  assert_http_ok "$promo_scoped_url" "admin promo detail scoped analytics"
  assert_page_contains "$promo_scoped_url" "admin promo detail scoped analytics" "DEVPROMO" "$resolved_city_id"
  assert_page_not_contains "$promo_scoped_url" "admin promo detail scoped analytics" "ADMIN_API_TOKEN_MISSING" "ADMIN_API_URL_INVALID"

  assert_http_ok "$promo_scoped_kk_url" "admin promo detail scoped analytics kk locale"
  assert_page_contains \
    "$promo_scoped_kk_url" \
    "admin promo detail scoped analytics kk locale" \
    "DEVPROMO" \
    "$resolved_city_id" \
    "Промокод картасы" \
    "Аналитика сүзгілері"
  assert_page_not_contains \
    "$promo_scoped_kk_url" \
    "admin promo detail scoped analytics kk locale" \
    "ADMIN_API_TOKEN_MISSING" \
    "ADMIN_API_URL_INVALID"
fi

echo
echo "Admin live HTTP smoke passed."

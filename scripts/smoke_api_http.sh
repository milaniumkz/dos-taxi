#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_ENV_FILE="$ROOT_DIR/apps/api/.env.local"
API_PREFIX="${API_PREFIX:-api/v1}"
API_SMOKE_SKIP_BOOT="${API_SMOKE_SKIP_BOOT:-false}"
LOG_FILE="${API_SMOKE_LOG_FILE:-${TMPDIR:-/tmp}/dos-api-smoke.log}"
PID_FILE="${TMPDIR:-/tmp}/dos-api-smoke.pid"
SMOKE_PHONE=""
EXECUTOR_SMOKE_PHONE=""
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/dos-api-smoke.XXXXXX")"
STARTED_LOCAL_API="false"
USE_DEV_FIXTURES="false"

info() {
  echo "[info] $*"
}

fail() {
  echo "[fail] $*" >&2
  exit 1
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

  rm -rf "$TMP_DIR"
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="${2:-20}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    if curl -f -s --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      return 1
    fi

    sleep 1
  done
}

is_local_port_open() {
  local port="$1"
  (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
}

resolve_api_smoke_port() {
  local candidate
  for candidate in 3300 3301 3302 3303 3304 3305; do
    if ! is_local_port_open "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done

  fail "No free API smoke port found in range 3300-3305"
}

extract_url_port() {
  local raw_url="$1"
  node -e '
    try {
      const url = new URL(process.argv[1]);
      process.stdout.write(url.port || (url.protocol === "https:" ? "443" : "80"));
    } catch {
      process.exit(1);
    }
  ' "$raw_url"
}

resolve_docs_url() {
  local raw_url="$1"
  node -e '
    try {
      const url = new URL(process.argv[1]);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && parts.at(-2) === "api" && parts.at(-1) === "v1") {
        parts.splice(parts.length - 2, 2);
      }
      url.pathname = `/${[...parts, "docs"].join("/")}`;
      url.search = "";
      url.hash = "";
      process.stdout.write(url.toString());
    } catch {
      process.exit(1);
    }
  ' "$raw_url"
}

extract_json_field() {
  local payload="$1"
  local field="$2"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const field = process.argv[2];
    const value = field.split(".").reduce((current, key) => current?.[key], payload);
    if (value === undefined || value === null) {
      process.exit(1);
    }
    process.stdout.write(String(value));
  ' "$payload" "$field"
}

extract_header_value() {
  local headers_file="$1"
  local header_name="$2"
  node -e '
    const fs = require("node:fs");
    const headers = fs.readFileSync(process.argv[1], "utf8");
    const headerName = process.argv[2].toLowerCase();
    const line = headers
      .split(/\r?\n/)
      .find((entry) => entry.toLowerCase().startsWith(`${headerName}:`));
    if (!line) {
      process.exit(1);
    }
    process.stdout.write(line.slice(line.indexOf(":") + 1).trim());
  ' "$headers_file" "$header_name"
}

assert_json_field_equals() {
  local payload="$1"
  local field="$2"
  local expected="$3"
  local actual
  actual="$(extract_json_field "$payload" "$field")" || fail "Response did not include ${field}: ${payload}"
  [[ "$actual" == "$expected" ]] || fail "Unexpected ${field}: expected ${expected}, got ${actual}"
}

assert_log_contains() {
  local expected="$1"
  grep -F "$expected" "$LOG_FILE" >/dev/null 2>&1 || fail "API log does not contain expected fragment: $expected"
}

assert_history_contains_order() {
  local payload="$1"
  local order_id="$2"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const orderId = process.argv[2];
    if (!Array.isArray(payload.items) || !payload.items.some((item) => item?.id === orderId)) {
      process.exit(1);
    }
  ' "$payload" "$order_id" || fail "Order history does not include expected order ${order_id}: ${payload}"
}

trap cleanup EXIT

if [[ -n "${API_SMOKE_BASE_URL:-}" ]]; then
  API_BASE_URL="$API_SMOKE_BASE_URL"
  API_PORT="${API_SMOKE_PORT:-$(extract_url_port "$API_BASE_URL" || echo 3300)}"
else
  API_PORT="${API_SMOKE_PORT:-$(resolve_api_smoke_port)}"
  API_BASE_URL="http://127.0.0.1:${API_PORT}/${API_PREFIX}"
fi

API_HOST="$(extract_url_host "$API_BASE_URL" || true)"
if [[ -f "$API_ENV_FILE" ]]; then
  if [[ "$API_SMOKE_SKIP_BOOT" != "true" ]] || { [[ -n "$API_HOST" ]] && is_local_host "$API_HOST"; }; then
    set -a
    source "$API_ENV_FILE"
    set +a
  fi
fi

if [[ -n "${API_SMOKE_PHONE:-}" ]]; then
  SMOKE_PHONE="$API_SMOKE_PHONE"
elif [[ -n "${DEV_CLIENT_PHONE:-}" ]] && [[ -n "$API_HOST" ]] && is_local_host "$API_HOST"; then
  SMOKE_PHONE="$DEV_CLIENT_PHONE"
  USE_DEV_FIXTURES="true"
else
  SMOKE_PHONE="+77010000000"
fi

if [[ -n "${API_SMOKE_EXECUTOR_PHONE:-}" ]]; then
  EXECUTOR_SMOKE_PHONE="$API_SMOKE_EXECUTOR_PHONE"
elif [[ "$USE_DEV_FIXTURES" == "true" ]] && [[ -n "${DEV_EXECUTOR_PHONE:-}" ]]; then
  EXECUTOR_SMOKE_PHONE="$DEV_EXECUTOR_PHONE"
fi

if [[ "$API_SMOKE_SKIP_BOOT" != "true" ]]; then
  [[ -f "$API_ENV_FILE" ]] || fail "Missing API env file: $API_ENV_FILE"
  [[ -f "$ROOT_DIR/apps/api/dist/apps/api/src/main.js" ]] || fail "API build artifact is missing. Run 'corepack pnpm --filter @dos/api build' first."
  [[ -f "$ROOT_DIR/packages/shared-types/dist/index.js" ]] || fail "shared-types build artifact is missing. Run 'corepack pnpm --filter @dos/shared-types build' first."

  info "Starting API on port ${API_PORT}"
  (
    cd "$ROOT_DIR/apps/api"
    PORT="$API_PORT" node dist/apps/api/src/main.js >"$LOG_FILE" 2>&1
  ) &
  echo "$!" >"$PID_FILE"
  STARTED_LOCAL_API="true"
else
  info "Using already running API at ${API_BASE_URL}"
fi

if ! wait_for_url "$API_BASE_URL/health/ready" 20; then
  if [[ "$STARTED_LOCAL_API" == "true" ]]; then
    echo
    echo "--- API LOG ---"
    cat "$LOG_FILE" || true
  fi
  fail "API did not become ready at $API_BASE_URL/health/ready"
fi

health_headers_file="$TMP_DIR/health.headers"
health_body_file="$TMP_DIR/health.body"
ready_body_file="$TMP_DIR/ready.body"
validation_headers_file="$TMP_DIR/validation.headers"
validation_body_file="$TMP_DIR/validation.body"
unauthorized_headers_file="$TMP_DIR/unauthorized.headers"
unauthorized_body_file="$TMP_DIR/unauthorized.body"
send_otp_headers_file="$TMP_DIR/send-otp.headers"
send_otp_body_file="$TMP_DIR/send-otp.body"
verify_headers_file="$TMP_DIR/verify.headers"
verify_body_file="$TMP_DIR/verify.body"
refresh_headers_file="$TMP_DIR/refresh.headers"
refresh_body_file="$TMP_DIR/refresh.body"
stale_refresh_headers_file="$TMP_DIR/stale-refresh.headers"
stale_refresh_body_file="$TMP_DIR/stale-refresh.body"
logout_headers_file="$TMP_DIR/logout.headers"
logout_body_file="$TMP_DIR/logout.body"
post_logout_refresh_headers_file="$TMP_DIR/post-logout-refresh.headers"
post_logout_refresh_body_file="$TMP_DIR/post-logout-refresh.body"
profile_headers_file="$TMP_DIR/profile.headers"
profile_body_file="$TMP_DIR/profile.body"
history_headers_file="$TMP_DIR/history.headers"
history_body_file="$TMP_DIR/history.body"
order_detail_headers_file="$TMP_DIR/order-detail.headers"
order_detail_body_file="$TMP_DIR/order-detail.body"
create_order_headers_file="$TMP_DIR/create-order.headers"
create_order_body_file="$TMP_DIR/create-order.body"
client_active_success_headers_file="$TMP_DIR/client-active-success.headers"
client_active_success_body_file="$TMP_DIR/client-active-success.body"
cancel_order_headers_file="$TMP_DIR/cancel-order.headers"
cancel_order_body_file="$TMP_DIR/cancel-order.body"
client_active_headers_file="$TMP_DIR/client-active.headers"
client_active_body_file="$TMP_DIR/client-active.body"
executor_send_otp_headers_file="$TMP_DIR/executor-send-otp.headers"
executor_send_otp_body_file="$TMP_DIR/executor-send-otp.body"
executor_verify_headers_file="$TMP_DIR/executor-verify.headers"
executor_verify_body_file="$TMP_DIR/executor-verify.body"
executor_profile_headers_file="$TMP_DIR/executor-profile.headers"
executor_profile_body_file="$TMP_DIR/executor-profile.body"
executor_history_headers_file="$TMP_DIR/executor-history.headers"
executor_history_body_file="$TMP_DIR/executor-history.body"
executor_status_headers_file="$TMP_DIR/executor-status.headers"
executor_status_body_file="$TMP_DIR/executor-status.body"
executor_flow_create_order_headers_file="$TMP_DIR/executor-flow-create-order.headers"
executor_flow_create_order_body_file="$TMP_DIR/executor-flow-create-order.body"
executor_incoming_headers_file="$TMP_DIR/executor-incoming.headers"
executor_incoming_body_file="$TMP_DIR/executor-incoming.body"
executor_accept_headers_file="$TMP_DIR/executor-accept.headers"
executor_accept_body_file="$TMP_DIR/executor-accept.body"
executor_active_success_headers_file="$TMP_DIR/executor-active-success.headers"
executor_active_success_body_file="$TMP_DIR/executor-active-success.body"
executor_progress_headers_file="$TMP_DIR/executor-progress.headers"
executor_progress_body_file="$TMP_DIR/executor-progress.body"
executor_complete_headers_file="$TMP_DIR/executor-complete.headers"
executor_complete_body_file="$TMP_DIR/executor-complete.body"
payment_methods_headers_file="$TMP_DIR/payment-methods.headers"
payment_methods_body_file="$TMP_DIR/payment-methods.body"
bind_card_headers_file="$TMP_DIR/bind-card.headers"
bind_card_body_file="$TMP_DIR/bind-card.body"
pay_order_headers_file="$TMP_DIR/pay-order.headers"
pay_order_body_file="$TMP_DIR/pay-order.body"
repeat_pay_order_headers_file="$TMP_DIR/repeat-pay-order.headers"
repeat_pay_order_body_file="$TMP_DIR/repeat-pay-order.body"
payment_webhook_headers_file="$TMP_DIR/payment-webhook.headers"
payment_webhook_body_file="$TMP_DIR/payment-webhook.body"
repeat_payment_webhook_headers_file="$TMP_DIR/repeat-payment-webhook.headers"
repeat_payment_webhook_body_file="$TMP_DIR/repeat-payment-webhook.body"
delete_card_headers_file="$TMP_DIR/delete-card.headers"
delete_card_body_file="$TMP_DIR/delete-card.body"
payment_methods_after_delete_headers_file="$TMP_DIR/payment-methods-after-delete.headers"
payment_methods_after_delete_body_file="$TMP_DIR/payment-methods-after-delete.body"
executor_active_headers_file="$TMP_DIR/executor-active.headers"
executor_active_body_file="$TMP_DIR/executor-active.body"

curl -s --max-time 3 -D "$health_headers_file" -o "$health_body_file" \
  "$API_BASE_URL/health"
curl -s --max-time 3 -o "$ready_body_file" "$API_BASE_URL/health/ready"

health_payload="$(cat "$health_body_file")"
ready_payload="$(cat "$ready_body_file")"
docs_url="$(resolve_docs_url "$API_BASE_URL")"
docs_status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$docs_url")"
health_trace_id="$(extract_header_value "$health_headers_file" "x-trace-id")" || fail "Health response did not include x-trace-id header"

info "Health payload: $health_payload"
info "Readiness payload: $ready_payload"
[[ -n "$health_trace_id" ]] || fail "Health response returned an empty x-trace-id header"
[[ "$health_payload" == *'"status":"ok"'* ]] || fail "Health endpoint did not report status=ok"
[[ "$health_payload" == *'"service":"api"'* ]] || fail "Health endpoint did not report service=api"
[[ "$ready_payload" == *'"status":"ok"'* ]] || fail "Readiness endpoint did not report status=ok"
[[ "$ready_payload" == *'"database":{"status":"up"}'* ]] || fail "Readiness endpoint did not report database up"
[[ "$ready_payload" == *'"redis":{"status":"up"}'* ]] || fail "Readiness endpoint did not report redis up"
[[ "$ready_payload" == *'"storage":{"status":"up"}'* ]] || fail "Readiness endpoint did not report storage up"
[[ "$docs_status" == "200" || "$docs_status" == "301" || "$docs_status" == "302" ]] || fail "Swagger docs are not reachable on ${docs_url} (status=$docs_status)"

validation_status="$(curl -s --max-time 5 \
  -D "$validation_headers_file" \
  -o "$validation_body_file" \
  -w "%{http_code}" \
  -X POST "$API_BASE_URL/auth/verify-otp" \
  -H 'content-type: application/json' \
  -H 'x-trace-id: smoke-validation-trace' \
  -d '{}')"
[[ "$validation_status" == "400" ]] || fail "Validation probe returned unexpected status=${validation_status}"
validation_payload="$(cat "$validation_body_file")"
validation_trace_id="$(extract_header_value "$validation_headers_file" "x-trace-id")" || fail "Validation error response did not include x-trace-id header"
[[ "$validation_trace_id" == "smoke-validation-trace" ]] || fail "Validation response did not preserve inbound trace id"
assert_json_field_equals "$validation_payload" "code" "VALIDATION_ERROR"
assert_json_field_equals "$validation_payload" "traceId" "smoke-validation-trace"

unauthorized_status="$(curl -s --max-time 5 \
  -D "$unauthorized_headers_file" \
  -o "$unauthorized_body_file" \
  -w "%{http_code}" \
  "$API_BASE_URL/profile" \
  -H 'x-trace-id: smoke-unauthorized-trace')"
[[ "$unauthorized_status" == "401" ]] || fail "Unauthorized probe returned unexpected status=${unauthorized_status}"
unauthorized_payload="$(cat "$unauthorized_body_file")"
unauthorized_trace_id="$(extract_header_value "$unauthorized_headers_file" "x-trace-id")" || fail "Unauthorized response did not include x-trace-id header"
[[ "$unauthorized_trace_id" == "smoke-unauthorized-trace" ]] || fail "Unauthorized response did not preserve inbound trace id"
assert_json_field_equals "$unauthorized_payload" "code" "UNAUTHORIZED"
assert_json_field_equals "$unauthorized_payload" "traceId" "smoke-unauthorized-trace"

send_otp_status="$(curl -s --max-time 5 \
  -D "$send_otp_headers_file" \
  -o "$send_otp_body_file" \
  -w "%{http_code}" \
  -X POST "$API_BASE_URL/auth/send-otp" \
  -H 'content-type: application/json' \
  -d "{\"phone\":\"${SMOKE_PHONE}\"}")"
[[ "$send_otp_status" == "201" || "$send_otp_status" == "200" ]] || fail "Send OTP returned unexpected status=${send_otp_status}"
send_otp_payload="$(cat "$send_otp_body_file")"
send_otp_trace_id="$(extract_header_value "$send_otp_headers_file" "x-trace-id")" || fail "Send OTP response did not include x-trace-id header"
[[ -n "$send_otp_trace_id" ]] || fail "Send OTP response returned an empty x-trace-id header"
assert_json_field_equals "$send_otp_payload" "expiresInSeconds" "300"
assert_json_field_equals "$send_otp_payload" "devCode" "1234"

verify_status="$(curl -s --max-time 5 \
  -D "$verify_headers_file" \
  -o "$verify_body_file" \
  -w "%{http_code}" \
  -X POST "$API_BASE_URL/auth/verify-otp" \
  -H 'content-type: application/json' \
  -d "{\"phone\":\"${SMOKE_PHONE}\",\"code\":\"1234\",\"role\":\"client\"}")"
[[ "$verify_status" == "201" || "$verify_status" == "200" ]] || fail "Auth verify returned unexpected status=${verify_status}"
verify_payload="$(cat "$verify_body_file")"
verify_trace_id="$(extract_header_value "$verify_headers_file" "x-trace-id")" || fail "Auth verify response did not include x-trace-id header"
[[ -n "$verify_trace_id" ]] || fail "Auth verify response returned an empty x-trace-id header"
access_token="$(extract_json_field "$verify_payload" accessToken)" || fail "Auth verify did not return accessToken: $verify_payload"
refresh_token="$(extract_json_field "$verify_payload" refreshToken)" || fail "Auth verify did not return refreshToken: $verify_payload"
verified_phone="$(extract_json_field "$verify_payload" user.phone)" || fail "Auth verify did not return user.phone: $verify_payload"
[[ "$verified_phone" == "$SMOKE_PHONE" ]] || fail "Auth verify returned unexpected phone: $verified_phone"

profile_status="$(curl -s --max-time 5 \
  -D "$profile_headers_file" \
  -o "$profile_body_file" \
  -w "%{http_code}" \
  "$API_BASE_URL/profile" \
  -H "Authorization: Bearer ${access_token}")"
[[ "$profile_status" == "200" ]] || fail "Profile probe returned unexpected status=${profile_status}"
profile_payload="$(cat "$profile_body_file")"
profile_trace_id="$(extract_header_value "$profile_headers_file" "x-trace-id")" || fail "Profile response did not include x-trace-id header"
[[ -n "$profile_trace_id" ]] || fail "Profile response returned an empty x-trace-id header"
profile_phone="$(extract_json_field "$profile_payload" phone)" || fail "Profile response did not include phone: $profile_payload"
[[ "$profile_phone" == "$SMOKE_PHONE" ]] || fail "Profile response returned unexpected phone: $profile_phone"

if [[ "$USE_DEV_FIXTURES" == "true" ]]; then
  seeded_order_id="${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"

  history_status="$(curl -s --max-time 5 \
    -D "$history_headers_file" \
    -o "$history_body_file" \
    -w "%{http_code}" \
    "$API_BASE_URL/orders/history?limit=5" \
    -H "Authorization: Bearer ${access_token}")"
  [[ "$history_status" == "200" ]] || fail "Order history returned unexpected status=${history_status}"
  history_payload="$(cat "$history_body_file")"
  assert_history_contains_order "$history_payload" "$seeded_order_id"

  order_detail_status="$(curl -s --max-time 5 \
    -D "$order_detail_headers_file" \
    -o "$order_detail_body_file" \
    -w "%{http_code}" \
    "$API_BASE_URL/orders/${seeded_order_id}" \
    -H "Authorization: Bearer ${access_token}")"
  [[ "$order_detail_status" == "200" ]] || fail "Order detail returned unexpected status=${order_detail_status}"
  order_detail_payload="$(cat "$order_detail_body_file")"
  assert_json_field_equals "$order_detail_payload" "id" "$seeded_order_id"
  assert_json_field_equals "$order_detail_payload" "status" "completed"
  assert_json_field_equals "$order_detail_payload" "paymentMethod" "card"
  assert_json_field_equals "$order_detail_payload" "promoCodeId" "${DEV_PROMO_CODE_ID:-00000000-0000-4000-8000-000000000021}"
  assert_json_field_equals "$order_detail_payload" "discountAmount" "300.00"
  assert_json_field_equals "$order_detail_payload" "routePoints.1.sequenceIndex" "1"

  seeded_city_id="$(extract_json_field "$order_detail_payload" "cityId")" || fail "Order detail did not include cityId: $order_detail_payload"

  create_order_status="$(curl -s --max-time 5 \
    -D "$create_order_headers_file" \
    -o "$create_order_body_file" \
    -w "%{http_code}" \
    -X POST "$API_BASE_URL/orders" \
    -H 'content-type: application/json' \
    -H "Authorization: Bearer ${access_token}" \
    -d "{
      \"serviceType\":\"taxi\",
      \"cityId\":\"${seeded_city_id}\",
      \"paymentMethod\":\"card\",
      \"carClass\":\"economy\",
      \"routePoints\":[
        {
          \"sequenceIndex\":0,
          \"lat\":43.238949,
          \"lng\":76.889709,
          \"address\":\"пр. Абая 10, Алматы\"
        },
        {
          \"sequenceIndex\":1,
          \"lat\":43.25654,
          \"lng\":76.92848,
          \"address\":\"ул. Панфилова 125, Алматы\"
        }
      ]
    }")"
  [[ "$create_order_status" == "201" || "$create_order_status" == "200" ]] || fail "Create order returned unexpected status=${create_order_status}"
  create_order_payload="$(cat "$create_order_body_file")"
  created_order_id="$(extract_json_field "$create_order_payload" "id")" || fail "Create order did not return id: $create_order_payload"
  assert_json_field_equals "$create_order_payload" "status" "searching"
  assert_json_field_equals "$create_order_payload" "paymentMethod" "card"
  assert_json_field_equals "$create_order_payload" "discountAmount" "0.00"

  client_active_success_status="$(curl -s --max-time 5 \
    -D "$client_active_success_headers_file" \
    -o "$client_active_success_body_file" \
    -w "%{http_code}" \
    "$API_BASE_URL/orders/active" \
    -H 'x-trace-id: smoke-client-active-success-trace' \
    -H "Authorization: Bearer ${access_token}")"
  [[ "$client_active_success_status" == "200" ]] || fail "Client active order success probe returned unexpected status=${client_active_success_status}"
  client_active_success_payload="$(cat "$client_active_success_body_file")"
  client_active_success_trace_id="$(extract_header_value "$client_active_success_headers_file" "x-trace-id")" || fail "Client active success response did not include x-trace-id header"
  [[ "$client_active_success_trace_id" == "smoke-client-active-success-trace" ]] || fail "Client active success response did not preserve inbound trace id"
  assert_json_field_equals "$client_active_success_payload" "id" "$created_order_id"
  assert_json_field_equals "$client_active_success_payload" "status" "searching"

  cancel_order_status="$(curl -s --max-time 5 \
    -D "$cancel_order_headers_file" \
    -o "$cancel_order_body_file" \
    -w "%{http_code}" \
    -X PATCH "$API_BASE_URL/orders/${created_order_id}/cancel" \
    -H 'content-type: application/json' \
    -H "Authorization: Bearer ${access_token}" \
    -d '{"reason":"Smoke cleanup"}')"
  [[ "$cancel_order_status" == "200" ]] || fail "Cancel order returned unexpected status=${cancel_order_status}"
  cancel_order_payload="$(cat "$cancel_order_body_file")"
  assert_json_field_equals "$cancel_order_payload" "id" "$created_order_id"
  assert_json_field_equals "$cancel_order_payload" "status" "cancelled_client"

  client_active_status="$(curl -s --max-time 5 \
    -D "$client_active_headers_file" \
    -o "$client_active_body_file" \
    -w "%{http_code}" \
    "$API_BASE_URL/orders/active" \
    -H 'x-trace-id: smoke-client-active-trace' \
    -H "Authorization: Bearer ${access_token}")"
  [[ "$client_active_status" == "404" ]] || fail "Client active order probe returned unexpected status=${client_active_status}"
  client_active_payload="$(cat "$client_active_body_file")"
  assert_json_field_equals "$client_active_payload" "code" "CLIENT_ACTIVE_ORDER_NOT_FOUND"
  assert_json_field_equals "$client_active_payload" "traceId" "smoke-client-active-trace"
fi

if [[ -n "$EXECUTOR_SMOKE_PHONE" ]]; then
  executor_send_otp_status="$(curl -s --max-time 5 \
    -D "$executor_send_otp_headers_file" \
    -o "$executor_send_otp_body_file" \
    -w "%{http_code}" \
    -X POST "$API_BASE_URL/auth/send-otp" \
    -H 'content-type: application/json' \
    -d "{\"phone\":\"${EXECUTOR_SMOKE_PHONE}\"}")"
  [[ "$executor_send_otp_status" == "201" || "$executor_send_otp_status" == "200" ]] || fail "Executor send OTP returned unexpected status=${executor_send_otp_status}"
  executor_send_otp_payload="$(cat "$executor_send_otp_body_file")"
  assert_json_field_equals "$executor_send_otp_payload" "expiresInSeconds" "300"
  assert_json_field_equals "$executor_send_otp_payload" "devCode" "1234"

  executor_verify_status="$(curl -s --max-time 5 \
    -D "$executor_verify_headers_file" \
    -o "$executor_verify_body_file" \
    -w "%{http_code}" \
    -X POST "$API_BASE_URL/auth/verify-otp" \
    -H 'content-type: application/json' \
    -d "{\"phone\":\"${EXECUTOR_SMOKE_PHONE}\",\"code\":\"1234\",\"role\":\"executor\"}")"
  [[ "$executor_verify_status" == "201" || "$executor_verify_status" == "200" ]] || fail "Executor auth verify returned unexpected status=${executor_verify_status}"
  executor_verify_payload="$(cat "$executor_verify_body_file")"
  executor_access_token="$(extract_json_field "$executor_verify_payload" accessToken)" || fail "Executor auth verify did not return accessToken: $executor_verify_payload"

  executor_profile_status="$(curl -s --max-time 5 \
    -D "$executor_profile_headers_file" \
    -o "$executor_profile_body_file" \
    -w "%{http_code}" \
    "$API_BASE_URL/executor/profile" \
    -H "Authorization: Bearer ${executor_access_token}")"
  [[ "$executor_profile_status" == "200" ]] || fail "Executor profile returned unexpected status=${executor_profile_status}"
  executor_profile_payload="$(cat "$executor_profile_body_file")"

  executor_history_status="$(curl -s --max-time 5 \
    -D "$executor_history_headers_file" \
    -o "$executor_history_body_file" \
    -w "%{http_code}" \
    "$API_BASE_URL/executor/orders/history?limit=5" \
    -H "Authorization: Bearer ${executor_access_token}")"
  [[ "$executor_history_status" == "200" ]] || fail "Executor order history returned unexpected status=${executor_history_status}"
  executor_history_payload="$(cat "$executor_history_body_file")"

  executor_status_status="$(curl -s --max-time 5 \
    -D "$executor_status_headers_file" \
    -o "$executor_status_body_file" \
    -w "%{http_code}" \
    -X PATCH "$API_BASE_URL/executor/status" \
    -H 'content-type: application/json' \
    -H "Authorization: Bearer ${executor_access_token}" \
    -d '{
      "isOnline": true,
      "lat": 43.238949,
      "lng": 76.889709,
      "heading": 90
    }')"
  [[ "$executor_status_status" == "200" ]] || fail "Executor status update returned unexpected status=${executor_status_status}"
  executor_status_payload="$(cat "$executor_status_body_file")"
  assert_json_field_equals "$executor_status_payload" "isOnline" "true"

  if [[ "$USE_DEV_FIXTURES" == "true" ]]; then
    seeded_order_id="${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
    assert_json_field_equals "$executor_profile_payload" "id" "${DEV_EXECUTOR_ID:-00000000-0000-4000-8000-000000000011}"
    assert_json_field_equals "$executor_profile_payload" "userId" "${DEV_EXECUTOR_USER_ID:-00000000-0000-4000-8000-000000000003}"
    assert_json_field_equals "$executor_profile_payload" "user.phone" "$EXECUTOR_SMOKE_PHONE"
    assert_history_contains_order "$executor_history_payload" "$seeded_order_id"

    executor_flow_create_order_status="$(curl -s --max-time 5 \
      -D "$executor_flow_create_order_headers_file" \
      -o "$executor_flow_create_order_body_file" \
      -w "%{http_code}" \
      -X POST "$API_BASE_URL/orders" \
      -H 'content-type: application/json' \
      -H "Authorization: Bearer ${access_token}" \
      -d "{
        \"serviceType\":\"taxi\",
        \"cityId\":\"${seeded_city_id}\",
        \"paymentMethod\":\"card\",
        \"carClass\":\"economy\",
        \"routePoints\":[
          {
            \"sequenceIndex\":0,
            \"lat\":43.238949,
            \"lng\":76.889709,
            \"address\":\"пр. Абая 10, Алматы\"
          },
          {
            \"sequenceIndex\":1,
            \"lat\":43.25654,
            \"lng\":76.92848,
            \"address\":\"ул. Панфилова 125, Алматы\"
          }
        ]
      }")"
    [[ "$executor_flow_create_order_status" == "201" || "$executor_flow_create_order_status" == "200" ]] || fail "Executor flow create order returned unexpected status=${executor_flow_create_order_status}"
    executor_flow_create_order_payload="$(cat "$executor_flow_create_order_body_file")"
    executor_flow_order_id="$(extract_json_field "$executor_flow_create_order_payload" "id")" || fail "Executor flow create order did not return id: $executor_flow_create_order_payload"

    executor_offer_found="false"
    executor_incoming_payload="[]"
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      executor_incoming_status="$(curl -s --max-time 5 \
        -D "$executor_incoming_headers_file" \
        -o "$executor_incoming_body_file" \
        -w "%{http_code}" \
        "$API_BASE_URL/executor/orders/incoming" \
        -H "Authorization: Bearer ${executor_access_token}")"
      [[ "$executor_incoming_status" == "200" ]] || fail "Executor incoming orders returned unexpected status=${executor_incoming_status}"
      executor_incoming_payload="$(cat "$executor_incoming_body_file")"
      if node -e '
        const payload = JSON.parse(process.argv[1]);
        const orderId = process.argv[2];
        if (!Array.isArray(payload) || !payload.some((item) => item?.orderId === orderId)) {
          process.exit(1);
        }
      ' "$executor_incoming_payload" "$executor_flow_order_id"; then
        executor_offer_found="true"
        break
      fi
      sleep 1
    done
    [[ "$executor_offer_found" == "true" ]] || fail "Executor incoming orders do not include created order ${executor_flow_order_id}: ${executor_incoming_payload}"

    executor_accept_status="$(curl -s --max-time 5 \
      -D "$executor_accept_headers_file" \
      -o "$executor_accept_body_file" \
      -w "%{http_code}" \
      -X POST "$API_BASE_URL/executor/orders/${executor_flow_order_id}/accept" \
      -H "Authorization: Bearer ${executor_access_token}")"
    [[ "$executor_accept_status" == "201" || "$executor_accept_status" == "200" ]] || fail "Executor accept returned unexpected status=${executor_accept_status}"

    executor_active_success_status="$(curl -s --max-time 5 \
      -D "$executor_active_success_headers_file" \
      -o "$executor_active_success_body_file" \
      -w "%{http_code}" \
      "$API_BASE_URL/executor/orders/active" \
      -H 'x-trace-id: smoke-executor-active-success-trace' \
      -H "Authorization: Bearer ${executor_access_token}")"
    [[ "$executor_active_success_status" == "200" ]] || fail "Executor active order success probe returned unexpected status=${executor_active_success_status}"
    executor_active_success_payload="$(cat "$executor_active_success_body_file")"
    executor_active_success_trace_id="$(extract_header_value "$executor_active_success_headers_file" "x-trace-id")" || fail "Executor active success response did not include x-trace-id header"
    [[ "$executor_active_success_trace_id" == "smoke-executor-active-success-trace" ]] || fail "Executor active success response did not preserve inbound trace id"
    assert_json_field_equals "$executor_active_success_payload" "id" "$executor_flow_order_id"
    assert_json_field_equals "$executor_active_success_payload" "status" "accepted"

    executor_progress_status="$(curl -s --max-time 5 \
      -D "$executor_progress_headers_file" \
      -o "$executor_progress_body_file" \
      -w "%{http_code}" \
      -X PATCH "$API_BASE_URL/executor/orders/${executor_flow_order_id}/status" \
      -H 'content-type: application/json' \
      -H "Authorization: Bearer ${executor_access_token}" \
      -d '{"status":"in_progress"}')"
    [[ "$executor_progress_status" == "200" ]] || fail "Executor progress update returned unexpected status=${executor_progress_status}"

    executor_complete_status="$(curl -s --max-time 5 \
      -D "$executor_complete_headers_file" \
      -o "$executor_complete_body_file" \
      -w "%{http_code}" \
      -X PATCH "$API_BASE_URL/executor/orders/${executor_flow_order_id}/status" \
      -H 'content-type: application/json' \
      -H "Authorization: Bearer ${executor_access_token}" \
      -d '{"status":"completed"}')"
    [[ "$executor_complete_status" == "200" ]] || fail "Executor complete update returned unexpected status=${executor_complete_status}"
    executor_complete_payload="$(cat "$executor_complete_body_file")"
    assert_json_field_equals "$executor_complete_payload" "id" "$executor_flow_order_id"
    assert_json_field_equals "$executor_complete_payload" "status" "completed"

    bind_card_status="$(curl -s --max-time 5 \
      -D "$bind_card_headers_file" \
      -o "$bind_card_body_file" \
      -w "%{http_code}" \
      -X POST "$API_BASE_URL/payments/cards/bind" \
      -H 'content-type: application/json' \
      -H "Authorization: Bearer ${access_token}" \
      -d '{
        "panMask":"4000 00** **** 2458",
        "holderName":"SMOKE TEST",
        "makeDefault":true
      }')"
    [[ "$bind_card_status" == "201" || "$bind_card_status" == "200" ]] || fail "Bind card returned unexpected status=${bind_card_status}"
    bind_card_payload="$(cat "$bind_card_body_file")"
    bound_card_id="$(extract_json_field "$bind_card_payload" "id")" || fail "Bind card did not return id: $bind_card_payload"
    assert_json_field_equals "$bind_card_payload" "provider" "stub"
    assert_json_field_equals "$bind_card_payload" "last4" "2458"
    assert_json_field_equals "$bind_card_payload" "brand" "VISA"
    assert_json_field_equals "$bind_card_payload" "isDefault" "true"

    payment_methods_status="$(curl -s --max-time 5 \
      -D "$payment_methods_headers_file" \
      -o "$payment_methods_body_file" \
      -w "%{http_code}" \
      "$API_BASE_URL/payments/methods" \
      -H "Authorization: Bearer ${access_token}")"
    [[ "$payment_methods_status" == "200" ]] || fail "Payment methods returned unexpected status=${payment_methods_status}"
    payment_methods_payload="$(cat "$payment_methods_body_file")"
    node -e '
      const payload = JSON.parse(process.argv[1]);
      const cardId = process.argv[2];
      if (!Array.isArray(payload) || !payload.some((item) => item?.id === cardId && item?.provider === "stub")) {
        process.exit(1);
      }
    ' "$payment_methods_payload" "$bound_card_id" || fail "Payment methods do not include bound card ${bound_card_id}: ${payment_methods_payload}"

    pay_order_status="$(curl -s --max-time 5 \
      -D "$pay_order_headers_file" \
      -o "$pay_order_body_file" \
      -w "%{http_code}" \
      -X POST "$API_BASE_URL/payments/orders/${executor_flow_order_id}/pay" \
      -H 'content-type: application/json' \
      -H "Authorization: Bearer ${access_token}" \
      -d "{
        \"cardId\":\"${bound_card_id}\",
        \"idempotencyKey\":\"smoke-pay-${executor_flow_order_id}\"
      }")"
    [[ "$pay_order_status" == "201" || "$pay_order_status" == "200" ]] || fail "Pay order returned unexpected status=${pay_order_status}"
    pay_order_payload="$(cat "$pay_order_body_file")"
    payment_id="$(extract_json_field "$pay_order_payload" "id")" || fail "Pay order did not return id: $pay_order_payload"
    payment_provider_transaction_id="$(extract_json_field "$pay_order_payload" "providerTransactionId")" || fail "Pay order did not return providerTransactionId: $pay_order_payload"
    assert_json_field_equals "$pay_order_payload" "orderId" "$executor_flow_order_id"
    assert_json_field_equals "$pay_order_payload" "status" "captured"
    assert_json_field_equals "$pay_order_payload" "method" "card"
    assert_json_field_equals "$pay_order_payload" "provider" "stub"
    assert_json_field_equals "$pay_order_payload" "idempotencyKey" "smoke-pay-${executor_flow_order_id}"

    repeat_pay_order_status="$(curl -s --max-time 5 \
      -D "$repeat_pay_order_headers_file" \
      -o "$repeat_pay_order_body_file" \
      -w "%{http_code}" \
      -X POST "$API_BASE_URL/payments/orders/${executor_flow_order_id}/pay" \
      -H 'content-type: application/json' \
      -H "Authorization: Bearer ${access_token}" \
      -d "{
        \"cardId\":\"${bound_card_id}\",
        \"idempotencyKey\":\"smoke-pay-${executor_flow_order_id}\"
      }")"
    [[ "$repeat_pay_order_status" == "201" || "$repeat_pay_order_status" == "200" ]] || fail "Repeat pay order returned unexpected status=${repeat_pay_order_status}"
    repeat_pay_order_payload="$(cat "$repeat_pay_order_body_file")"
    assert_json_field_equals "$repeat_pay_order_payload" "id" "$payment_id"
    assert_json_field_equals "$repeat_pay_order_payload" "orderId" "$executor_flow_order_id"
    assert_json_field_equals "$repeat_pay_order_payload" "idempotencyKey" "smoke-pay-${executor_flow_order_id}"

    payment_webhook_status="$(curl -s --max-time 5 \
      -D "$payment_webhook_headers_file" \
      -o "$payment_webhook_body_file" \
      -w "%{http_code}" \
      -X POST "$API_BASE_URL/payments/webhook/stub" \
      -H 'content-type: application/json' \
      -d "{
        \"eventId\":\"smoke-webhook-${payment_id}\",
        \"transactionId\":\"${payment_provider_transaction_id}\",
        \"orderId\":\"${executor_flow_order_id}\",
        \"status\":\"captured\",
        \"amount\":2100
      }")"
    [[ "$payment_webhook_status" == "201" || "$payment_webhook_status" == "200" ]] || fail "Payment webhook returned unexpected status=${payment_webhook_status}"
    payment_webhook_payload="$(cat "$payment_webhook_body_file")"
    assert_json_field_equals "$payment_webhook_payload" "processed" "true"
    assert_json_field_equals "$payment_webhook_payload" "duplicated" "false"

    repeat_payment_webhook_status="$(curl -s --max-time 5 \
      -D "$repeat_payment_webhook_headers_file" \
      -o "$repeat_payment_webhook_body_file" \
      -w "%{http_code}" \
      -X POST "$API_BASE_URL/payments/webhook/stub" \
      -H 'content-type: application/json' \
      -d "{
        \"eventId\":\"smoke-webhook-${payment_id}\",
        \"transactionId\":\"${payment_provider_transaction_id}\",
        \"orderId\":\"${executor_flow_order_id}\",
        \"status\":\"captured\",
        \"amount\":2100
      }")"
    [[ "$repeat_payment_webhook_status" == "201" || "$repeat_payment_webhook_status" == "200" ]] || fail "Repeat payment webhook returned unexpected status=${repeat_payment_webhook_status}"
    repeat_payment_webhook_payload="$(cat "$repeat_payment_webhook_body_file")"
    assert_json_field_equals "$repeat_payment_webhook_payload" "processed" "true"
    assert_json_field_equals "$repeat_payment_webhook_payload" "duplicated" "true"

    delete_card_status="$(curl -s --max-time 5 \
      -D "$delete_card_headers_file" \
      -o "$delete_card_body_file" \
      -w "%{http_code}" \
      -X DELETE "$API_BASE_URL/payments/cards/${bound_card_id}" \
      -H "Authorization: Bearer ${access_token}")"
    [[ "$delete_card_status" == "204" ]] || fail "Delete card returned unexpected status=${delete_card_status}"

    payment_methods_after_delete_status="$(curl -s --max-time 5 \
      -D "$payment_methods_after_delete_headers_file" \
      -o "$payment_methods_after_delete_body_file" \
      -w "%{http_code}" \
      "$API_BASE_URL/payments/methods" \
      -H "Authorization: Bearer ${access_token}")"
    [[ "$payment_methods_after_delete_status" == "200" ]] || fail "Payment methods after delete returned unexpected status=${payment_methods_after_delete_status}"
    payment_methods_after_delete_payload="$(cat "$payment_methods_after_delete_body_file")"
    node -e '
      const payload = JSON.parse(process.argv[1]);
      const cardId = process.argv[2];
      if (!Array.isArray(payload) || payload.some((item) => item?.id === cardId)) {
        process.exit(1);
      }
    ' "$payment_methods_after_delete_payload" "$bound_card_id" || fail "Deleted card ${bound_card_id} is still returned by payment methods: ${payment_methods_after_delete_payload}"

    executor_active_status="$(curl -s --max-time 5 \
      -D "$executor_active_headers_file" \
      -o "$executor_active_body_file" \
      -w "%{http_code}" \
      "$API_BASE_URL/executor/orders/active" \
      -H 'x-trace-id: smoke-executor-active-trace' \
      -H "Authorization: Bearer ${executor_access_token}")"
    [[ "$executor_active_status" == "404" ]] || fail "Executor active order probe returned unexpected status=${executor_active_status}"
    executor_active_payload="$(cat "$executor_active_body_file")"
    assert_json_field_equals "$executor_active_payload" "code" "EXECUTOR_ACTIVE_ORDER_NOT_FOUND"
    assert_json_field_equals "$executor_active_payload" "traceId" "smoke-executor-active-trace"
  fi
fi

refresh_status="$(curl -s --max-time 5 \
  -D "$refresh_headers_file" \
  -o "$refresh_body_file" \
  -w "%{http_code}" \
  -X POST "$API_BASE_URL/auth/refresh" \
  -H 'content-type: application/json' \
  -d "{\"refreshToken\":\"${refresh_token}\"}")"
[[ "$refresh_status" == "201" || "$refresh_status" == "200" ]] || fail "Refresh returned unexpected status=${refresh_status}"
refresh_payload="$(cat "$refresh_body_file")"
refresh_trace_id="$(extract_header_value "$refresh_headers_file" "x-trace-id")" || fail "Refresh response did not include x-trace-id header"
[[ -n "$refresh_trace_id" ]] || fail "Refresh response returned an empty x-trace-id header"
rotated_access_token="$(extract_json_field "$refresh_payload" accessToken)" || fail "Refresh did not return accessToken: $refresh_payload"
rotated_refresh_token="$(extract_json_field "$refresh_payload" refreshToken)" || fail "Refresh did not return refreshToken: $refresh_payload"
refreshed_phone="$(extract_json_field "$refresh_payload" user.phone)" || fail "Refresh did not return user.phone: $refresh_payload"
[[ "$refreshed_phone" == "$SMOKE_PHONE" ]] || fail "Refresh returned unexpected phone: $refreshed_phone"

stale_refresh_status="$(curl -s --max-time 5 \
  -D "$stale_refresh_headers_file" \
  -o "$stale_refresh_body_file" \
  -w "%{http_code}" \
  -X POST "$API_BASE_URL/auth/refresh" \
  -H 'content-type: application/json' \
  -H 'x-trace-id: smoke-stale-refresh-trace' \
  -d "{\"refreshToken\":\"${refresh_token}\"}")"
[[ "$stale_refresh_status" == "401" ]] || fail "Stale refresh probe returned unexpected status=${stale_refresh_status}"
stale_refresh_payload="$(cat "$stale_refresh_body_file")"
stale_refresh_trace_id="$(extract_header_value "$stale_refresh_headers_file" "x-trace-id")" || fail "Stale refresh response did not include x-trace-id header"
[[ "$stale_refresh_trace_id" == "smoke-stale-refresh-trace" ]] || fail "Stale refresh response did not preserve inbound trace id"
assert_json_field_equals "$stale_refresh_payload" "code" "REFRESH_TOKEN_REVOKED"
assert_json_field_equals "$stale_refresh_payload" "traceId" "smoke-stale-refresh-trace"

logout_status="$(curl -s --max-time 5 \
  -D "$logout_headers_file" \
  -o "$logout_body_file" \
  -w "%{http_code}" \
  -X POST "$API_BASE_URL/auth/logout" \
  -H "Authorization: Bearer ${rotated_access_token}" \
  -H 'x-trace-id: smoke-logout-trace')"
[[ "$logout_status" == "201" || "$logout_status" == "200" ]] || fail "Logout returned unexpected status=${logout_status}"
logout_payload="$(cat "$logout_body_file")"
logout_trace_id="$(extract_header_value "$logout_headers_file" "x-trace-id")" || fail "Logout response did not include x-trace-id header"
[[ "$logout_trace_id" == "smoke-logout-trace" ]] || fail "Logout response did not preserve inbound trace id"
assert_json_field_equals "$logout_payload" "success" "true"

post_logout_refresh_status="$(curl -s --max-time 5 \
  -D "$post_logout_refresh_headers_file" \
  -o "$post_logout_refresh_body_file" \
  -w "%{http_code}" \
  -X POST "$API_BASE_URL/auth/refresh" \
  -H 'content-type: application/json' \
  -H 'x-trace-id: smoke-post-logout-refresh-trace' \
  -d "{\"refreshToken\":\"${rotated_refresh_token}\"}")"
[[ "$post_logout_refresh_status" == "401" ]] || fail "Post-logout refresh probe returned unexpected status=${post_logout_refresh_status}"
post_logout_refresh_payload="$(cat "$post_logout_refresh_body_file")"
post_logout_refresh_trace_id="$(extract_header_value "$post_logout_refresh_headers_file" "x-trace-id")" || fail "Post-logout refresh response did not include x-trace-id header"
[[ "$post_logout_refresh_trace_id" == "smoke-post-logout-refresh-trace" ]] || fail "Post-logout refresh response did not preserve inbound trace id"
assert_json_field_equals "$post_logout_refresh_payload" "code" "REFRESH_TOKEN_REVOKED"
assert_json_field_equals "$post_logout_refresh_payload" "traceId" "smoke-post-logout-refresh-trace"

assert_log_contains "POST /${API_PREFIX}/auth/verify-otp -> 400"
assert_log_contains "traceId=smoke-validation-trace"
assert_log_contains "GET /${API_PREFIX}/profile -> 401"
assert_log_contains "traceId=smoke-unauthorized-trace"
assert_log_contains "POST /${API_PREFIX}/auth/send-otp ->"
assert_log_contains "GET /${API_PREFIX}/profile -> 200"
if [[ "$USE_DEV_FIXTURES" == "true" ]]; then
  assert_log_contains "GET /${API_PREFIX}/orders/history?limit=5 -> 200"
  assert_log_contains "GET /${API_PREFIX}/orders/${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031} -> 200"
  assert_log_contains "POST /${API_PREFIX}/orders ->"
  assert_log_contains "GET /${API_PREFIX}/orders/active -> 200"
  assert_log_contains "traceId=smoke-client-active-success-trace"
  assert_log_contains "PATCH /${API_PREFIX}/orders/${created_order_id}/cancel -> 200"
  assert_log_contains "GET /${API_PREFIX}/orders/active -> 404"
  assert_log_contains "traceId=smoke-client-active-trace"
  if [[ -n "$EXECUTOR_SMOKE_PHONE" ]]; then
    assert_log_contains "GET /${API_PREFIX}/executor/profile -> 200"
    assert_log_contains "PATCH /${API_PREFIX}/executor/status -> 200"
    assert_log_contains "GET /${API_PREFIX}/executor/orders/incoming -> 200"
    assert_log_contains "POST /${API_PREFIX}/executor/orders/${executor_flow_order_id}/accept ->"
    assert_log_contains "GET /${API_PREFIX}/executor/orders/active -> 200"
    assert_log_contains "traceId=smoke-executor-active-success-trace"
    assert_log_contains "PATCH /${API_PREFIX}/executor/orders/${executor_flow_order_id}/status -> 200"
    assert_log_contains "POST /${API_PREFIX}/payments/cards/bind ->"
    assert_log_contains "GET /${API_PREFIX}/payments/methods -> 200"
    assert_log_contains "POST /${API_PREFIX}/payments/orders/${executor_flow_order_id}/pay ->"
    assert_log_contains "POST /${API_PREFIX}/payments/webhook/stub ->"
    assert_log_contains "DELETE /${API_PREFIX}/payments/cards/${bound_card_id} -> 204"
    assert_log_contains "GET /${API_PREFIX}/payments/methods -> 200"
    assert_log_contains "GET /${API_PREFIX}/executor/orders/history?limit=5 -> 200"
    assert_log_contains "GET /${API_PREFIX}/executor/orders/active -> 404"
    assert_log_contains "traceId=smoke-executor-active-trace"
  fi
fi
assert_log_contains "POST /${API_PREFIX}/auth/refresh -> 401"
assert_log_contains "traceId=smoke-stale-refresh-trace"
assert_log_contains "traceId=smoke-post-logout-refresh-trace"
assert_log_contains "POST /${API_PREFIX}/auth/logout ->"

echo
echo "API HTTP smoke passed."

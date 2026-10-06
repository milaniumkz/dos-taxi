#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_ENV_FILE="$ROOT_DIR/apps/api/.env.local"

info() {
  echo "[info] $*"
}

fail() {
  echo "[fail] $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
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

normalize_admin_api_url() {
  local raw_url="$1"
  node -e '
    const rawUrl = process.argv[1];
    try {
      process.stdout.write(new URL(rawUrl).toString().replace(/\/$/, ""));
    } catch {
      process.exit(1);
    }
  ' "$raw_url"
}

url_encode() {
  local raw_value="$1"
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1] ?? ""))' "$raw_value"
}

api_get() {
  local path="$1"
  local body_file
  local status

  body_file="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-smoke.XXXXXX")"
  status="$(curl -s --max-time 5 \
    -H "Authorization: Bearer ${ADMIN_API_TOKEN_RESOLVED}" \
    -o "$body_file" \
    -w "%{http_code}" \
    "${ADMIN_API_BASE_URL}${path}")"

  if [[ "$status" != "200" ]]; then
    local payload
    payload="$(cat "$body_file" 2>/dev/null || true)"
    rm -f "$body_file"
    fail "Admin API request failed for ${path} (status=${status}): ${payload}"
  fi

  cat "$body_file"
  rm -f "$body_file"
}

api_get_with_token() {
  local path="$1"
  local token="$2"
  local body_file
  local status

  body_file="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-smoke.XXXXXX")"
  status="$(curl -s --max-time 5 \
    -H "Authorization: Bearer ${token}" \
    -o "$body_file" \
    -w "%{http_code}" \
    "${ADMIN_API_BASE_URL}${path}")"

  if [[ "$status" != "200" ]]; then
    local payload
    payload="$(cat "$body_file" 2>/dev/null || true)"
    rm -f "$body_file"
    fail "Admin API request failed for ${path} (status=${status}): ${payload}"
  fi

  cat "$body_file"
  rm -f "$body_file"
}

api_get_with_token_and_trace() {
  local path="$1"
  local token="$2"
  local trace_id="$3"
  local body_file
  local headers_file
  local status
  local response_trace_id

  body_file="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-smoke.XXXXXX")"
  headers_file="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-smoke.XXXXXX")"
  status="$(curl -s --max-time 5 \
    -H "Authorization: Bearer ${token}" \
    -H "x-trace-id: ${trace_id}" \
    -D "$headers_file" \
    -o "$body_file" \
    -w "%{http_code}" \
    "${ADMIN_API_BASE_URL}${path}")"

  if [[ "$status" != "200" ]]; then
    local payload
    payload="$(cat "$body_file" 2>/dev/null || true)"
    rm -f "$body_file" "$headers_file"
    fail "Admin API request failed for ${path} (status=${status}): ${payload}"
  fi

  response_trace_id="$(extract_header_value "$headers_file" "x-trace-id")" || {
    rm -f "$body_file" "$headers_file"
    fail "Admin API response did not include x-trace-id for ${path}"
  }
  [[ "$response_trace_id" == "$trace_id" ]] || {
    rm -f "$body_file" "$headers_file"
    fail "Admin API response did not preserve inbound trace id for ${path}"
  }

  cat "$body_file"
  rm -f "$body_file" "$headers_file"
}

api_json_request_with_token_and_trace() {
  local method="$1"
  local path="$2"
  local token="$3"
  local trace_id="$4"
  local expected_status="$5"
  local payload="$6"
  local body_file
  local headers_file
  local status
  local response_trace_id

  body_file="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-smoke.XXXXXX")"
  headers_file="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-smoke.XXXXXX")"
  status="$(curl -s --max-time 5 \
    -X "$method" \
    -H "Authorization: Bearer ${token}" \
    -H 'content-type: application/json' \
    -H "x-trace-id: ${trace_id}" \
    -D "$headers_file" \
    -o "$body_file" \
    -w "%{http_code}" \
    -d "$payload" \
    "${ADMIN_API_BASE_URL}${path}")"

  if [[ "$status" != "$expected_status" ]]; then
    local response_payload
    response_payload="$(cat "$body_file" 2>/dev/null || true)"
    rm -f "$body_file" "$headers_file"
    fail "Admin API request failed for ${method} ${path} (status=${status}): ${response_payload}"
  fi

  response_trace_id="$(extract_header_value "$headers_file" "x-trace-id")" || {
    rm -f "$body_file" "$headers_file"
    fail "Admin API response did not include x-trace-id for ${method} ${path}"
  }
  [[ "$response_trace_id" == "$trace_id" ]] || {
    rm -f "$body_file" "$headers_file"
    fail "Admin API response did not preserve inbound trace id for ${method} ${path}"
  }

  cat "$body_file"
  rm -f "$body_file" "$headers_file"
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
    if (value === null) {
      process.stdout.write("__NULL__");
      return;
    }
    process.stdout.write(String(value));
  ' "$payload" "$field" || fail "Unable to extract ${field} from payload: ${payload}"
}

assert_json_field_equals() {
  local payload="$1"
  local field="$2"
  local expected="$3"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const field = process.argv[2];
    const expected = process.argv[3];
    const actual = field.split(".").reduce((current, key) => current?.[key], payload);
    if (String(actual) !== expected) {
      process.exit(1);
    }
  ' "$payload" "$field" "$expected" || fail "Unexpected ${field}: expected ${expected}, payload=${payload}"
}

assert_readiness_check_up() {
  local payload="$1"
  local check_name="$2"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    const checkName = process.argv[2];
    const status =
      payload?.checks?.[checkName]?.status ?? payload?.[checkName]?.status;
    if (status !== "up") {
      process.exit(1);
    }
  ' "$payload" "$check_name" || fail "Unexpected ${check_name}.status: expected up, payload=${payload}"
}

assert_json_field_is_null() {
  local payload="$1"
  local field="$2"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const field = process.argv[2];
    const actual = field.split(".").reduce((current, key) => current?.[key], payload);
    if (actual !== null) {
      process.exit(1);
    }
  ' "$payload" "$field" || fail "Expected ${field} to be null, payload=${payload}"
}

resolve_city_id() {
  local payload
  payload="$(api_get "/admin/cities")"

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
  ' "$payload" || fail "Unable to resolve city fixture from /admin/cities: ${payload}"
}

resolve_taxi_tariff_id() {
  local city_id="$1"
  local payload
  payload="$(api_get "/admin/tariffs?serviceType=taxi&cityId=${city_id}")"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    if (!Array.isArray(payload) || payload.length === 0) {
      process.exit(1);
    }
    const tariff = payload.find((entry) => entry?.vehicleClass === "economy") ?? payload[0];
    if (!tariff?.id) {
      process.exit(1);
    }
    process.stdout.write(tariff.id);
  ' "$payload" || fail "Unable to resolve taxi tariff fixture from /admin/tariffs: ${payload}"
}

resolve_promo_code_id() {
  local payload
  payload="$(api_get "/admin/promo-codes")"

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
  ' "$payload" || fail "Unable to resolve promo fixture from /admin/promo-codes: ${payload}"
}

assert_array_contains_id() {
  local payload="$1"
  local expected_id="$2"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const expectedId = process.argv[2];
    if (!Array.isArray(payload) || !payload.some((entry) => entry?.id === expectedId)) {
      process.exit(1);
    }
  ' "$payload" "$expected_id" || fail "Expected id ${expected_id} was not found in payload: ${payload}"
}

assert_orders_list_contains() {
  local payload="$1"
  local expected_id="$2"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const expectedId = process.argv[2];
    if (!Array.isArray(payload.items) || !payload.items.some((entry) => entry?.id === expectedId)) {
      process.exit(1);
    }
  ' "$payload" "$expected_id" || fail "Expected order ${expected_id} was not found in orders payload: ${payload}"
}

assert_notes_scoped_to_entity() {
  local payload="$1"
  local entity_type="$2"
  local entity_id="$3"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const entityType = process.argv[2];
    const entityId = process.argv[3];
    if (!Array.isArray(payload)) {
      process.exit(1);
    }
    if (!payload.every((entry) => entry?.entityType === entityType && entry?.entityId === entityId)) {
      process.exit(1);
    }
  ' "$payload" "$entity_type" "$entity_id" || fail "Notes payload is not scoped to ${entity_type}/${entity_id}: ${payload}"
}

assert_activity_scoped_to_entity() {
  local payload="$1"
  local entity_type="$2"
  local entity_id="$3"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const entityType = process.argv[2];
    const entityId = process.argv[3];
    if (!Array.isArray(payload)) {
      process.exit(1);
    }
    if (!payload.every((entry) => entry?.entityType === entityType && entry?.entityId === entityId)) {
      process.exit(1);
    }
  ' "$payload" "$entity_type" "$entity_id" || fail "Activity payload is not scoped to ${entity_type}/${entity_id}: ${payload}"
}

assert_notes_contain_note() {
  local payload="$1"
  local note_id="$2"
  local expected_state="$3"
  local expected_kind="$4"
  local expected_pinned="$5"
  local expected_assigned_to_id="$6"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const noteId = process.argv[2];
    const expectedState = process.argv[3];
    const expectedKind = process.argv[4];
    const expectedPinned = process.argv[5] === "true";
    const expectedAssignedToId = process.argv[6] === "__NULL__" ? null : process.argv[6];
    if (!Array.isArray(payload)) {
      process.exit(1);
    }
    const note = payload.find((entry) => entry?.id === noteId);
    if (!note) {
      process.exit(1);
    }
    if (
      note.state !== expectedState ||
      note.kind !== expectedKind ||
      Boolean(note.isPinned) !== expectedPinned ||
      (note.assignedToId ?? null) !== expectedAssignedToId
    ) {
      process.exit(1);
    }
  ' "$payload" "$note_id" "$expected_state" "$expected_kind" "$expected_pinned" "$expected_assigned_to_id" || {
    fail "Expected note ${note_id} with state=${expected_state}, kind=${expected_kind}, isPinned=${expected_pinned}, assignedToId=${expected_assigned_to_id} in payload: ${payload}"
  }
}

assert_activity_contains_note_action() {
  local payload="$1"
  local expected_action="$2"
  local expected_actor_id="$3"
  local expected_note_id="$4"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const expectedAction = process.argv[2];
    const expectedActorId = process.argv[3];
    const expectedNoteId = process.argv[4];
    if (!Array.isArray(payload)) {
      process.exit(1);
    }
    const entry = payload.find(
      (activity) =>
        activity?.action === expectedAction &&
        activity?.actorId === expectedActorId &&
        activity?.metadata?.noteId === expectedNoteId,
    );
    if (!entry) {
      process.exit(1);
    }
  ' "$payload" "$expected_action" "$expected_actor_id" "$expected_note_id" || {
    fail "Expected admin activity ${expected_action} for note ${expected_note_id} and actor ${expected_actor_id} in payload: ${payload}"
  }
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

generate_support_token() {
  (
    cd "$ROOT_DIR/apps/api"
    ADMIN_TOKEN_ROLE=support ./node_modules/.bin/ts-node --project tsconfig.json scripts/generate-dev-admin-token.ts
  )
}

generate_operator_token() {
  (
    cd "$ROOT_DIR/apps/api"
    ADMIN_TOKEN_ROLE=operator ./node_modules/.bin/ts-node --project tsconfig.json scripts/generate-dev-admin-token.ts
  )
}

require_command node
require_command curl

[[ -n "${ADMIN_API_URL:-}" ]] || fail "ADMIN_API_URL is required"

if ! ADMIN_API_TOKEN_RESOLVED="$(bash "$ROOT_DIR/scripts/resolve_admin_runtime_token.sh")"; then
  fail "Unable to resolve ADMIN_API_TOKEN for admin API smoke"
fi

if ! ADMIN_API_BASE_URL="$(normalize_admin_api_url "$ADMIN_API_URL")"; then
  fail "ADMIN_API_URL must be a valid absolute URL"
fi

if [[ -f "$API_ENV_FILE" ]]; then
  set -a
  source "$API_ENV_FILE"
  set +a
fi

info "Admin API target: ${ADMIN_API_BASE_URL}"

health_payload="$(api_get "/health")"
assert_json_field_equals "$health_payload" "status" "ok"
assert_json_field_equals "$health_payload" "service" "api"

ready_payload="$(api_get "/health/ready")"
assert_json_field_equals "$ready_payload" "status" "ok"
assert_readiness_check_up "$ready_payload" "database"
assert_readiness_check_up "$ready_payload" "redis"
assert_readiness_check_up "$ready_payload" "storage"

city_id="$(resolve_city_id)"
promo_code_id="$(resolve_promo_code_id)"
taxi_tariff_id="$(resolve_taxi_tariff_id "$city_id")"

cities_payload="$(api_get "/admin/cities")"
assert_array_contains_id "$cities_payload" "$city_id"

city_detail_payload="$(api_get "/admin/cities/${city_id}")"
assert_json_field_equals "$city_detail_payload" "id" "$city_id"

tariffs_payload="$(api_get "/admin/tariffs?serviceType=taxi&cityId=${city_id}")"
assert_array_contains_id "$tariffs_payload" "$taxi_tariff_id"

tariff_detail_payload="$(api_get "/admin/tariffs/${taxi_tariff_id}")"
assert_json_field_equals "$tariff_detail_payload" "id" "$taxi_tariff_id"
assert_json_field_equals "$tariff_detail_payload" "cityId" "$city_id"

orders_payload="$(api_get "/admin/orders?limit=10")"
assert_orders_list_contains "$orders_payload" "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"

order_detail_payload="$(api_get_with_token_and_trace "/admin/orders/${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}" "$ADMIN_API_TOKEN_RESOLVED" "smoke-admin-order-read-trace")"
assert_json_field_equals "$order_detail_payload" "id" "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
assert_json_field_equals "$order_detail_payload" "promoCodeId" "${DEV_PROMO_CODE_ID:-00000000-0000-4000-8000-000000000021}"

users_payload="$(api_get "/admin/users")"
assert_array_contains_id "$users_payload" "${DEV_CLIENT_USER_ID:-00000000-0000-4000-8000-000000000002}"

user_detail_payload="$(api_get "/admin/users/${DEV_CLIENT_USER_ID:-00000000-0000-4000-8000-000000000002}")"
assert_json_field_equals "$user_detail_payload" "id" "${DEV_CLIENT_USER_ID:-00000000-0000-4000-8000-000000000002}"

executors_payload="$(api_get "/admin/executors?cityId=${city_id}")"
assert_array_contains_id "$executors_payload" "${DEV_EXECUTOR_ID:-00000000-0000-4000-8000-000000000011}"

executor_detail_payload="$(api_get "/admin/executors/${DEV_EXECUTOR_ID:-00000000-0000-4000-8000-000000000011}")"
assert_json_field_equals "$executor_detail_payload" "id" "${DEV_EXECUTOR_ID:-00000000-0000-4000-8000-000000000011}"

promo_codes_payload="$(api_get "/admin/promo-codes")"
assert_array_contains_id "$promo_codes_payload" "$promo_code_id"

promo_detail_payload="$(api_get "/admin/promo-codes/${promo_code_id}")"
assert_json_field_equals "$promo_detail_payload" "id" "$promo_code_id"

promo_analytics_payload="$(api_get "/admin/promo-codes/${promo_code_id}/analytics?cityId=${city_id}&serviceType=taxi&paymentMethod=card&status=completed")"
assert_json_field_equals "$promo_analytics_payload" "promoCodeId" "$promo_code_id"

financial_report_payload="$(api_get_with_token_and_trace "/admin/reports/financial?period=day&cityId=${city_id}" "$ADMIN_API_TOKEN_RESOLVED" "smoke-admin-financial-read-trace")"
assert_json_field_equals "$financial_report_payload" "cityId" "$city_id"

operations_report_payload="$(api_get "/admin/reports/operations?period=day&cityId=${city_id}")"
assert_json_field_equals "$operations_report_payload" "cityId" "$city_id"

notes_payload="$(api_get "/admin/notes?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}")"
assert_notes_scoped_to_entity "$notes_payload" "order" "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"

activity_payload="$(api_get "/admin/activity?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}")"
assert_activity_scoped_to_entity "$activity_payload" "order" "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"

if api_host="$(extract_url_host "$ADMIN_API_BASE_URL")" && is_local_host "$api_host"; then
  if ! SUPPORT_API_TOKEN="$(generate_support_token)"; then
    fail "Unable to generate support token for local admin API role smoke"
  fi

  support_orders_payload="$(api_get_with_token_and_trace "/admin/orders?limit=1" "$SUPPORT_API_TOKEN" "smoke-admin-support-read-trace")"
  node -e '
    const payload = JSON.parse(process.argv[1]);
    if (!Array.isArray(payload.items)) {
      process.exit(1);
    }
  ' "$support_orders_payload" || fail "Support token did not receive readable admin orders payload: ${support_orders_payload}"

  support_write_headers_file="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-headers.XXXXXX")"
  support_write_body_file="$(mktemp "${TMPDIR:-/tmp}/dos-admin-api-body.XXXXXX")"
  support_write_status="$(curl -s --max-time 5 \
    -D "$support_write_headers_file" \
    -o "$support_write_body_file" \
    -w "%{http_code}" \
    -X POST "${ADMIN_API_BASE_URL}/admin/notes" \
    -H "Authorization: Bearer ${SUPPORT_API_TOKEN}" \
    -H 'content-type: application/json' \
    -H 'x-trace-id: smoke-admin-support-forbidden-trace' \
    -d "{\"entityType\":\"order\",\"entityId\":\"${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}\",\"body\":\"should be forbidden\"}")"
  [[ "$support_write_status" == "403" ]] || fail "Support write probe returned unexpected status=${support_write_status}"
  support_write_payload="$(cat "$support_write_body_file")"
  support_write_trace_id="$(extract_header_value "$support_write_headers_file" "x-trace-id")" || fail "Support write response did not include x-trace-id"
  [[ "$support_write_trace_id" == "smoke-admin-support-forbidden-trace" ]] || fail "Support write response did not preserve inbound trace id"
  assert_json_field_equals "$support_write_payload" "code" "FORBIDDEN"
  assert_json_field_equals "$support_write_payload" "traceId" "smoke-admin-support-forbidden-trace"
  rm -f "$support_write_headers_file" "$support_write_body_file"

  if ! OPERATOR_API_TOKEN="$(generate_operator_token)"; then
    fail "Unable to generate operator token for local admin API role smoke"
  fi

  operator_actor_id="${DEV_ADMIN_USER_ID:-00000000-0000-4000-8000-000000000001}"
  operator_note_marker="smoke-operator-note-$(date +%s)"
  operator_note_create_payload="{\"entityType\":\"order\",\"entityId\":\"${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}\",\"body\":\"${operator_note_marker}\",\"kind\":\"handoff\",\"isPinned\":true,\"assignedToId\":\"${operator_actor_id}\"}"
  operator_note_create_response="$(api_json_request_with_token_and_trace \
    "POST" \
    "/admin/notes" \
    "$OPERATOR_API_TOKEN" \
    "smoke-admin-operator-create-trace" \
    "201" \
    "$operator_note_create_payload")"
  operator_note_id="$(extract_json_field "$operator_note_create_response" "id")"
  assert_json_field_equals "$operator_note_create_response" "entityType" "order"
  assert_json_field_equals "$operator_note_create_response" "entityId" "${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}"
  assert_json_field_equals "$operator_note_create_response" "kind" "handoff"
  assert_json_field_equals "$operator_note_create_response" "state" "open"
  assert_json_field_equals "$operator_note_create_response" "isPinned" "true"
  assert_json_field_equals "$operator_note_create_response" "assignedToId" "$operator_actor_id"

  operator_note_query="$(url_encode "$operator_note_marker")"
  operator_notes_created_payload="$(api_get_with_token \
    "/admin/notes?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}&query=${operator_note_query}" \
    "$OPERATOR_API_TOKEN")"
  assert_notes_contain_note "$operator_notes_created_payload" "$operator_note_id" "open" "handoff" "true" "$operator_actor_id"

  operator_note_update_payload='{"state":"resolved","kind":"escalation","isPinned":false,"assignedToId":null}'
  operator_note_update_response="$(api_json_request_with_token_and_trace \
    "PATCH" \
    "/admin/notes/${operator_note_id}" \
    "$OPERATOR_API_TOKEN" \
    "smoke-admin-operator-update-trace" \
    "200" \
    "$operator_note_update_payload")"
  assert_json_field_equals "$operator_note_update_response" "id" "$operator_note_id"
  assert_json_field_equals "$operator_note_update_response" "kind" "escalation"
  assert_json_field_equals "$operator_note_update_response" "state" "resolved"
  assert_json_field_equals "$operator_note_update_response" "isPinned" "false"
  assert_json_field_is_null "$operator_note_update_response" "assignedToId"

  operator_notes_updated_payload="$(api_get_with_token \
    "/admin/notes?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}&query=${operator_note_query}&state=resolved&kind=escalation" \
    "$OPERATOR_API_TOKEN")"
  assert_notes_contain_note "$operator_notes_updated_payload" "$operator_note_id" "resolved" "escalation" "false" "__NULL__"

  operator_activity_query="$(url_encode "$operator_note_id")"
  operator_note_created_activity="$(api_get_with_token \
    "/admin/activity?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}&action=note.created&actorId=${operator_actor_id}&query=${operator_activity_query}" \
    "$OPERATOR_API_TOKEN")"
  assert_activity_contains_note_action "$operator_note_created_activity" "note.created" "$operator_actor_id" "$operator_note_id"

  operator_note_updated_activity="$(api_get_with_token \
    "/admin/activity?entityType=order&entityId=${DEV_ORDER_ID:-00000000-0000-4000-8000-000000000031}&action=note.updated&actorId=${operator_actor_id}&query=${operator_activity_query}" \
    "$OPERATOR_API_TOKEN")"
  assert_activity_contains_note_action "$operator_note_updated_activity" "note.updated" "$operator_actor_id" "$operator_note_id"
fi

echo
echo "Admin API HTTP smoke passed."

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_step() {
  local label="$1"
  shift
  echo
  echo "==> $label"
  "$@"
}

resolve_flutter_bin() {
  local candidates=(
    "${FLUTTER_BIN:-}"
    "$ROOT_DIR/../flutter/bin/flutter"
    "/Volumes/PD1000/job/flutter/bin/flutter"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  if command -v flutter >/dev/null 2>&1; then
    command -v flutter
    return 0
  fi

  return 1
}

run_step "node workspace verification" bash scripts/verify_node_workspace.sh

if FLUTTER_BIN_PATH="$(resolve_flutter_bin)"; then
  run_step "flutter pub get" bash -lc "cd '$ROOT_DIR/apps/mobile' && '$FLUTTER_BIN_PATH' pub get"
  run_step "flutter gen-l10n" bash -lc "cd '$ROOT_DIR/apps/mobile' && '$FLUTTER_BIN_PATH' gen-l10n"
  run_step "flutter analyze" bash -lc "cd '$ROOT_DIR/apps/mobile' && '$FLUTTER_BIN_PATH' analyze"
  run_step "flutter test" bash -lc "cd '$ROOT_DIR/apps/mobile' && '$FLUTTER_BIN_PATH' test"
else
  echo
  echo "[warn] Flutter SDK not found. Skipping mobile verification."
fi

run_step "admin demo http smoke" bash scripts/smoke_admin_http.sh

if [[ -n "${ADMIN_API_URL:-}" ]]; then
  run_step "admin live runtime preflight" bash scripts/preflight_admin_runtime.sh
  run_step "admin api http smoke" bash scripts/smoke_admin_api_http.sh
  run_step "admin live http smoke" bash scripts/smoke_admin_live_http.sh
else
  echo
  echo "[warn] ADMIN_API_URL is not set. Skipping live admin verification."
fi

run_step "local runtime preflight" bash scripts/preflight_local_runtime.sh
run_step "reset local smoke state" node scripts/reset_local_smoke_state.mjs
run_step "api http smoke" bash scripts/smoke_api_http.sh

echo
echo "Release readiness verification finished successfully."

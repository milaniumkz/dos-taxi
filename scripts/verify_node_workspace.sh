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

run_step "shared-types build" corepack pnpm --filter @dos/shared-types build
run_step "shared-types typecheck" corepack pnpm --filter @dos/shared-types typecheck
run_step "shared-types lint" corepack pnpm --filter @dos/shared-types lint

run_step "api lint" corepack pnpm --filter @dos/api lint
run_step "api typecheck" corepack pnpm --filter @dos/api typecheck
run_step "api build" corepack pnpm --filter @dos/api build
run_step "api unit tests" corepack pnpm --filter @dos/api test:unit
run_step "api integration tests" corepack pnpm --filter @dos/api test:integration
run_step "api e2e tests" corepack pnpm --filter @dos/api test:e2e

run_step "admin lint" corepack pnpm --filter @dos/admin lint
run_step "admin typecheck" corepack pnpm --filter @dos/admin typecheck
run_step "admin build" corepack pnpm --filter @dos/admin build

echo
echo "Node workspace verification finished successfully."

#!/usr/bin/env bash
set -euo pipefail

REAL_SDK_DIR="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
TARGET_BIN_DIR="$REAL_SDK_DIR/cmdline-tools/latest/bin"
TARGET_FILE="$TARGET_BIN_DIR/apkanalyzer"

mkdir -p "$TARGET_BIN_DIR"

cat > "$TARGET_FILE" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "files" && "${2:-}" == "list" && $# -ge 3 ]]; then
  exec unzip -Z1 "$3"
fi

echo "Unsupported apkanalyzer invocation: $*" >&2
exit 1
EOF

chmod +x "$TARGET_FILE"

echo "[ok] apkanalyzer shim installed at $TARGET_FILE"

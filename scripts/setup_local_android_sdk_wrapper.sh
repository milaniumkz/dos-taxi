#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REAL_SDK_DIR="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
WRAPPER_SDK_DIR="$ROOT_DIR/apps/mobile/android/local-sdk"
CMDLINE_BIN_DIR="$WRAPPER_SDK_DIR/cmdline-tools/latest/bin"

if [[ ! -d "$REAL_SDK_DIR" ]]; then
  echo "[error] Android SDK not found at: $REAL_SDK_DIR" >&2
  exit 1
fi

mkdir -p "$WRAPPER_SDK_DIR" "$CMDLINE_BIN_DIR"

link_sdk_dir() {
  local name="$1"
  local source="$REAL_SDK_DIR/$name"
  local target="$WRAPPER_SDK_DIR/$name"
  if [[ -e "$source" ]]; then
    ln -sfn "$source" "$target"
  fi
}

for dir_name in build-tools cmake emulator licenses ndk platform-tools platforms sources system-images; do
  link_sdk_dir "$dir_name"
done

cat > "$CMDLINE_BIN_DIR/apkanalyzer" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "files" && "${2:-}" == "list" && $# -ge 3 ]]; then
  exec unzip -Z1 "$3"
fi

echo "Unsupported apkanalyzer invocation: $*" >&2
exit 1
EOF

chmod +x "$CMDLINE_BIN_DIR/apkanalyzer"

echo "[ok] Android SDK wrapper ready at $WRAPPER_SDK_DIR"
echo "[ok] Fake cmdline-tools apkanalyzer installed at $CMDLINE_BIN_DIR/apkanalyzer"

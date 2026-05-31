#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/releases"
STAGE="$(mktemp -d)"

mkdir -p "$OUT_DIR"

cp -R "$ROOT_DIR/panel" "$STAGE/panel"
cp -R "$ROOT_DIR/helper" "$STAGE/helper"
cp -R "$ROOT_DIR/installer" "$STAGE/installer"
cp -R "$ROOT_DIR/dist" "$STAGE/dist"
cp "$ROOT_DIR/install.command" "$STAGE/install.command"
cp "$ROOT_DIR/README.md" "$STAGE/README.md"
cp "$ROOT_DIR/LICENSE" "$STAGE/LICENSE"
chmod +x "$STAGE/install.command"
chmod +x "$STAGE/installer/"*.sh

(
  cd "$STAGE"
  zip -r -X "$OUT_DIR/CaptionsV03-mac.zip" . >/dev/null
)

rm -rf "$STAGE"
echo "$OUT_DIR/CaptionsV03-mac.zip"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PANEL_SRC="$ROOT_DIR/panel/CaptionsV35"
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/CaptionsV35"

if [[ ! -d "$PANEL_SRC" ]]; then
  echo "Captions v03.5 panel not found: $PANEL_SRC"
  exit 1
fi

rm -rf "$CEP_DIR"
mkdir -p "$(dirname "$CEP_DIR")"
cp -R "$PANEL_SRC" "$CEP_DIR"

echo "Installed Captions v03.5 panel to: $CEP_DIR"
echo "This uses the existing Captions helper at http://127.0.0.1:17777"

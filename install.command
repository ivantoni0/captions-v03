#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$ROOT_DIR/installer/install_v03_macos.sh"

echo
echo "Captions v03 install finished."
echo "Restart After Effects, then open Window > Extensions > Captions v03."
echo
read -r -p "Press Enter to close."

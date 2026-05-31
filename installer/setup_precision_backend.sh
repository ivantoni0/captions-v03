#!/usr/bin/env bash
set -euo pipefail

APP_SUPPORT_DIR="${CAPTIONS_APP_SUPPORT_DIR:-$HOME/Library/Application Support/Captions}"
VENV_DIR="${CAPTIONS_WHISPERX_VENV:-$APP_SUPPORT_DIR/whisperx-venv}"

mkdir -p "$APP_SUPPORT_DIR"

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip setuptools wheel
"$VENV_DIR/bin/pip" install whisperx

echo "WhisperX installed in: $VENV_DIR"

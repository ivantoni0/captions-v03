#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PANEL_SRC="$ROOT_DIR/panel/Captions"
HELPER_BIN="$ROOT_DIR/dist/captions-helper"
HELPER_SCRIPTS_DIR="$ROOT_DIR/helper/scripts"
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/Captions"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/com.ivan.captions-helper.plist"
APP_SUPPORT_DIR="${CAPTIONS_APP_SUPPORT_DIR:-$HOME/Library/Application Support/Captions}"
HELPER_INSTALL_DIR="$APP_SUPPORT_DIR/bin"
HELPER_INSTALL_PATH="$HELPER_INSTALL_DIR/captions-helper"

if [[ ! -x "$HELPER_BIN" ]]; then
  echo "Helper binary not found. Run installer/build_helper.sh first."
  exit 1
fi

mkdir -p "$HELPER_INSTALL_DIR" "$CEP_DIR" "$LAUNCH_AGENTS_DIR" "$APP_SUPPORT_DIR/scripts"
cp "$HELPER_BIN" "$HELPER_INSTALL_PATH"
chmod +x "$HELPER_INSTALL_PATH"

if [[ -d "$HELPER_SCRIPTS_DIR" ]]; then
  rm -rf "$APP_SUPPORT_DIR/scripts"
  mkdir -p "$APP_SUPPORT_DIR/scripts"
  cp -R "$HELPER_SCRIPTS_DIR"/. "$APP_SUPPORT_DIR/scripts/"
fi

rm -rf "$CEP_DIR"
cp -R "$PANEL_SRC" "$CEP_DIR"

MODELS_DIR="${CAPTIONS_MODELS_DIR:-$HOME/Library/Application Support/Captions-Standalone/models}"
FFMPEG_PATH="${CAPTIONS_FFMPEG_PATH:-/opt/homebrew/bin/ffmpeg}"
WHISPER_CLI_PATH="${CAPTIONS_WHISPER_CLI:-/opt/homebrew/bin/whisper-cli}"
WHISPERX_PYTHON_PATH="${CAPTIONS_WHISPERX_PYTHON:-$APP_SUPPORT_DIR/whisperx-venv/bin/python}"
WHISPERX_RUNNER_PATH="${CAPTIONS_WHISPERX_RUNNER:-$APP_SUPPORT_DIR/scripts/whisperx_runner.py}"
MODEL_CACHE_DIR="${CAPTIONS_MODEL_CACHE_DIR:-$APP_SUPPORT_DIR/model-cache}"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ivan.captions-helper</string>
  <key>ProgramArguments</key>
  <array>
    <string>$HELPER_INSTALL_PATH</string>
    <string>-addr</string>
    <string>127.0.0.1:17777</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>CAPTIONS_APP_SUPPORT_DIR</key>
    <string>$APP_SUPPORT_DIR</string>
    <key>CAPTIONS_MODELS_DIR</key>
    <string>$MODELS_DIR</string>
    <key>CAPTIONS_FFMPEG_PATH</key>
    <string>$FFMPEG_PATH</string>
    <key>CAPTIONS_MODEL_CACHE_DIR</key>
    <string>$MODEL_CACHE_DIR</string>
    <key>CAPTIONS_WHISPER_CLI</key>
    <string>$WHISPER_CLI_PATH</string>
    <key>CAPTIONS_WHISPERX_PYTHON</key>
    <string>$WHISPERX_PYTHON_PATH</string>
    <key>CAPTIONS_WHISPERX_RUNNER</key>
    <string>$WHISPERX_RUNNER_PATH</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Application Support/Captions/helper.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Application Support/Captions/helper.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$UID" "$PLIST_PATH" >/dev/null 2>&1 || launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID" "$PLIST_PATH" >/dev/null 2>&1 || launchctl load -w "$PLIST_PATH"
launchctl kickstart -k "gui/$UID/com.ivan.captions-helper" >/dev/null 2>&1 || true

echo "Installed panel to: $CEP_DIR"
echo "Installed helper to: $HELPER_INSTALL_PATH"
echo "Installed helper scripts to: $APP_SUPPORT_DIR/scripts"
echo "Installed launch agent: $PLIST_PATH"
echo "Enable CEP debug mode if needed: defaults write com.adobe.CSXS.11 PlayerDebugMode 1"

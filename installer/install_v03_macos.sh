#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PANEL_SRC="$ROOT_DIR/panel/CaptionsV03"
HELPER_BIN="$ROOT_DIR/dist/captions-helper"
HELPER_SCRIPTS_DIR="$ROOT_DIR/helper/scripts"
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/CaptionsV03"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
APP_SUPPORT_DIR="${CAPTIONS_APP_SUPPORT_DIR:-$HOME/Library/Application Support/Captions}"
HELPER_INSTALL_DIR="$APP_SUPPORT_DIR/bin"
HELPER_INSTALL_PATH="$HELPER_INSTALL_DIR/captions-helper"
PLIST_PATH="$HOME/Library/LaunchAgents/com.ivan.captions-helper.plist"
MODELS_DIR="${CAPTIONS_MODELS_DIR:-$APP_SUPPORT_DIR/models}"
FFMPEG_PATH="${CAPTIONS_FFMPEG_PATH:-/opt/homebrew/bin/ffmpeg}"
WHISPER_CLI_PATH="${CAPTIONS_WHISPER_CLI:-/opt/homebrew/bin/whisper-cli}"
WHISPERX_PYTHON_PATH="${CAPTIONS_WHISPERX_PYTHON:-$APP_SUPPORT_DIR/whisperx-venv/bin/python}"
WHISPERX_RUNNER_PATH="${CAPTIONS_WHISPERX_RUNNER:-$APP_SUPPORT_DIR/scripts/whisperx_runner.py}"
MODEL_CACHE_DIR="${CAPTIONS_MODEL_CACHE_DIR:-$APP_SUPPORT_DIR/model-cache}"
DEFAULT_MODEL="${CAPTIONS_DEFAULT_MODEL:-large-v3}"

if [[ ! -d "$PANEL_SRC" ]]; then
  echo "Captions v03 panel not found: $PANEL_SRC"
  exit 1
fi

if [[ ! -x "$HELPER_BIN" ]]; then
  echo "Captions helper not found: $HELPER_BIN"
  echo "Build it first with: bash installer/build_helper.sh"
  exit 1
fi

install_homebrew_package_if_missing() {
  local command_name="$1"
  local package_name="$2"

  if command -v "$command_name" >/dev/null 2>&1 || [[ -x "/opt/homebrew/bin/$command_name" ]] || [[ -x "/usr/local/bin/$command_name" ]]; then
    return
  fi

  if ! command -v brew >/dev/null 2>&1; then
    echo "$command_name is missing and Homebrew is not installed."
    echo "Install Homebrew from https://brew.sh, then run this installer again."
    exit 1
  fi

  echo "Installing $package_name..."
  brew install "$package_name"
}

download_model_if_missing() {
  local model_id="$1"
  local file_name=""
  local url=""

  case "$model_id" in
    large-v3)
      file_name="ggml-large-v3.bin"
      url="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin"
      ;;
    medium.en)
      file_name="ggml-medium.en.bin"
      url="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin"
      ;;
    *)
      echo "Unknown model: $model_id"
      exit 1
      ;;
  esac

  mkdir -p "$MODELS_DIR"
  if [[ -f "$MODELS_DIR/$file_name" ]]; then
    return
  fi

  echo "Downloading Whisper model $model_id..."
  echo "Destination: $MODELS_DIR/$file_name"
  curl -L --fail --progress-bar "$url" -o "$MODELS_DIR/$file_name"
}

install_homebrew_package_if_missing "ffmpeg" "ffmpeg"
install_homebrew_package_if_missing "whisper-cli" "whisper-cpp"
download_model_if_missing "$DEFAULT_MODEL"

rm -rf "$CEP_DIR"
mkdir -p "$(dirname "$CEP_DIR")"
cp -R "$PANEL_SRC" "$CEP_DIR"

mkdir -p "$HELPER_INSTALL_DIR" "$APP_SUPPORT_DIR/scripts" "$LAUNCH_AGENTS_DIR" "$MODEL_CACHE_DIR"
launchctl bootout "gui/$UID" "$PLIST_PATH" >/dev/null 2>&1 || true
cp "$HELPER_BIN" "$HELPER_INSTALL_PATH"
chmod +x "$HELPER_INSTALL_PATH"

if [[ -d "$HELPER_SCRIPTS_DIR" ]]; then
  rm -rf "$APP_SUPPORT_DIR/scripts"
  mkdir -p "$APP_SUPPORT_DIR/scripts"
  cp -R "$HELPER_SCRIPTS_DIR"/. "$APP_SUPPORT_DIR/scripts/"
fi

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
  <string>$APP_SUPPORT_DIR/helper.log</string>
  <key>StandardErrorPath</key>
  <string>$APP_SUPPORT_DIR/helper.log</string>
</dict>
</plist>
EOF

launchctl bootstrap "gui/$UID" "$PLIST_PATH" >/dev/null 2>&1 || launchctl load -w "$PLIST_PATH"
launchctl kickstart -k "gui/$UID/com.ivan.captions-helper" >/dev/null 2>&1 || true

for version in 7 8 9 10 11 12; do
  defaults write "com.adobe.CSXS.${version}" PlayerDebugMode 1 >/dev/null 2>&1 || true
done

echo "Installed Captions v03 panel to: $CEP_DIR"
echo "Installed Captions helper to: $HELPER_INSTALL_PATH"
echo "Installed helper scripts to: $APP_SUPPORT_DIR/scripts"
echo "Installed launch agent: $PLIST_PATH"
echo "Models directory: $MODELS_DIR"

# Captions v03

Captions v03 is an After Effects CEP panel for creating editable subtitles with local Whisper transcription.

![Captions v03 panel](docs/captions-v03-panel.png)

## Features

- Local transcription through `whisper-cli`.
- Precision mode through WhisperX forced alignment.
- One, two, three, custom, sentence, and smart split modes.
- Manual transcript editor before burning text into After Effects.
- Native editable AE text layers.
- Built-in visual caption style presets.
- Optional separated JSON export for ReelScript workflows.

## Install on macOS

Download `CaptionsV03-mac.zip` from the latest release, unzip it, then run:

```bash
./install.command
```

The installer copies the panel to:

```text
~/Library/Application Support/Adobe/CEP/extensions/CaptionsV03
```

It installs the helper service at:

```text
~/Library/Application Support/Captions/bin/captions-helper
```

The first install can take a while. It may install Homebrew packages and download the default Whisper model.

## What the installer prepares

- `ffmpeg`, if missing and Homebrew is available.
- `whisper-cli`, through Homebrew `whisper-cpp`, if missing.
- A default `large-v3` whisper.cpp model in:

```text
~/Library/Application Support/Captions/models
```

- A launch agent named `com.ivan.captions-helper`.
- CEP debug mode for local unsigned panels.

## Use

1. Restart After Effects after installing.
2. Open `Window > Extensions > Captions v03`.
3. Confirm the panel says `Helper ready`.
4. Choose model and language.
5. Click `Transcribe`.
6. Edit the transcript rhythm if needed.
7. Choose a style.
8. Click `Burn Text`.

## Precision mode

Precision mode uses WhisperX. To install the precision backend after the main install:

```bash
bash installer/setup_precision_backend.sh
```

Then restart the helper service or run the installer again.

## Build from source

```bash
bash installer/build_helper.sh
bash installer/install_v03_macos.sh
```

## Package a release

```bash
npm run check
npm run package
```

The release zip is created at:

```text
releases/CaptionsV03-mac.zip
```

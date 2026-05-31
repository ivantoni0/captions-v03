#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HELPER_DIR="$ROOT_DIR/helper"
DIST_DIR="$ROOT_DIR/dist"

mkdir -p "$DIST_DIR"

echo "Building captions-helper..."
cd "$HELPER_DIR"
go build -o "$DIST_DIR/captions-helper" ./cmd/captions-helper

echo "Built: $DIST_DIR/captions-helper"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUNNER_DIR="$ROOT_DIR/scripts/.smoke-runner"
RUNNER_NODE_MODULES="$RUNNER_DIR/node_modules"
PLAYWRIGHT_PKG_DIR="$RUNNER_NODE_MODULES/playwright"
SCRIPT_NODE_MODULES_LINK="$ROOT_DIR/scripts/node_modules"
CREATED_LINK=0

cleanup() {
  if [[ "$CREATED_LINK" == "1" && -L "$SCRIPT_NODE_MODULES_LINK" ]]; then
    rm -f "$SCRIPT_NODE_MODULES_LINK"
  fi
}
trap cleanup EXIT

if [[ ! -d "$PLAYWRIGHT_PKG_DIR" ]]; then
  mkdir -p "$RUNNER_DIR"
  npm install --prefix "$RUNNER_DIR" --no-save playwright >/dev/null
fi

if [[ ! -e "$SCRIPT_NODE_MODULES_LINK" ]]; then
  ln -s "$RUNNER_NODE_MODULES" "$SCRIPT_NODE_MODULES_LINK"
  CREATED_LINK=1
fi

node scripts/smoke_key_pages.mjs "$@"

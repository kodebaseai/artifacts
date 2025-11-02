#!/bin/bash

# kb-quality.sh - Runs all quality gates (tests, lint, types, build)
# Usage: kb-quality.sh [--watch]
# Optional --watch passes --watch to tests.

set -euo pipefail

WATCH_MODE=false
if [[ $# -gt 0 && "$1" == "--watch" ]]; then
  WATCH_MODE=true
fi

print_banner() {
  echo "============================="
  echo "📊  Running quality gates..."
  echo "============================="
}

run_cmd() {
  local desc="$1"
  shift
  echo "▶️  $desc"
  if ! "$@"; then
    echo "❌  $desc failed" >&2
    exit 1
  fi
}

print_banner

if [ "$WATCH_MODE" = true ]; then
  run_cmd "Tests (watch)" pnpm test:projects:watch
else
  run_cmd "Tests" pnpm test
fi
run_cmd "Lint" pnpm lint
run_cmd "Type-check" pnpm check-types
run_cmd "Build" pnpm build

echo "✅  All quality gates passed"

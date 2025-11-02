#!/bin/bash

# kb-ctx.sh - Unified context generator for the Kodebase phase-based workflow
# Usage: kb-ctx.sh <ISSUE_ID> [--phase=<ictx|prework|impl|qa|review>] [--minimal|--extended|--json]
# Falls back to --phase=ictx when omitted for backwards compatibility.

set -euo pipefail

PHASE="ictx"
ISSUE_ID=""
EXTRA_ARGS=()

for arg in "$@"; do
  case $arg in
    --phase=*)
      PHASE="${arg#*=}"
      shift ;; # remove from $@
    --minimal|--extended|--json)
      EXTRA_ARGS+=("$arg")
      shift ;;
    --help)
      echo "Usage: $0 <ISSUE_ID> [--phase=<ictx|prework|impl|qa|review>] [--minimal|--extended|--json]"
      exit 0 ;;
    -*)
      echo "Error: unknown option $arg" >&2
      exit 1 ;;
    *)
      if [[ -z "$ISSUE_ID" ]]; then
        ISSUE_ID="$arg"
      else
        EXTRA_ARGS+=("$arg")
      fi
      shift ;;
  esac
done

if [[ -z "$ISSUE_ID" ]]; then
  echo "Error: ISSUE_ID is required" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$PHASE" in
  ictx)
    TARGET_SCRIPT="${SCRIPT_DIR}/get-issue-context.sh" ;;
  prework)
    TARGET_SCRIPT="${SCRIPT_DIR}/get-prework-context.sh" ;;
  impl)
    TARGET_SCRIPT="${SCRIPT_DIR}/get-implementation-context.sh" ;;
  qa)
    TARGET_SCRIPT="${SCRIPT_DIR}/get-qa-context.sh" ;;
  review)
    TARGET_SCRIPT="${SCRIPT_DIR}/get-pr-context.sh" ;;
  *)
    echo "Error: Invalid phase '$PHASE'. Valid values are ictx, prework, impl, qa, review." >&2
    exit 1 ;;
esac

# Execute the underlying script, forwarding extra args only if present (avoid nounset error)
if [ ${#EXTRA_ARGS[@]} -eq 0 ]; then
  bash "$TARGET_SCRIPT" "$ISSUE_ID"
else
  bash "$TARGET_SCRIPT" "$ISSUE_ID" "${EXTRA_ARGS[@]}"
fi

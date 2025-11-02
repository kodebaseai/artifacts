#!/bin/bash
# artifact-add-event.sh - Append an event entry to an artifact YAML
# Usage: artifact-add-event.sh <ISSUE_ID> <event_type> [trigger]
# Requires 'yq' CLI (https://github.com/mikefarah/yq).

set -euo pipefail

# Validate args
if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <ISSUE_ID> <event_type> [trigger]" >&2
  exit 1
fi

ISSUE_ID="$1"
EVENT_TYPE="$2"
# Optional trigger override
TRIGGER_OVERRIDE="${3:-}"

if [[ ! "$ISSUE_ID" =~ ^[A-Z]+(\.[0-9]+)*$ ]]; then
  echo "Error: Invalid ISSUE_ID format" >&2
  exit 1
fi

ARTIFACT_FILE=$(find .kodebase/artifacts -name "${ISSUE_ID}*.yml" -type f | head -1)
if [[ -z "$ARTIFACT_FILE" ]]; then
  echo "Error: Artifact file not found for $ISSUE_ID" >&2
  exit 1
fi

if ! command -v yq &>/dev/null; then
  echo "Error: 'yq' command not found. Please install yq (https://github.com/mikefarah/yq)" >&2
  exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ACTOR_NAME=$(git config user.name || echo "Unknown")
ACTOR_EMAIL=$(git config user.email || echo "unknown@example.com")
ACTOR="${ACTOR_NAME} (${ACTOR_EMAIL})"

# Determine default trigger based on event type
determine_trigger() {
  local event_type="${1:-}"
  case "$event_type" in
    draft) echo "artifact_created" ;;
    blocked) echo "has_dependencies" ;;
    ready) echo "dependencies_met" ;;
    in_progress) echo "branch_created" ;;
    in_review) echo "pr_created" ;;
    completed) echo "pr_merged" ;;
    cancelled) echo "cancelled" ;;
    archived) echo "archived" ;;
    *) echo "manual" ;;
  esac
}

TRIGGER="${TRIGGER_OVERRIDE:-$(determine_trigger "$EVENT_TYPE")}"

# Use yq to append event with simplified schema
CMD=".metadata.events += [{\"event\":\"${EVENT_TYPE}\",\"timestamp\":\"${TIMESTAMP}\",\"actor\":\"${ACTOR}\",\"trigger\":\"${TRIGGER}\"}]"

yq -i "$CMD" "$ARTIFACT_FILE"

echo "✅  Added '${EVENT_TYPE}' event to $ARTIFACT_FILE (trigger=${TRIGGER})"

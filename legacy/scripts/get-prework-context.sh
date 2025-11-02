#!/bin/bash

# get-prework-context.sh - Pre-Work Setup & Validation Phase (Clean Version)
# Provides context and guidelines for preparing to work on an issue

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Parse arguments
ISSUE_ID=""
CONTEXT_LEVEL="full"
JSON_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --minimal) CONTEXT_LEVEL="minimal"; shift ;;
        --extended) CONTEXT_LEVEL="extended"; shift ;;
        --json) JSON_MODE=true; shift ;;
        --help) echo "Usage: $0 <issue-id> [--minimal|--extended|--json]"; exit 0 ;;
        -*) echo "Error: Unknown option $1" >&2; exit 1 ;;
        *) ISSUE_ID="$1"; shift ;;
    esac
done

if [[ -z "$ISSUE_ID" ]]; then
    echo "Error: Issue ID is required" >&2
    exit 1
fi

if [[ ! "$ISSUE_ID" =~ ^[A-Z]+(\.[0-9]+)*$ ]]; then
    echo "Error: Invalid issue ID format. Expected format: A.1.5" >&2
    exit 1
fi

# Find issue file
ISSUE_FILE=$(find .kodebase/artifacts -name "${ISSUE_ID}*.yml" -type f | head -1)
if [[ -z "$ISSUE_FILE" ]]; then
    echo "Error: Issue file not found for ${ISSUE_ID}" >&2
    exit 1
fi

# Extract issue info
ISSUE_TITLE=$(grep "title:" "$ISSUE_FILE" | head -1 | sed 's/.*title: //' | tr -d '"')
ISSUE_STATUS=$(grep -E "^\s*-\s+event:" "$ISSUE_FILE" | tail -1 | sed 's/^\s*-\s*event:\s*//')

# Individual output functions
print_header() {
    echo "# Kodebase Pre-Work Context"
    echo
    echo "Pre-Work Setup & Validation Phase for issue: ${ISSUE_ID}"
    echo
    echo "✓ Expected Output: Ready to implement with clear requirements, established git workflow, and proper development setup"
    echo
}

print_phase_guidelines() {
    echo "## Pre-Work Phase Guidelines"
    echo
    # concise emojis instead of ALL CAPS
    echo "### 🎯 Objective: Prepare for Implementation"
    echo "⚠️  Follow the checklist below before writing code."
    echo
    echo "**Validation Checkpoints:**"
    echo "- Can you explain the issue requirements in your own words?"
    echo "- Is git workflow established (branch, artifact event, draft PR)?"
    echo "- Are all dependencies resolved?"
    echo
    echo "**References:**"
    echo "- Acceptance criteria & mandatory docs: see Start Context (ictx phase)"
    echo
    echo "### 📋 Ready to Proceed? (add these as TODOs):"
    echo
    echo "- [ ] Create Branch: Run \`git checkout -b ISSUE_ID\`"
    echo "- [ ] Get the Author information from git.config name and email"
    echo "- [ ] Get the current timestamp (use date now)"
    echo "- [ ] Generate a new event_id: \`evt_<hash>\`"
    echo "- [ ] Check eventsMetadataSchema: @packages/core/src/data/schemas/base.ts#L49-64"
    echo "- [ ] Update Artifact metadata.events: add \`in_progress\` event (timestamp, actor, event_id, and metadata)"
    echo "- [ ] Push Branch: \`git push -u origin ISSUE_ID\`"
    echo "- [ ] Create Draft PR: \`gh pr create --title \"ISSUE_ID: Work Started\" --body \"Draft PR for ISSUE_ID\" --draft\`"
    echo "- [ ] Plan: outline implementation approach and confirm"
    echo "- [ ] Request Authorization to start the next phase: Run 'pnpm ctx \$issue_id --phase=impl' and await for approval"
}

print_extended_references() {
    if [ "$CONTEXT_LEVEL" = "extended" ]; then
        echo
        echo "### Extended References"
        echo "- [ ] **Agent Guidelines**: @.kodebase/docs/for-agents/ - Implementation guidelines and tooling"
        echo "- [ ] **Artifact Schema**: @packages/core/src/data/schemas/artifacts.ts - Required for correct artifact updates"
        echo "- [ ] **Methodology Docs**: @.kodebase/docs/for-agents/methodology/overview.md - Methodology guidelines and tooling"
        echo "- [ ] **Testing Guidelines**: @.kodebase/docs/for-agents/guidelines/testing-guidelines.mdc - Testing approaches"
    fi
}

print_footer() {
    echo
    echo "---"
    echo
    echo "📋 Ready to Proceed?"
    echo "Once you've completed all checkpoints above, proceed to Implementation Phase:"
    echo "\`pnpm ctx ${ISSUE_ID} --phase=impl\`"
    echo
    echo "✓ Pre-work context generated successfully"
}

# Generate complete content
generate_content() {
    print_header
    print_phase_guidelines
    print_extended_references
    print_footer
}

# JSON output block
if [ "$JSON_MODE" = true ]; then
    cat <<EOF
{
    "phase": "prework",
    "todo": [
        {"id": "pw1", "content": "Create Branch: Run git checkout -b $ISSUE_ID"},
        {"id": "pw2", "content": "Get the Author information from git.config name and email"},
        {"id": "pw3", "content": "Get the current timestamp (use date now)"},
        {"id": "pw4", "content": "Generate a new event_id: evt_<hash>"},
        {"id": "pw5", "content": "Check eventsMetadataSchema: @packages/core/src/data/schemas/base.ts#L49-64"},
        {"id": "pw6", "content": "Update Artifact metadata.events: add in_progress event (timestamp, actor, event_id, and metadata)"},
        {"id": "pw7", "content": "Push Branch: git push -u origin $ISSUE_ID"},
        {"id": "pw8", "content": "Create Draft PR: gh pr create --title \"$ISSUE_ID: Work Started\" --body \"Draft PR for $ISSUE_ID\" --draft"},
        {"id": "pw9", "content": "Plan: outline implementation approach and confirm"},
        {"id": "pw10", "content": "Request Authorization to start the next phase: Run pnpm ctx $ISSUE_ID --phase=impl and await for approval"}
    ]
}
EOF
    exit 0
fi

# Main execution
main() {
    # Generate content once
    local content
    content=$(generate_content)

    # Display with colors
    echo "$content" | while IFS= read -r line; do
        if [[ "$line" =~ ^#[[:space:]] ]]; then
            print_color $BLUE "$line"
        elif [[ "$line" =~ ^Pre-Work.*Phase ]]; then
            print_color $YELLOW "$line"
        elif [[ "$line" =~ ^✓ ]]; then
            print_color $GREEN "$line"
        else
            echo "$line"
        fi
    done

    # Copy to clipboard on macOS (same content, no duplication)
    if command -v pbcopy &> /dev/null; then
        echo "$content" | pbcopy
        print_color $GREEN "✓ Context copied to clipboard"
    fi
}

# Run main function
main

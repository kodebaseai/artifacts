#!/bin/bash

# get-implementation-context.sh - Implementation Phase
# Provides context and guidelines for implementing the issue

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

while [[ $# -gt 0 ]]; do
    case $1 in
        --minimal) CONTEXT_LEVEL="minimal"; shift ;;
        --extended) CONTEXT_LEVEL="extended"; shift ;;
        --help) echo "Usage: $0 <issue-id> [--minimal|--extended]"; exit 0 ;;
        -*) echo "Error: Unknown option $1" >&2; exit 1 ;;
        *) ISSUE_ID="$1"; shift ;;
    esac
done

if [[ -z "$ISSUE_ID" ]]; then
    echo "Error: Issue ID is required" >&2
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
    echo "# Kodebase Implementation Context"
    echo
    echo "Implementation Phase for issue: ${ISSUE_ID}"
    echo
    echo "✓ Expected Output: Working solution with all acceptance criteria met, linting, types and tests passing, Documentation updated and code ready for review"
    echo
}

print_phase_guidelines() {
    echo "## Implementation Phase Guidelines"
    echo
    echo "### 🎯 Objective: Deliver the Solution"
    echo "⚠️  Meet every acceptance criterion and keep quality gates green."
    echo
    # RACI table
    echo "#### RACI Snapshot"
    echo "| Step | Responsible | Accountable |"
    echo "|------|-------------|-------------|"
    echo "| Code changes | Dev/Agent | Tech Lead |"
    echo "| Commit & push | Dev/Agent | Dev/Agent |"
    echo "| PR reviews | Reviewer | Tech Lead |"
    echo
    echo "### 📋 Checklist (add these as TODOs):"
    echo "- [ ] Acknolodge that you need to commit once per acceptance criterion"
    echo "- [ ] Acknolodge that you need to run \`pnpm quality\` before each commit"
    echo "- [ ] Acknolodge that you need to follow existing patterns and conventions"
    echo "- [ ] Acknolodge that you need to maintain strict TypeScript typing"
    echo "- [ ] Acknolodge that you need to write tests for complex logic"
    echo "- [ ] Acknolodge that you need to document architectural decisions near the code"
    echo "- [ ] Complete the checklist below, one by one"
    awk '/^  acceptance_criteria:/{flag=1; next} /^  [a-zA-Z_]+:/{flag=0} flag && /^    -/{gsub(/^    - /, ""); print "- [ ] " $0}' "$ISSUE_FILE"
    echo "- [ ] Request Authorization to start the next phase: Run 'pnpm ctx \$issue_id --phase=qa' and await for approval"
}

print_extended_references() {
    if [ "$CONTEXT_LEVEL" = "extended" ]; then
        echo
        echo "### Extended References"
        echo "- [ ] **Constitution**: @AGENTIC_CONSTITUTION.mdc - Implementation rules and constraints"
        echo "- [ ] **Testing Guidelines**: @.kodebase/docs/for-agents/guidelines/testing-guidelines.mdc - Testing approaches"
        echo "- [ ] **Agent Guidelines**: @.kodebase/docs/for-agents/ - Implementation guidance and tooling"
        echo "- [ ] **Artifact Schema**: @packages/core/src/data/schemas/artifacts.ts - Schema for data structures"
    fi
}

print_footer() {
    echo
    echo "---"
    echo
    echo "📋 Ready for Quality Assurance?"
    echo "Once implementation is complete, proceed to Quality Assurance Phase:"
    echo "\`pnpm ctx ${ISSUE_ID} --phase=qa\`"
    echo
    echo "✓ Implementation context generated successfully"
}

# Generate complete content
generate_content() {
    print_header
    print_phase_guidelines
    print_extended_references
    print_footer
}

# Main execution
main() {
    # Generate content once
    local content
    content=$(generate_content)

    # Display with colors
    echo "$content" | while IFS= read -r line; do
        if [[ "$line" =~ ^#[[:space:]] ]]; then
            print_color $BLUE "$line"
        elif [[ "$line" =~ ^Implementation.*Phase ]]; then
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

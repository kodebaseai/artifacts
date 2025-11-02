#!/bin/bash

# get-qa-context.sh - Quality Assurance & Submission Phase
# Provides context and guidelines for completing and submitting the issue

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
    echo "# Kodebase Quality Assurance & Submission Context"
    echo
    echo "Quality Assurance & Submission Phase for issue: ${ISSUE_ID}"
    echo
    echo "✓ Expected Output: Completed issue with all quality gates passing, artifact insights captured, and PR ready for review"
    echo
}

print_phase_guidelines() {
    echo "## Quality Assurance & Submission Phase Guidelines"
    echo
    echo "### Objective: Complete and Submit the Work - FUNDAMENTAL TO FOLLOW THESE GUIDELINES TO PROCEED!"
    echo "### IMPORTANT: This is a fundamental step to ensure you are ready to start the review process. Please follow these guidelines to the letter."
    echo
    echo "**Completion Insights to Capture:**"
    echo "- **Key Insights**: What did you learn during implementation?"
    echo "- **Architecture Decisions**: What choices did you make and why?"
    echo "- **Challenges**: What problems did you encounter and how did you solve them? (Touple Challenge: Solution)"
    echo "- **Implementation Approach**: How did you build the solution?"
    echo "- **Knowledge Generated**: What understanding did you gain?"
    echo "- **Files Created**: List new files and their purposes"
    echo "- **Integration Points**: How does this integrate with existing systems?"
    echo
    echo "**Validation Checkpoints:**"
    echo "- Are ALL acceptance criteria met and verifiable?"
    echo "- Do all quality gates pass without warnings?"
    echo "- Are completion insights captured in artifact?"
    echo "- Is PR description generated from artifact data?"
    echo "- Is issue marked in_review and PR ready for review?"
    echo
    echo "**Freedom Within Guidelines:**"
    echo "- Choose how to capture and organize completion insights"
    echo "- Decide on the depth of documentation"
    echo "- Select what architectural decisions to highlight"
    echo "- Organize PR description for maximum clarity"
    echo
    echo "**Available Tools:**"
    echo "- \`pnpm prctx ISSUE_ID\` - Extract artifact data for PR description"
    echo "- \`pnpm cpr ISSUE_ID\` - Mark for review (adds in_review event + PR ready)"
    echo "- \`pnpm complete ISSUE_ID\` - Complete issue after PR merge"
    echo
    echo "### Create a TODO list with the following tasks:"
    echo
    echo "- [ ] Run Quality Gates: \`pnpm quality\` (Run from project root, ALL must pass)"
    echo "- [ ] Read Artifact Schema: @packages/core/src/data/schemas/artifacts.ts"
    echo "- [ ] Update Artifact: Add development_process: implementation_approach, alternatives_considered, challenges_encountered"
    echo "- [ ] Update Artifact: Add completion_analysis: key_insights, implementation_approach, knowledge_generated, manual_testing_steps"
    echo "- [ ] Obtain generated PR Context Guidelines: Run \`pnpm prctx ISSUE_ID\` for artifact-driven description"
    echo "- [ ] Update PR Description: Use artifact data as single source of truth"
    echo "- [ ] Mark for Review: Run \`pnpm cpr ISSUE_ID\` (adds in_review event + PR ready)"
}

print_completion_workflow() {
    echo
    echo "## Completion Workflow"
    echo
    echo "1. **Update Artifact**: Add completion_analysis and development_process insights"
    echo "2. **Generate PR Context**: \`pnpm prctx ${ISSUE_ID}\` - Get comprehensive PR context guidelines"
    echo "3. **Update PR Description**: Use artifact data to create dynamic PR description"
    echo "5. **Verify**: Confirm all quality gates pass and PR is ready for review"
    echo "4. **Mark for Review**: \`pnpm cpr ${ISSUE_ID}\` - Add in_review event and mark PR ready"
}

print_extended_references() {
    if [ "$CONTEXT_LEVEL" = "extended" ]; then
        echo
        echo "### Extended References"
        echo "- [ ] **Constitution**: @AGENTIC_CONSTITUTION.mdc - Implementation rules and constraints"
        echo "- [ ] **Methodology**: @AGENTIC_KODEBASE_METHODOLOGY.mdc - Development process details"
        echo "- [ ] **Agent Guidelines**: @.kodebase/docs/for-agents/ - Implementation guidance and tooling"
        echo "- [ ] **Artifact Schema**: @packages/core/src/data/schemas/artifacts.ts - Schema for completion data"
    fi
}

print_footer() {
    echo
    echo "---"
    echo
    echo "📋 Ready for Review?"
    echo "Once all steps are complete, your issue will be marked for review and PR will be ready!"
    echo
    echo "✓ Quality assurance context generated successfully"
}

# Generate complete content
generate_content() {
    print_header
    print_phase_guidelines
    print_completion_workflow
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
        elif [[ "$line" =~ ^Quality.*Phase ]]; then
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

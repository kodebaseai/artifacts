#!/bin/bash

# get-issue-context.sh (ictx) - Agent "Start Button"
# Purpose: Prime AI agents with everything needed to follow Kodebase methodology
# Usage: pnpm ictx A.1.5 [OPTIONS]
#
# This script is the definitive "start button" for AI agents working on Kodebase issues.
# It provides focused context to ensure agents follow the methodology correctly.
#
# Options:
#   --minimal: Essential context only (default)
#   --full: Add milestone/initiative context
#   --extended: Add schema/architecture context
# Automatically copies to clipboard on macOS

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
CONTEXT_LEVEL="minimal"

while [[ $# -gt 0 ]]; do
    case $1 in
        --minimal) CONTEXT_LEVEL="minimal"; shift ;;
        --full) CONTEXT_LEVEL="full"; shift ;;
        --extended) CONTEXT_LEVEL="extended"; shift ;;
        --help) echo "Usage: $0 <issue-id> [--minimal|--full|--extended]"; exit 0 ;;
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

ARTIFACTS_DIR=".kodebase/artifacts"

# Function to extract current status from artifact
get_artifact_status() {
    local file="$1"
    # Get the last event from the events section
    grep -A 1 "event:" "$file" | tail -2 | grep "event:" | awk '{print $2}'
}

# Function to extract dependencies
extract_dependencies() {
    local file="$1"
    local dep_type="$2"  # blocked_by or blocks

    # Extract dependencies, handling both empty and populated arrays
    awk "/^  $dep_type:/ {
        if (\$0 ~ /\\[\\]/) {
            print \"none\"
        } else {
            in_array = 1
            next
        }
    }
    in_array && /^    - / {
        gsub(/^    - /, \"\")
        print
    }
    in_array && /^  [^ ]/ {
        in_array = 0
    }" "$file"
}

# Find files function
find_issue_files() {
    local issue_id="$1"
    local initiative_id milestone_id

    IFS='.' read -r initiative_id milestone_num issue_num <<< "$issue_id"
    milestone_id="${initiative_id}.${milestone_num}"

    # Find initiative directory
    local initiative_dirs
    initiative_dirs=$(find "$ARTIFACTS_DIR" -type d -name "${initiative_id}.*" 2>/dev/null)
    if [ -z "$initiative_dirs" ]; then
        echo "Error: Initiative $initiative_id not found" >&2
        return 1
    fi

    INITIATIVE_DIR=$(echo "$initiative_dirs" | head -n 1)

    # Find milestone directory
    local milestone_dirs
    milestone_dirs=$(find "$INITIATIVE_DIR" -type d -name "${milestone_id}.*" 2>/dev/null)
    if [ -z "$milestone_dirs" ]; then
        echo "Error: Milestone $milestone_id not found" >&2
        return 1
    fi

    MILESTONE_DIR=$(echo "$milestone_dirs" | head -n 1)

    # Find issue file
    ISSUE_FILE=$(find "$MILESTONE_DIR" -name "${issue_id}.*.yml" 2>/dev/null | head -n 1)
    if [ -z "$ISSUE_FILE" ] || [ ! -f "$ISSUE_FILE" ]; then
        echo "Error: Issue file for $issue_id not found" >&2
        return 1
    fi

    # Find milestone file
    MILESTONE_FILE=$(find "$MILESTONE_DIR" -name "${milestone_id}.yml" 2>/dev/null | head -n 1)
    if [ -z "$MILESTONE_FILE" ] || [ ! -f "$MILESTONE_FILE" ]; then
        MILESTONE_FILE=$(find "$MILESTONE_DIR" -maxdepth 1 -name "*.yml" | grep -E "${milestone_id}(\.yml|[^/]*\.yml)$" | head -n 1)
    fi

    # Find initiative file
    INITIATIVE_FILE=$(find "$INITIATIVE_DIR" -maxdepth 1 -name "${initiative_id}.yml" 2>/dev/null | head -n 1)
    if [ -z "$INITIATIVE_FILE" ] || [ ! -f "$INITIATIVE_FILE" ]; then
        INITIATIVE_FILE=$(find "$INITIATIVE_DIR" -maxdepth 1 -name "*.yml" | grep -v "/" | head -n 1)
    fi

    return 0
}

# Individual output functions
print_header() {
    echo "# 🤖 Kodebase AI Agent Start Context"
    echo
    echo "## CRITICAL INSTRUCTIONS"
    echo
    echo "**YOU ARE STARTING WORK ON A KODEBASE ISSUE**"
    echo
    echo "**MANDATORY READING** (Read these files immediately):"
    echo "- @AGENTIC_CONSTITUTION.mdc - Core rules and constraints"
    echo "- @AGENTIC_KODEBASE_METHODOLOGY.mdc - Step-by-step process"
    echo "- @AGENTIC_INSTRUCTIONS.mdc - Essential agent guidelines"
    echo
    echo "## ISSUE CONTEXT"
    echo
}

print_issue_details() {
    local issue_id="$1"
    local issue_file="$2"

    echo "### Issue: $issue_id"
    echo

    # Extract essential info
    local issue_title issue_status blocked_by
    issue_title=$(grep "title:" "$issue_file" | head -1 | sed 's/.*title: //' | tr -d '"')
    issue_status=$(get_artifact_status "$issue_file")
    blocked_by=$(extract_dependencies "$issue_file" "blocked_by")

    echo "**Title:** $issue_title"
    echo "**Status:** \`$issue_status\`"
    if [ "$blocked_by" != "none" ]; then
        echo "**⚠️ Blocked by:** $blocked_by"
    fi
    echo

    # Extract summary
    echo "**Summary:**"
    awk '/summary: >/{flag=1; next} /acceptance_criteria:/{flag=0} flag' "$issue_file" | grep -v '^[[:space:]]*$' | sed 's/^[[:space:]]*//'
    echo

    # Add artifact file links
    echo "**Context Artifact Files:**"
    echo "- Issue: @$issue_file"
    echo "- Milestone: @$MILESTONE_FILE"
    echo "- Initiative: @$INITIATIVE_FILE"
    echo
}

print_milestone_context() {
    local milestone_file="$1"
    local milestone_dir="$2"
    local issue_file="$3"

    echo "### Related Issues in Milestone"
    echo
    echo "| Issue ID | Title | Status |"
    echo "|----------|-------|--------|"

    for issue_file_path in "$milestone_dir"/*.yml; do
        if [ -f "$issue_file_path" ] && [ "$issue_file_path" != "$milestone_file" ]; then
            local issue_name issue_id issue_title issue_status
            issue_name=$(basename "$issue_file_path" .yml)
            issue_id=$(echo "$issue_name" | grep -oE "^[A-Z]+\.[0-9]+\.[0-9]+")
            if [ -n "$issue_id" ]; then
                issue_title=$(grep "title:" "$issue_file_path" | head -1 | sed 's/.*title: //' | tr -d '"')
                issue_status=$(get_artifact_status "$issue_file_path")

                if [ "$issue_file_path" = "$issue_file" ]; then
                    echo "| **$issue_id** | **$issue_title** | **$issue_status** |"
                else
                    echo "| $issue_id | $issue_title | $issue_status |"
                fi
            fi
        fi
    done
    echo

    echo "### Milestone Context"
    echo
    local milestone_title
    milestone_title=$(grep "title:" "$milestone_file" | head -1 | sed 's/.*title: //' | tr -d '"')
    echo "**Milestone:** $milestone_title"

    echo "**Deliverables:**"
    awk '/deliverables:/,/^[[:space:]]*[a-z_]+:/ {if(/^[[:space:]]*-/) print}' "$milestone_file" | sed 's/^[[:space:]]*-[[:space:]]*/- /' | head -5
    echo
}

print_initiative_context() {
    local initiative_file="$1"

    echo "### Initiative Context"
    echo
    local initiative_title
    initiative_title=$(grep "title:" "$initiative_file" | head -1 | sed 's/.*title: //' | tr -d '"')
    echo "**Initiative:** $initiative_title"

    echo "**Vision:**"
    awk '/vision: >/{flag=1; next} /^[[:space:]]*[a-z_]+:/{flag=0} flag' "$initiative_file" | grep -v '^[[:space:]]*$' | sed 's/^[[:space:]]*//' | head -3
    echo
}

print_extended_context() {
    local issue_id="$1"
    local issue_file="$2"

    echo "### Schema Information"
    echo
    if [[ "$issue_id" =~ ^[A-Z]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "**Artifact Schemas:**"
        echo "- Main Schema: @packages/core/src/data/schemas/artifacts.ts"
        echo "- Glossary: @.kodebase/docs/GLOSSARY.md"
    fi
    echo

    # Constitutional rules
    local title_and_criteria
    title_and_criteria=$(grep -E "title:|acceptance_criteria:" "$issue_file" | tr '[:upper:]' '[:lower:]')
    echo "### Relevant Constitutional Rules"
    echo

    if echo "$title_and_criteria" | grep -qE "test|testing|coverage|validation"; then
        echo "- **II.5 Acceptance Criteria as Specification**: Every criterion must map to tests"
        echo "- **III.8 Test-Driven Changes**: Use Red-Green-Refactor cycle"
    fi

    if echo "$title_and_criteria" | grep -qE "schema|structure|yaml|format|artifact"; then
        echo "- **II.2 The Law of Shared Language**: All concepts must be defined in GLOSSARY.md"
        echo "- **III.2 No Magic Strings**: All literals must be defined as constants"
    fi

    if echo "$title_and_criteria" | grep -qE "refactor|update|migrate|improve"; then
        echo "- **III.7 Separate Structure from Behavior**: Structural changes in separate commits"
        echo "- **III.1 The Codebase is the Ground Truth**: Follow existing patterns"
    fi

    echo "- **I.1 The MVP is Law**: Only build what's explicitly required"
    echo "- **I.2 Reject Complexity**: Choose the simplest solution"
    echo "- **III.3 Types are Non-Negotiable**: Full TypeScript typing"
    echo

    if echo "$ISSUE_FILE" | grep -qE "(git-ops|core|integration)"; then
        echo "### Architecture Context"
        echo
        echo "**Core Integration Patterns:**"
        echo "- Constitution: @AGENTIC_CONSTITUTION.mdc (Implementation rules)"
        echo "- Methodology: @AGENTIC_KODEBASE_METHODOLOGY.mdc (Development process)"
        echo "- Agent Guidelines: @.kodebase/docs/for-agents/ (Implementation guidance)"
        echo
    fi
}

print_workflow_integration() {
    local issue_id="$1"

    echo "## 🔄 PHASE-BASED WORKFLOW"
    echo
    echo "The Kodebase methodology uses a structured, phase-based approach to ensure consistent quality and proper documentation."
    echo
    echo "### Phase 1: Pre-Work Setup & Validation"
    echo "**Purpose**: Preparation checklist and git workflow setup"
    echo "**Output**: Ready to implement with clear requirements and proper branch setup"
    echo
    echo "### Phase 2: Implementation"
    echo "**Purpose**: Implementation guidelines and acceptance criteria"
    echo "**Output**: Working solution meeting all requirements with proper testing"
    echo
    echo "### Phase 3: Quality Assurance & Submission"
    echo "**Purpose**: Completion checklist and artifact updates"
    echo "**Output**: Completed issue with insights captured and quality gates passed"
    echo
    echo "### Phase 4: Mark for Review"
    echo "**Purpose**: Automated review preparation"
    echo "**Output**: PR marked ready for review with proper artifact events"
    echo
}

print_agent_priming() {
    local issue_id="$1"

    echo "## 🎯 DEVELOPMENT PRINCIPLES"
    echo
    echo "Working within the Kodebase methodology requires following established patterns and constraints."
    echo
    echo "### Core Constraints"
    echo "- **MVP is Law**: Only build what's explicitly required"
    echo "- **Reject Complexity**: Choose the simplest solution"
    echo "- **Local-First**: No cloud/multi-user features"
    echo "- **Types are Non-Negotiable**: Full TypeScript typing"
    echo "- **One Issue, One Branch**: Focused work only"
    echo
    echo "### Implementation Approach"
    echo "1. **Follow the Constitution**: All implementation must align with project rules"
    echo "2. **Use Existing Patterns**: Maintain consistency with current codebase"
    echo "3. **Document Insights**: Capture valuable learnings for future reference"
    echo "4. **Quality First**: Ensure all quality gates pass before completion"
    echo
}

print_start_instructions() {
    local issue_id="$1"

    echo "## 🚀 READY TO START"
    echo
    echo "**IMMEDIATE ACTIONS** - Create a TodoList with the following items:"
    echo "1. **Acknoledge Methodology**: Confirm that you have read and understand the Kodebase methodology"
    echo "2. **Acknoledge Phase Workflow**: Confirm that you have read and understand the phase-based workflow"
    echo "3. **Request Authorization to start the next phase**: Run 'pnpm ctx $issue_id --phase=prework' and await for approval"
}

# Generate complete content
generate_content() {
    local issue_id="$1"
    local context_level="$2"

    print_header
    print_issue_details "$issue_id" "$ISSUE_FILE"

    if [[ "$context_level" == "full" ]] || [[ "$context_level" == "extended" ]]; then
        print_milestone_context "$MILESTONE_FILE" "$MILESTONE_DIR" "$ISSUE_FILE"
        print_initiative_context "$INITIATIVE_FILE"
    fi

    if [[ "$context_level" == "extended" ]]; then
        print_extended_context "$issue_id" "$ISSUE_FILE"
    fi

    print_workflow_integration "$issue_id"
    print_agent_priming "$issue_id"
    print_start_instructions "$issue_id"
}

# Main execution
main() {
    local issue_id="$1"
    local context_level="$2"

    # Find issue files
    if ! find_issue_files "$issue_id"; then
        exit 1
    fi

    # Generate content once
    local content
    content=$(generate_content "$issue_id" "$context_level")

    # Display with colors
    echo "$content" | while IFS= read -r line; do
        if [[ "$line" =~ ^#[[:space:]] ]]; then
            print_color $BLUE "$line"
        elif [[ "$line" =~ ^\*\*YOU.*ISSUE\*\* ]]; then
            print_color $YELLOW "$line"
        elif [[ "$line" =~ ^✓ ]]; then
            print_color $GREEN "$line"
        elif [[ "$line" =~ ^⚠️ ]]; then
            print_color $YELLOW "$line"
        else
            echo "$line"
        fi
    done

    # Copy to clipboard on macOS (same content, no duplication)
    if command -v pbcopy &> /dev/null; then
        echo "$content" | pbcopy
        print_color $GREEN "🤖 Agent start context for issue $issue_id copied to clipboard!"
        echo "This context is optimized for AI agents to follow Kodebase methodology."
        echo "Next: Paste into your AI assistant and begin with TodoWrite tool."
    fi
}

# Run main function
main "$ISSUE_ID" "$CONTEXT_LEVEL"

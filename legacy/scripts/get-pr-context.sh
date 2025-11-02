
#!/bin/bash

# get-pr-context.sh (prctx)
# Generates PR description template with artifact data integration
# Focus: Template-driven PR description creation using artifact completion data

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 <issue-id> [options]

Generate PR context for LLM-guided description creation.

Arguments:
    issue-id        The issue ID (e.g., A.1.5)

Options:
    --minimal       Generate minimal context (just essentials)
    --extended      Generate extended context (includes additional analysis)
    --help          Show this help message

Examples:
    $0 A.1.5                    # Standard context
    $0 A.1.5 --minimal         # Minimal context
    $0 A.1.5 --extended        # Extended context

EOF
}

# Parse command line arguments
ISSUE_ID=""
CONTEXT_LEVEL="full"

while [[ $# -gt 0 ]]; do
    case $1 in
        --minimal)
            CONTEXT_LEVEL="minimal"
            shift
            ;;
        --extended)
            CONTEXT_LEVEL="extended"
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        -*)
            echo "Error: Unknown option $1" >&2
            usage
            exit 1
            ;;
        *)
            if [[ -z "$ISSUE_ID" ]]; then
                ISSUE_ID="$1"
            else
                echo "Error: Too many arguments" >&2
                usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if issue ID is provided
if [[ -z "$ISSUE_ID" ]]; then
    echo "Error: Issue ID is required" >&2
    usage
    exit 1
fi

# Validate issue ID format
if [[ ! "$ISSUE_ID" =~ ^[A-Z]+(\.[0-9]+)*$ ]]; then
    echo "Error: Invalid issue ID format. Expected format: A.1.5" >&2
    exit 1
fi

# Find the issue file
find_issue_file() {
    local issue_id="$1"
    local pattern=".kodebase/artifacts/**/${issue_id}*.yml"

    # Use find command to locate the file
    find .kodebase/artifacts -name "${issue_id}*.yml" -type f | head -1
}





# Individual output functions
print_header() {
    echo "# Kodebase PR Template Generator (prctx)"
    echo
    echo "PR Template for issue: ${ISSUE_ID}"
    echo
    echo "✓ Artifact data source: ${ISSUE_FILE}"
    echo
}

print_artifact_summary() {
    local issue_file="$1"

    if [[ ! -f "$issue_file" ]]; then
        echo "Error: Issue file not found: $issue_file" >&2
        return 1
    fi

    echo "## Quick Reference (Artifact Data)"
    echo

    # Extract key metadata
    local title
    title=$(grep -E "^\s*title:" "$issue_file" | sed 's/^\s*title:\s*//' | sed 's/^"//' | sed 's/"$//')
    echo "**Title:** ${title}"

    local priority
    priority=$(grep -E "^\s*priority:" "$issue_file" | sed 's/^\s*priority:\s*//')
    echo "**Priority:** ${priority}"

    # Check if completion data exists
    if grep -q "completion_analysis:" "$issue_file"; then
        echo "**Status:** ✅ Completion data available in artifact"
    else
        echo "**Status:** ⚠️  Completion data missing - update artifact first"
    fi

    echo
    echo "### Acceptance Criteria (for checklist)"
    awk '/^\s*acceptance_criteria:/{flag=1; next} /^\s*[a-zA-Z_]+:/ && !/^\s*-/{flag=0} flag && /^\s*-/{gsub(/^\s*-\s*/, ""); print "- " $0}' "$issue_file"
}

print_git_summary() {
    local issue_id="$1"

    echo "## Git Summary (for Files Changed section)"
    echo

    # Get current branch
    local current_branch
    current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    echo "**Current Branch:** \`${current_branch}\`"

    # Get commit count for this issue
    local commit_count
    commit_count=$(git log --oneline --grep="${issue_id}:" | wc -l | xargs)
    echo "**Commits:** ${commit_count}"

    # Get file changes (for template)
    echo
    echo "### Files Changed (copy to template)"
    git diff --name-only origin/main...HEAD 2>/dev/null | head -10 | while read -r file; do
        echo "- \`${file}\`"
    done || echo "- No file changes detected"
}

print_artifact_completion_status() {
    local issue_file="$1"

    echo "## Completion Data Check"
    echo

    # Check for completion analysis
    if grep -q "completion_analysis:" "$issue_file"; then
        echo "✅ **Completion Analysis Available**"
        echo "- Use artifact data for Implementation Details section"
        echo "- Key insights, approach, and knowledge are documented"
        echo

        # Show what's available for quick reference
        echo "### Available Data Preview"
        if grep -q "key_insights:" "$issue_file"; then
            echo "- ✅ Key Insights"
        fi
        if grep -q "implementation_approach:" "$issue_file"; then
            echo "- ✅ Implementation Approach"
        fi
        if grep -q "architecture_decisions:" "$issue_file"; then
            echo "- ✅ Architecture Decisions"
        fi
        if grep -q "files_created:" "$issue_file"; then
            echo "- ✅ Files Created"
        fi
    else
        echo "⚠️  **Missing Completion Analysis**"
        echo "- Update artifact with completion_analysis before generating PR"
        echo "- Required fields: key_insights, implementation_approach, knowledge_generated"
    fi

    echo

    # Check for development process
    if grep -q "development_process:" "$issue_file"; then
        echo "✅ **Development Process Available**"
        echo "- Use artifact data for Development Notes section"
        echo "- Challenges and solutions are documented"
    else
        echo "⚠️  **Missing Development Process**"
        echo "- Update artifact with development_process before generating PR"
        echo "- Required fields: implementation_approach, alternatives_considered, challenges_encountered"
    fi
}

print_pr_template() {
    local issue_id="$1"
    local issue_file="$2"

    echo "## 📋 PR Description Template"
    echo
    echo "**Copy this template and fill with artifact data:**"
    echo
    echo '```markdown'
    # Extract title for template
    local title
    title=$(grep -E "^\s*title:" "$issue_file" | sed 's/^\s*title:\s*//' | sed 's/^"//' | sed 's/"$//')
    echo "## ${title}"
    echo
    echo "### ✅ All Acceptance Criteria Met"
    echo
    # Show acceptance criteria as checkboxes
    awk '/^\s*acceptance_criteria:/{flag=1; next} /^\s*[a-zA-Z_]+:/ && !/^\s*-/{flag=0} flag && /^\s*-/{gsub(/^\s*-\s*/, ""); print "- [x] " $0}' "$issue_file"
    echo
    echo "### 🔧 Key Enhancements"
    echo
    echo "**Extract from completion_analysis.key_insights:**"
    echo "- [Insert key insights from artifact]"
    echo "- [Insert implementation highlights]"
    echo
    echo "### 📋 Implementation Details"
    echo
    echo "**Extract from completion_analysis.implementation_approach:**"
    echo "[Insert implementation approach from artifact]"
    echo
    echo "### 🔄 Development Notes"
    echo
    echo "**Extract from development_process.challenges_encountered:**"
    echo "[Insert challenges and solutions from artifact]"
    echo
    echo "### 🧪 Testing"
    echo
    echo "**Extract from completion_analysis.manual_testing_steps:**"
    echo "[Insert testing approach from artifact]"
    echo
    echo "### 🔄 Integration with @kodebase/core"
    echo
    echo "**Extract from completion_analysis.integration_points:**"
    echo "[Insert integration points from artifact]"
    echo
    echo "### 📁 Files Changed"
    echo
    echo "**Use git summary above:**"
    # Show actual files changed
    git diff --name-only origin/main...HEAD 2>/dev/null | head -10 | while read -r file; do
        echo "- \`${file}\` - [Brief description]"
    done || echo "- No file changes detected"
    echo
    echo "🤖 Generated with [Claude Code](https://claude.ai/code)"
    echo '```'
}

print_instructions() {
    echo
    echo "## 🎯 Next Steps"
    echo
    echo "1. **Copy the template above** to your PR description"
    echo "2. **Extract data from artifact** completion_analysis and development_process sections"
    echo "3. **Replace placeholders** with actual artifact data"
    echo "4. **Update file descriptions** based on actual changes made"
    echo "5. **Review and refine** the description for clarity"
    echo
    echo "**Template Focus**: This template uses artifact data as the single source of truth"
    echo "**Efficiency**: No need to reconstruct - just extract from completed artifact"
    echo
    echo "✓ PR template generated successfully"
}

# Generate complete content
generate_content() {
    local issue_file="$1"
    local context_level="$2"

    print_header
    print_artifact_summary "$issue_file"
    echo
    print_git_summary "$ISSUE_ID"

    if [[ "$context_level" != "minimal" ]]; then
        echo
        print_artifact_completion_status "$issue_file"
        echo
        print_pr_template "$ISSUE_ID" "$issue_file"
    fi

    print_instructions
}

# Main execution
main() {
    local issue_id="$1"
    local context_level="$2"

    # Find issue file
    local issue_file
    issue_file=$(find_issue_file "$issue_id")

    if [[ -z "$issue_file" ]]; then
        print_color $RED "Error: Issue file not found for ${issue_id}"
        exit 1
    fi

    # Set globals for use in print functions
    ISSUE_ID="$issue_id"
    ISSUE_FILE="$issue_file"

    # Generate content once
    local content
    content=$(generate_content "$issue_file" "$context_level")

    # Display with colors
    echo "$content" | while IFS= read -r line; do
        if [[ "$line" =~ ^#[[:space:]] ]]; then
            print_color $BLUE "$line"
        elif [[ "$line" =~ ^PR.*Template.*for ]]; then
            print_color $YELLOW "$line"
        elif [[ "$line" =~ ^✓ ]]; then
            print_color $GREEN "$line"
        elif [[ "$line" =~ ^✅ ]]; then
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
        print_color $GREEN "✓ Content copied to clipboard"
    fi
}

# Run main function
main "$ISSUE_ID" "$CONTEXT_LEVEL"

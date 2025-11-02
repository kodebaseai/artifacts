#!/bin/bash

# mark-for-review.sh
# Adds in_review event to artifact and marks PR ready for review

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if issue ID is provided
if [ $# -lt 1 ]; then
    echo -e "${RED}Usage: $0 <issue-id>${NC}"
    echo "Example: $0 C.3.2"
    exit 1
fi

ISSUE_ID=$1

echo -e "${YELLOW}Marking issue ${ISSUE_ID} for review...${NC}"

# 1. Find issue file
ISSUE_FILE=$(find .kodebase/artifacts -name "${ISSUE_ID}*.yml" -type f | head -1)
if [ -z "$ISSUE_FILE" ]; then
    echo -e "${RED}Error: Issue file not found for ID: ${ISSUE_ID}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Found issue file: ${ISSUE_FILE}${NC}"

# 2. Add in_review event using Python script
echo -e "${YELLOW}Adding in_review event...${NC}"
python3 - <<EOF
import sys
import re
import subprocess
from datetime import datetime, timezone

file_path = "${ISSUE_FILE}"

# Get git user info
def get_git_user():
    try:
        name = subprocess.check_output(['git', 'config', 'user.name'], text=True).strip()
        email = subprocess.check_output(['git', 'config', 'user.email'], text=True).strip()
        return f"{name} ({email})"
    except:
        return "Unknown User (unknown@example.com)"

# Read the current file
with open(file_path, 'r') as f:
    content = f.read()

# Check if already in_review
if 'event: in_review' in content:
    print("Issue is already marked for review")
    sys.exit(0)

# Generate new event using v2.0 schema
timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
actor = get_git_user()

# v2.0 event schema: event first, then timestamp, actor, trigger
new_event = f"""    - event: in_review
      timestamp: {timestamp}
      actor: {actor}
      trigger: pr_ready"""

# Find the end of the events section and insert the new event
events_end = re.search(r'(\n\s*events:\s*\n.*?)(\n\n|\nZ|\n[a-zA-Z])', content, re.DOTALL)
if events_end:
    before_events_end = events_end.start(2)
    new_content = content[:before_events_end] + "\n" + new_event + content[before_events_end:]
else:
    print("Could not find end of events section")
    sys.exit(1)

# Write back to file
with open(file_path, 'w') as f:
    f.write(new_content)

print("✓ Added in_review event using v2.0 schema")
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to add in_review event${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Added in_review event${NC}"

# 3. Commit the change
echo -e "${YELLOW}Committing artifact update...${NC}"
git add "${ISSUE_FILE}"
git commit -m "${ISSUE_ID}: Mark for review - add in_review event

Added in_review event using v2.0 schema:
- Event-first field ordering
- Required trigger field (pr_ready)
- No deprecated correlation/event_id fields
- Simplified event structure"

echo -e "${GREEN}✓ Committed artifact update${NC}"

# 4. Push to remote
echo -e "${YELLOW}Pushing to remote...${NC}"
git push

echo -e "${GREEN}✓ Pushed to remote${NC}"

# 5. Mark PR as ready (if exists)
echo -e "${YELLOW}Checking for PR...${NC}"
if gh pr view --json state > /dev/null 2>&1; then
    echo -e "${YELLOW}Marking PR as ready for review...${NC}"
    gh pr ready || echo "PR may already be ready"
    echo -e "${GREEN}✓ PR marked ready for review${NC}"
else
    echo -e "${YELLOW}No PR found for current branch${NC}"
fi

echo -e "${GREEN}✓ Issue ${ISSUE_ID} marked for review successfully!${NC}"
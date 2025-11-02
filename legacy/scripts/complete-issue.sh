#!/bin/bash

# complete-issue.sh
# Handles post-merge workflow: sync main and add completed event to issue

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if issue ID is provided
if [ $# -lt 1 ]; then
    echo -e "${RED}Usage: $0 <issue-id>${NC}"
    echo "Example: $0 A.1.3"
    exit 1
fi

ISSUE_ID=$1

echo -e "${YELLOW}Starting post-merge completion for issue ${ISSUE_ID}...${NC}"

# 1. Save current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: ${CURRENT_BRANCH}${NC}"

# 2. Checkout main and pull latest
echo -e "${YELLOW}Switching to main branch and syncing...${NC}"
git checkout main
git pull origin main
echo -e "${GREEN}✓ Main branch synced${NC}"

# 3. Find issue file
ISSUE_FILE=$(find .kodebase/artifacts -name "${ISSUE_ID}*.yml" -type f | head -1)
if [ -z "$ISSUE_FILE" ]; then
    echo -e "${RED}Error: Issue file not found for ID: ${ISSUE_ID}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Found issue file: ${ISSUE_FILE}${NC}"

# 4. Add completed event using Python script
echo -e "${YELLOW}Adding completed event...${NC}"
python3 - <<EOF
import sys
import re
from datetime import datetime, timezone

file_path = "${ISSUE_FILE}"

# Read the file
with open(file_path, 'r') as f:
    content = f.read()

# Get current timestamp
timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Get git user info
import subprocess
git_user = subprocess.run("git config user.name", shell=True, capture_output=True, text=True).stdout.strip()
git_email = subprocess.run("git config user.email", shell=True, capture_output=True, text=True).stdout.strip()
actor = f"{git_user} ({git_email})"

# Check if completed event already exists
if 'event: completed' in content:
    print("Completed event already exists")
    sys.exit(0)

# Find the end of the events section and add completed event using v2.0 schema
events_end = re.search(r'(\n\s*events:\s*\n.*?)(\n\n|\nZ|\n[a-zA-Z])', content, re.DOTALL)
if events_end:
    # v2.0 event schema: event first, then timestamp, actor, trigger
    new_event = f"""    - event: completed
      timestamp: {timestamp}
      actor: {actor}
      trigger: pr_merged"""
    
    before_events_end = events_end.start(2)
    new_content = content[:before_events_end] + "\n" + new_event + content[before_events_end:]
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print("✓ Added completed event using v2.0 schema")
else:
    print("Could not find end of events section")
    sys.exit(1)
EOF

# 5. Commit the change
echo -e "${YELLOW}Committing completed event...${NC}"
git add "${ISSUE_FILE}"
git commit -m "${ISSUE_ID}: chore: Add completed event after PR merge

Added completed event using v2.0 schema:
- Event-first field ordering  
- Required trigger field (pr_merged)
- No deprecated correlation/event_id fields"
echo -e "${GREEN}✓ Committed changes${NC}"

# 6. Push to remote
echo -e "${YELLOW}Pushing to remote...${NC}"
git push origin main
echo -e "${GREEN}✓ Pushed to remote${NC}"

# 7. Return to original branch (if different from main)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Returning to branch: ${CURRENT_BRANCH}${NC}"
    git checkout "$CURRENT_BRANCH"
fi

echo -e "${GREEN}✓ Issue ${ISSUE_ID} marked as completed!${NC}"
echo -e "${GREEN}Main branch is now up to date with completed event.${NC}"
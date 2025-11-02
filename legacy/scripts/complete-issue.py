#!/usr/bin/env python3

"""
complete-issue.py
Complete issue workflow: merge PR, add completed event, and clean up branches

This script handles the entire completion workflow:
1. Merge the PR if it's open and mergeable
2. Switch to main and sync with remote
3. Add completed event to issue artifact
4. Clean up local and remote branches
5. Leave you on main ready for next task

Usage: python complete-issue.py <issue-id>
"""

import sys
import subprocess
import glob
from datetime import datetime, timezone
import re

def run_command(cmd, capture_output=True):
    """Run a shell command and return the result"""
    try:
        if capture_output:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
            return result.stdout.strip()
        else:
            subprocess.run(cmd, shell=True, check=True)
            return None
    except subprocess.CalledProcessError as e:
        print(f"\033[0;31mError running command: {cmd}\033[0m")
        if e.stderr:
            print(f"Error: {e.stderr}")
        raise

def find_issue_file(issue_id):
    """Find the issue YAML file by ID"""
    pattern = f".kodebase/artifacts/**/{issue_id}*.yml"
    files = glob.glob(pattern, recursive=True)
    return files[0] if files else None

def add_completed_event(file_path, actor):
    """Add completed event to the issue file"""
    with open(file_path, 'r') as f:
        content = f.read()

    # Check if completed event already exists
    if 'event: completed' in content:
        print("\033[1;33mCompleted event already exists\033[0m")
        return False

    # Get current timestamp and generate event data
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    event_lines = [
        "event: completed",
        f"timestamp: {timestamp}",
        f"actor: {actor}",
        "trigger: pr_merged",
    ]

    # Process the file
    lines = content.split('\n')
    new_lines = []
    in_events = False
    events_indent = ''
    event_added = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # Detect events section
        if re.match(r'\s*events:', line):
            in_events = True
            events_indent = line[:line.index('events:')]
            new_lines.append(line)
            i += 1
            continue

        # If we're in events section and hit a top-level YAML key (not indented beyond events level)
        if in_events and line.strip() and not line.startswith(' ') and ':' in line:
            # This is the end of events section, add completed event here
            if not event_added:
                new_lines.append(f"{events_indent}  - {event_lines[0]}")
                for detail_line in event_lines[1:]:
                    new_lines.append(f"{events_indent}    {detail_line}")
                event_added = True
            in_events = False

        new_lines.append(line)
        i += 1

    # If we're still in events at the end of file, add the event
    if in_events and not event_added:
        new_lines.append(f"{events_indent}  - {event_lines[0]}")
        for detail_line in event_lines[1:]:
            new_lines.append(f"{events_indent}    {detail_line}")
        event_added = True

    if event_added:
        with open(file_path, 'w') as f:
            f.write('\n'.join(new_lines))
        print("\033[0;32m✓ Added completed event\033[0m")
        return True
    else:
        print("\033[0;31mError: Could not add completed event\033[0m")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python complete-issue.py <issue-id>")
        print("Example: python complete-issue.py A.1.3")
        sys.exit(1)

    issue_id = sys.argv[1]

    print(f"\033[1;33mStarting completion workflow for issue {issue_id}...\033[0m")

    # 1. Save current branch
    current_branch = run_command("git branch --show-current")
    print(f"\033[1;33mCurrent branch: {current_branch}\033[0m")

    # 2. Check if there's an open PR and merge it
    try:
        # Check if we're on the issue branch
        if current_branch == issue_id:
            print("\033[1;33mChecking for open PR...\033[0m")
            pr_info = run_command("gh pr view --json state,mergeable,url -q .")
            if pr_info:
                import json
                pr_data = json.loads(pr_info)

                if pr_data.get('state') == 'OPEN' and pr_data.get('mergeable') == 'MERGEABLE':
                    print(f"\033[1;33mFound open PR: {pr_data.get('url')}\033[0m")
                    print("\033[1;33mMerging PR...\033[0m")
                    run_command("gh pr merge --squash --delete-branch", capture_output=False)
                    print("\033[0;32m✓ PR merged successfully\033[0m")
                    # After merge, we're automatically on main
                    current_branch = "main"
                elif pr_data.get('state') == 'MERGED':
                    print("\033[1;33mPR already merged\033[0m")
                else:
                    print(f"\033[1;33mPR not mergeable. State: {pr_data.get('state')}, Mergeable: {pr_data.get('mergeable')}\033[0m")
                    print("\033[1;33mPlease resolve any conflicts or get approvals before completing.\033[0m")
                    sys.exit(1)
    except subprocess.CalledProcessError:
        print("\033[1;33mNo PR found or unable to check PR status\033[0m")

    # 3. Checkout main and pull latest
    if run_command("git branch --show-current") != "main":
        print("\033[1;33mSwitching to main branch...\033[0m")
        run_command("git checkout main", capture_output=False)

    print("\033[1;33mSyncing main branch...\033[0m")
    run_command("git pull origin main", capture_output=False)
    print("\033[0;32m✓ Main branch synced\033[0m")

    # 4. Find issue file
    issue_file = find_issue_file(issue_id)
    if not issue_file:
        print(f"\033[0;31mError: Issue file not found for ID: {issue_id}\033[0m")
        sys.exit(1)
    print(f"\033[0;32m✓ Found issue file: {issue_file}\033[0m")

    # 5. Get Git user info
    git_user = run_command("git config user.name")
    git_email = run_command("git config user.email")
    actor = f"{git_user} ({git_email})"

    # 6. Add completed event
    print("\033[1;33mAdding completed event...\033[0m")
    if add_completed_event(issue_file, actor):
        # 7. Commit the change
        print("\033[1;33mCommitting completed event...\033[0m")
        run_command(f"git add {issue_file}", capture_output=False)

        commit_message = f"{issue_id}: chore: Add completed event after PR merge\n\nMarks issue as completed following successful merge to main"
        run_command(f'git commit -m "{commit_message}"', capture_output=False)
        print("\033[0;32m✓ Committed changes\033[0m")

        # 8. Push to remote
        print("\033[1;33mPushing to remote...\033[0m")
        run_command("git push origin main", capture_output=False)
        print("\033[0;32m✓ Pushed to remote\033[0m")

    # 9. Clean up completed branch
    if current_branch != "main" and current_branch == issue_id:
        print(f"\033[1;33mCleaning up branch: {current_branch}\033[0m")

        # Delete local branch
        try:
            run_command(f"git branch -d {current_branch}", capture_output=False)
            print(f"\033[0;32m✓ Deleted local branch {current_branch}\033[0m")
        except subprocess.CalledProcessError:
            # If branch can't be deleted safely, use force
            print(f"\033[1;33mForce deleting branch {current_branch}...\033[0m")
            run_command(f"git branch -D {current_branch}", capture_output=False)
            print(f"\033[0;32m✓ Force deleted local branch {current_branch}\033[0m")

        # Note: Remote branch should already be deleted by gh pr merge --delete-branch
        # But we'll try anyway in case it wasn't
        try:
            run_command(f"git push origin --delete {current_branch}", capture_output=True)
            print(f"\033[0;32m✓ Deleted remote branch {current_branch}\033[0m")
        except subprocess.CalledProcessError:
            # This is expected if gh pr merge already deleted it
            pass

    # 10. Ensure we're on main with latest changes
    if run_command("git branch --show-current") != "main":
        run_command("git checkout main", capture_output=False)

    print(f"\033[0;32m✓ Issue {issue_id} marked as completed!\033[0m")
    print("\033[0;32m✓ Branches cleaned up\033[0m")
    print("\033[0;32m✓ You're now on main branch, ready for the next task!\033[0m")

if __name__ == "__main__":
    main()

# Kodebase CLI

The official command-line interface for managing Kodebase artifacts and workflows. Transform your software development process with structured knowledge management using Git as a database.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Reference](#command-reference)
- [Shell Integration](#shell-integration)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## Installation

### Requirements

- Node.js v22.0.0 or later
- Git 2.25.0 or later
- A GitHub account (for PR features)

### Install with npm

```bash
# Global installation (recommended)
npm install -g @kodebase/cli

# Verify installation
kodebase --version
kb --version  # Short alias
```

### Install with pnpm

```bash
# Global installation (recommended)
pnpm add -g @kodebase/cli

# Verify installation
kodebase --version
kb --version  # Short alias
```

### Install with yarn

```bash
# Global installation (recommended)
yarn global add @kodebase/cli

# Verify installation
kodebase --version
kb --version  # Short alias
```

### Environment-Specific Setup

#### macOS

```bash
# Install with Homebrew (coming soon)
# brew install kodebase-cli

# For now, use npm/pnpm/yarn
npm install -g @kodebase/cli

# Enable shell completion
curl -sL https://github.com/kodebaseai/kodebase/raw/main/packages/cli/scripts/install-completion.sh | bash
```

#### Linux

```bash
# Install globally
npm install -g @kodebase/cli

# Enable shell completion
curl -sL https://github.com/kodebaseai/kodebase/raw/main/packages/cli/scripts/install-completion.sh | bash

# If you encounter permission issues
sudo npm install -g @kodebase/cli
```

#### Windows

```powershell
# Install globally
npm install -g @kodebase/cli

# Verify installation
kodebase --version

# Note: Shell completion requires WSL or Git Bash
```

### Post-Installation Setup

1. **Verify Installation**
   ```bash
   kodebase --version
   kb --version  # Both commands should work
   ```

2. **Run Interactive Tutorial**
   ```bash
   kodebase tutorial
   # or
   kb t
   ```

3. **Enable Shell Completion** (see [Shell Integration](#shell-integration))

## Quick Start

Get up and running with Kodebase in under 5 minutes!

### Your First Workflow

1. **Create an Initiative** (a major project goal)
   ```bash
   kb create "Build user authentication system"
   # Output: ✓ Created initiative A: Build user authentication system
   ```

2. **Create a Milestone** (a deliverable within the initiative)
   ```bash
   kb create A "Login and registration API"
   # Output: ✓ Created milestone A.1: Login and registration API
   ```

3. **Create an Issue** (a specific task)
   ```bash
   kb create A.1 "Implement password hashing"
   # Output: ✓ Created issue A.1.1: Implement password hashing
   ```

4. **Mark Issue as Ready**
   ```bash
   kb ready A.1.1
   # Validates and transitions from draft to ready status
   ```

5. **Start Working**
   ```bash
   kb start A.1.1
   # Creates branch A.1.1 and updates status to in_progress
   ```

6. **Create Pull Request**
   ```bash
   # After making changes...
   kb pr
   # Creates draft PR with artifact context
   ```

### Common Workflows

#### Quick Status Check
```bash
# Check specific artifact
kb s A.1.1

# List all ready issues
kb l --status ready --type issue

# List your assigned tasks
kb l --assignee "Your Name"
```

#### Interactive Creation
```bash
# Launch creation wizard
kb create --wizard
# Guides you through creating any artifact type
```

## Command Reference

### Overview

Kodebase CLI provides the following commands:

| Command | Alias | Description |
|---------|-------|-------------|
| `create` | `c` | Create new artifacts (initiatives, milestones, issues) |
| `ready` | - | Mark draft artifacts as ready for work |
| `start` | - | Begin work by creating feature branches |
| `status` | `s` | Show detailed artifact information |
| `list` | `l` | List artifacts with filtering and sorting |
| `pr` | - | Create or update pull requests |
| `tutorial` | `t` | Interactive tutorial for new users |

### create

Create new artifacts with intelligent type detection.

```bash
kodebase create [parent_id] <idea>
kodebase create --wizard  # Interactive mode
```

**Examples:**
```bash
# Create initiative (no parent)
kb create "Build authentication system"

# Create milestone (under initiative A)
kb create A "User login functionality"

# Create issue (under milestone A.1)
kb create A.1 "Add password reset flow"

# Interactive wizard
kb create --wizard
```

**Output:**
```
✓ Created issue A.1.5: Add password reset flow
  File: .kodebase/artifacts/A.authentication-system/A.1.user-login/A.1.5.add-password-reset-flow.yml
  Status: draft
  Next: Run 'kb ready A.1.5' when fully specified
```

### ready

Transition artifacts from draft to ready status.

```bash
kodebase ready <artifact-id> [--verbose]
```

**Examples:**
```bash
# Mark issue as ready
kb ready A.1.5

# With verbose output
kb ready A.1.5 --verbose
```

**Validation checks:**
- Must be in draft status
- No blocking dependencies
- All required fields present
- Acceptance criteria defined (for issues)

### start

Create feature branch and begin work on an artifact.

```bash
kodebase start <artifact-id>
```

**Examples:**
```bash
# Start work on issue
kb start A.1.5
# Creates and switches to branch A.1.5
# Updates status to in_progress
# Creates draft PR automatically
```

**Output:**
```
✓ Created and switched to branch A.1.5
✓ Updated artifact status to in_progress
✓ Created draft PR: https://github.com/org/repo/pull/42

Next steps:
1. Make your changes
2. Commit with: git commit -m "A.1.5: Your message"
3. Update PR: kb pr --ready
```

### status

Display detailed artifact information including timeline and relationships.

```bash
kodebase status <artifact-id> [--json]
```

**Examples:**
```bash
# Human-readable format
kb s A.1.5

# JSON format for scripting
kb status A.1.5 --json
```

**Output includes:**
- Current status and metadata
- Complete event timeline
- Dependencies (blocks/blocked_by)
- Acceptance criteria progress

### list

List artifacts with powerful filtering, sorting, and pagination.

```bash
kodebase list [options]
```

**Options:**
```bash
--type <type>         # Filter by type: initiative, milestone, issue
--status <status>     # Filter by status: draft, ready, in_progress, etc.
--assignee <name>     # Filter by assignee name
--parent <id>         # Filter by parent artifact
--sort <field>        # Sort by: id, created, priority, status
--page <number>       # Page number (default: 1)
--page-size <number>  # Items per page (default: 20)
```

**Examples:**
```bash
# List all ready issues
kb l --type issue --status ready

# List high-priority items assigned to you
kb l --assignee "John Doe" --priority high

# List all items under milestone A.1
kb l --parent A.1 --sort priority
```

### pr

Create or update pull requests for artifact branches.

```bash
kodebase pr [--ready]
```

**Examples:**
```bash
# Create draft PR
kb pr

# Create PR ready for review
kb pr --ready

# Update existing PR
kb pr  # Detects and updates existing PR
```

**Features:**
- Auto-generates PR title from artifact
- Creates structured description with acceptance criteria
- Links to artifact context
- Handles draft/ready states

### tutorial

Interactive tutorial for learning Kodebase.

```bash
kodebase tutorial
```

**Features:**
- Safe sandbox environment
- Step-by-step guidance
- Progress tracking
- Hands-on practice

## Shell Integration

Enable tab completion for commands, options, and artifact IDs.

### Automatic Installation

```bash
# Download and run installer
curl -sL https://github.com/kodebaseai/kodebase/raw/main/packages/cli/scripts/install-completion.sh | bash

# For security-conscious users, download and review first:
curl -sL https://github.com/kodebaseai/kodebase/raw/main/packages/cli/scripts/install-completion.sh > install-completion.sh
# Review the script
bash install-completion.sh
```

### Manual Installation

#### Bash
```bash
# Generate completion script
kodebase __complete-bash > ~/.kodebase-completion.bash

# Add to ~/.bashrc
echo "source ~/.kodebase-completion.bash" >> ~/.bashrc

# Reload
source ~/.bashrc
```

#### Zsh
```bash
# Generate completion script
kodebase __complete-zsh > ~/.zsh/completions/_kodebase

# Add to ~/.zshrc (if needed)
echo "fpath=(~/.zsh/completions $fpath)" >> ~/.zshrc
echo "autoload -U compinit && compinit" >> ~/.zshrc

# Reload
source ~/.zshrc
```

### Using Completion

Once installed, use TAB to complete:
```bash
kb cr<TAB>             # Completes to: kb create
kb status A.<TAB>      # Shows available artifacts
kb list --st<TAB>      # Completes to: kb list --status
kb pr --<TAB>          # Shows available options
```

### Setting Up Aliases

Add convenient aliases to your shell config:

```bash
# ~/.bashrc or ~/.zshrc
alias kbs="kodebase status"
alias kbc="kodebase create"
alias kbl="kodebase list"
alias kbr="kodebase ready"
alias kbstart="kodebase start"

# Quick status of current branch
alias kbcurrent='kodebase status $(git branch --show-current)'
```

## Configuration

### Environment Variables

Kodebase CLI respects the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `KODEBASE_ROOT` | Root directory for artifacts | `.kodebase/artifacts` |
| `KODEBASE_VERBOSE` | Enable verbose output | `false` |
| `NO_COLOR` | Disable colored output | `false` |
| `KODEBASE_EDITOR` | Preferred editor for interactive modes | `$EDITOR` or `vim` |

### Git Configuration

Kodebase uses your Git configuration for event attribution:

```bash
# Set your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# These values are used in artifact events
```

### GitHub CLI Integration

For PR features, ensure GitHub CLI is configured:

```bash
# Install GitHub CLI
# macOS: brew install gh
# Linux: See https://github.com/cli/cli#installation

# Authenticate
gh auth login
```

## Troubleshooting

### Common Issues and Solutions

#### Command Not Found

**Issue:** `bash: kodebase: command not found`

**Solutions:**
1. Verify installation: `npm list -g @kodebase/cli`
2. Check PATH: `echo $PATH`
3. Reinstall globally: `npm install -g @kodebase/cli`
4. For npm/pnpm, ensure global bin is in PATH:
   ```bash
   # npm
   export PATH="$PATH:$(npm config get prefix)/bin"
   
   # pnpm
   export PATH="$PATH:$(pnpm config get prefix)/bin"
   ```

#### Permission Denied

**Issue:** `EACCES: permission denied` during global install

**Solutions:**
1. Use a Node version manager (recommended):
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 22
   npm install -g @kodebase/cli
   ```

2. Change npm's default directory:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   npm install -g @kodebase/cli
   ```

3. Use npx (no install needed):
   ```bash
   npx @kodebase/cli create "My idea"
   ```

#### Git Branch Already Exists

**Issue:** `fatal: A branch named 'A.1.5' already exists`

**Solutions:**
1. Check existing branches: `git branch -a | grep A.1.5`
2. Delete local branch: `git branch -D A.1.5`
3. Delete remote branch: `git push origin --delete A.1.5`
4. Or checkout existing: `git checkout A.1.5`

#### Artifact Not Found

**Issue:** `Artifact A.1.5 not found`

**Solutions:**
1. Verify artifact exists: `kb list --parent A.1`
2. Check correct directory: `pwd` (must be in project root)
3. Check artifact file: `ls .kodebase/artifacts/A.*/A.1.*/A.1.5.*.yml`

#### PR Creation Failed

**Issue:** `Failed to create PR: GitHub CLI not authenticated`

**Solutions:**
1. Install GitHub CLI: https://cli.github.com
2. Authenticate: `gh auth login`
3. Verify auth: `gh auth status`
4. Check repo permissions: `gh repo view`

#### Shell Completion Not Working

**Issue:** Tab completion doesn't work

**Solutions:**
1. Verify completion installed:
   ```bash
   # Bash
   ls ~/.bash_completion.d/kodebase*
   
   # Zsh
   ls ~/.zsh/completions/_kodebase
   ```

2. Reload shell config:
   ```bash
   # Bash
   source ~/.bashrc
   
   # Zsh
   source ~/.zshrc
   ```

3. Check completion is sourced:
   ```bash
   # Bash
   complete -p | grep kodebase
   
   # Zsh
   print -l $fpath | grep completion
   ```

### Debugging

Enable verbose output for detailed error information:

```bash
# Per command
kb create "My idea" --verbose

# Globally via environment
export KODEBASE_VERBOSE=true
kb status A.1.5
```

### Getting Help

1. **Command Help:** `kb <command> --help`
2. **Full Help:** `kb --help`
3. **Interactive Tutorial:** `kb tutorial`
4. **GitHub Issues:** https://github.com/kodebaseai/kodebase/issues
5. **Documentation:** https://kodebase.ai/docs

## Advanced Usage

### Scripting with Kodebase

Use JSON output for scripting and automation:

```bash
# Get all ready issues as JSON
kb list --status ready --type issue --json | jq '.artifacts[]'

# Check if artifact is ready
if kb status A.1.5 --json | jq -e '.status == "ready"' > /dev/null; then
  echo "Ready to start!"
  kb start A.1.5
fi

# List high-priority blocked items
kb list --status blocked --json | \
  jq '.artifacts[] | select(.priority == "high") | {id, title}'
```

### Custom Workflows

Create shell functions for common patterns:

```bash
# Quick create and ready
kb-quick() {
  local parent=$1
  local title=$2
  local id=$(kb create "$parent" "$title" | grep -o '[A-Z]\.[0-9]\+\.[0-9]\+')
  echo "Created $id, marking as ready..."
  kb ready "$id"
  echo "Ready to start with: kb start $id"
}

# Start with PR
kb-start-pr() {
  kb start "$1" && kb pr
}

# Update and mark PR ready
kb-finish() {
  kb pr --ready
  echo "PR marked as ready for review!"
}
```

### Integration with Git Hooks

Add to `.git/hooks/post-checkout`:

```bash
#!/bin/bash
# Auto-update artifact status on branch checkout

branch=$(git branch --show-current)
if [[ $branch =~ ^[A-Z]\.[0-9]+(\.[0-9]+)?$ ]]; then
  echo "Detected artifact branch: $branch"
  # Status will be auto-updated by Kodebase git integration
fi
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: Artifact Status Check
on: [pull_request]

jobs:
  check-artifact:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install Kodebase CLI
        run: npm install -g @kodebase/cli
      
      - name: Check artifact status
        run: |
          BRANCH=${{ github.head_ref }}
          if kb status "$BRANCH" --json | jq -e '.status == "in_progress"'; then
            echo "✓ Artifact is in correct status"
          else
            echo "✗ Artifact should be in_progress"
            exit 1
          fi
```

### Performance Tips

1. **Use Artifact IDs directly** - Faster than searching
   ```bash
   kb status A.1.5  # Fast
   kb list --search "authentication" # Slower
   ```

2. **Cache completions** - Shell completion caches results
   ```bash
   # Force cache refresh if needed
   hash -r  # Bash
   rehash   # Zsh
   ```

3. **Batch operations** - Use JSON output for multiple operations
   ```bash
   # Instead of multiple status calls
   kb list --parent A.1 --json > artifacts.json
   # Process all at once
   ```

## Next Steps

1. **Complete the Tutorial**: `kb tutorial`
2. **Explore Commands**: Try each command with `--help`
3. **Read Documentation**: Visit command-specific docs in `src/commands/*.md`
4. **Join Community**: Contribute at https://github.com/kodebaseai/kodebase

---

Built with ❤️ by the Kodebase team
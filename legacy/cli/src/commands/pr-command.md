# PR Command Documentation

The `kodebase pr` command is used to create or update pull requests for artifact branches, automating PR generation with context from artifact data.

## Overview

The pr command automates the process of creating and managing pull requests for Kodebase artifacts. It handles:

1. **Branch Detection** - Automatically detects current branch and maps to artifact ID
2. **Artifact Context** - Loads artifact data to generate meaningful PR content
3. **PR Management** - Creates new PRs or updates existing ones intelligently
4. **Status Control** - Supports draft and ready-for-review states

## Usage

```bash
kodebase pr [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--ready` | Mark PR as ready for review (default: creates draft PR) |
| `--verbose` | Show detailed error information and debug output |
| `--help`, `-h` | Show command help |

## How It Works

### 1. Branch Analysis

The command automatically detects your current git branch and extracts the artifact ID:

- **Pattern Matching**: Expects branch names that start with artifact ID format (e.g., `A.1.5`, `D.2.4`)
- **Validation**: Ensures the branch follows the correct naming convention
- **Error Handling**: Provides clear guidance if branch name doesn't match pattern

### 2. Artifact Loading

Loads the corresponding artifact to gather context:

- **Dynamic Type Detection**: Handles Issues, Milestones, and Initiatives
- **Content Extraction**: Pulls summary, acceptance criteria, and technical notes
- **Metadata Usage**: Uses artifact title for PR title generation

### 3. PR Content Generation

Creates structured PR descriptions with:

- **Summary Section**: Uses artifact summary or vision (for initiatives)
- **Acceptance Criteria**: Formats criteria as checkboxes for easy tracking
- **Technical Notes**: Includes implementation details from artifact notes
- **Attribution**: Marks PR as automatically generated

### 4. PR Operations

Intelligently manages PR lifecycle:

- **Existing PR Detection**: Checks for existing PRs on the current branch
- **Create vs Update**: Creates new PR or updates existing one as appropriate
- **Draft Management**: Creates draft by default, with `--ready` for immediate review
- **Status Synchronization**: Handles PR ready state based on flag

## Examples

### Basic Usage

```bash
# Create draft PR for current branch
kodebase pr
```

This will:
- Detect artifact ID from branch name (e.g., `D.2.4`)
- Load artifact data for context
- Create a draft PR with generated title and description
- Display PR URL for access

### Ready for Review

```bash
# Create PR and mark ready for review
kodebase pr --ready
```

This will:
- Same as basic usage
- Mark PR as ready for review instead of draft
- Notify reviewers if configured

### Updating Existing PR

```bash
# Update existing PR with latest artifact changes
kodebase pr
```

If a PR already exists for the current branch:
- Updates PR title and description with latest artifact data
- Preserves existing PR number and URL
- Maintains current draft/ready status unless `--ready` is specified

## Error Scenarios

### Invalid Branch Name

```bash
# On branch: feature-new-ui
kodebase pr
```

**Error**: `Current branch 'feature-new-ui' does not match artifact ID pattern`

**Solution**: Ensure you're on an artifact branch (e.g., `A.1.5`, `D.2.4`) or use `kodebase start <artifact-id>` to create proper branch.

### No Current Branch

```bash
# In detached HEAD state
kodebase pr
```

**Error**: `Could not determine current branch`

**Solution**: Check out a proper artifact branch before running the command.

### GitHub Authentication

```bash
kodebase pr
```

**Error**: `GitHub CLI not authenticated`

**Solution**: Run `gh auth login` to authenticate with GitHub.

### Missing Artifact

```bash
# On branch: A.9.9 (non-existent artifact)
kodebase pr
```

**Error**: `Artifact A.9.9 not found`

**Solution**: Ensure the artifact exists or check your branch name for typos.

## PR Description Format

The generated PR description follows this structure:

```markdown
## Summary

[Artifact summary or vision]

## Acceptance Criteria

- [ ] First acceptance criterion
- [ ] Second acceptance criterion

## Technical Notes

[Technical implementation details from artifact notes]

---
*This PR was generated automatically by the kodebase CLI*
```

## Integration with Git-Ops

The PR command leverages the `@kodebase/git-ops` package for:

- **PRManager**: Handles GitHub API interactions
- **Error Handling**: Provides structured error messages
- **Repository Operations**: Manages git repository context

## Best Practices

### 1. Regular Updates

Update PRs as you work:

```bash
# After making changes to acceptance criteria or technical notes
kodebase pr
```

### 2. Draft to Ready Workflow

Start with draft, move to ready when complete:

```bash
# Initial PR creation
kodebase pr

# When ready for review
kodebase pr --ready
```

### 3. Consistent Branch Naming

Always use artifact IDs as branch names:

```bash
# Good
git checkout -b A.1.5
kodebase pr

# Bad - won't work
git checkout -b feature-user-auth
kodebase pr
```

## Testing

The pr command has comprehensive test coverage with 11 test cases:

1. **Branch Detection**: Validates artifact ID extraction from branch names
2. **PR Creation**: Tests new PR creation with proper content generation
3. **PR Updates**: Verifies existing PR update functionality
4. **Ready Flag**: Ensures `--ready` flag works correctly
5. **Content Generation**: Validates PR description formatting
6. **Error Handling**: Tests various error scenarios
7. **Artifact Types**: Supports different artifact types (Issue, Milestone, Initiative)
8. **Loading States**: Provides user feedback during operations
9. **Verbose Mode**: Shows debugging information when requested
10. **GitHub Integration**: Mocks and tests PRManager integration
11. **Edge Cases**: Handles null branches, missing artifacts, API failures

## Performance

- **Branch Detection**: Near-instantaneous using simple-git
- **Artifact Loading**: Fast file system operations
- **PR Operations**: Limited by GitHub API response times
- **Memory Usage**: Minimal, processes one artifact at a time

## Dependencies

- **@kodebase/git-ops**: PR management and GitHub integration
- **@kodebase/core**: Artifact types and parsing
- **simple-git**: Git repository operations
- **ink**: Terminal UI components for user feedback
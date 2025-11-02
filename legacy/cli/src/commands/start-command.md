# Start Command Documentation

The `kodebase start` command is used to begin work on an artifact by creating a feature branch and transitioning the artifact to `in_progress` status.

## Overview

The start command automates the process of beginning development work on a Kodebase artifact. It handles:

1. **Artifact Validation** - Ensures the artifact exists and is ready for work
2. **Branch Creation** - Creates a feature branch with the artifact ID as the name
3. **Status Transition** - Automatically updates artifact status via git hooks
4. **Developer Guidance** - Provides clear next steps for the development workflow

## Usage

```bash
kodebase start <artifact-id>
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `artifact-id` | string | Yes | The ID of the artifact to start work on (e.g., A.1.5, D.2.2) |

### Options

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed error information and stack traces |
| `--help`, `-h` | Show command help |

## How It Works

### 1. Pre-flight Checks

The command performs several validation steps before creating the branch:

- **Git Repository Check**: Verifies you're in a git repository
- **Artifact Existence**: Confirms the artifact file exists
- **Status Validation**: Ensures artifact is in 'ready' status
- **Branch Availability**: Checks that branch doesn't already exist

### 2. Branch Creation

Uses the `BranchCreator` from `@kodebase/git-ops` to:

- Create a new branch with the exact artifact ID as the name
- Automatically checkout to the new branch
- Trigger post-checkout hooks for status updates

### 3. Status Transition

Post-checkout git hooks automatically:

- Add an `in_progress` event to the artifact
- Set the correct timestamp and actor information
- Maintain event correlation and history

### 4. User Feedback

Provides clear success messages with:

- Confirmation of branch creation
- Current branch name
- Next steps for development workflow

## Examples

### Basic Usage

```bash
# Start work on issue D.2.2
kodebase start D.2.2
```

Output:
```
✓ Started work on D.2.2
Created and switched to branch: D.2.2

Next steps:
1. Make your changes
2. Commit with message: "D.2.2: feat: ..."
3. Push when ready: git push -u origin D.2.2
```

### Verbose Mode

```bash
# Start with detailed output
kodebase start A.1.5 --verbose
```

## Error Scenarios

### Artifact Not Ready

```bash
kodebase start D.2.2
```

Output:
```
✗ Failed to start work on D.2.2
Artifact D.2.2 is not ready. Current status: draft
Only artifacts with status 'ready' can be started.
```

### Artifact Not Found

```bash
kodebase start X.9.9
```

Output:
```
✗ Failed to start work on X.9.9
Artifact not found: X.9.9
```

### Branch Already Exists

```bash
kodebase start D.2.2
```

Output:
```
✗ Failed to start work on D.2.2
Branch D.2.2 already exists
```

### Not in Git Repository

```bash
kodebase start A.1.5
```

Output:
```
✗ Failed to start work on A.1.5
Not in a git repository. Please run this command from within a git repository.
```

## Integration with Git-Ops

The start command integrates with several git-ops components:

### BranchCreator

- **Purpose**: Handles validated branch creation with error handling
- **Configuration**: Automatically checks out new branch, doesn't push or track
- **Validation**: Ensures branch name is valid and doesn't conflict

### Post-Checkout Hooks

- **Trigger**: Automatically executed when branch is created
- **Action**: Updates artifact status from 'ready' to 'in_progress'
- **Event Creation**: Adds proper event with correlation metadata

### Error Handling

Uses `withGitOpsErrorHandling` wrapper for consistent error formatting and user-friendly messages.

## Implementation Details

### Component Structure

```typescript
interface StartCommandProps {
  artifactId: string;
  verbose?: boolean;
}

export const Start: FC<StartCommandProps> = ({ artifactId, verbose }) => {
  // Implementation uses React hooks for state management
  // and useEffect for async operations
}
```

### Key Dependencies

- `@kodebase/git-ops` - BranchCreator for validated branch operations
- `simple-git` - Git operations and repository validation
- `ArtifactLoader` - Filesystem access and artifact validation
- `ink` - React-based CLI component rendering

### Validation Logic

1. **Git Repository**: Uses `ensureGitRepository()` from git-ops integration
2. **Artifact Loading**: Uses `ArtifactLoader.loadArtifact()` to read artifact file
3. **Status Check**: Examines latest event in artifact's event timeline
4. **Branch Creation**: Delegates to `BranchCreator.create()` with specific options

### Error Recovery

The command handles errors gracefully:

- **Early Validation**: Fails fast on invalid conditions
- **Clear Messages**: Provides actionable error descriptions
- **No Side Effects**: Doesn't leave partial state on failures
- **Verbose Mode**: Shows detailed error information when requested

## Testing

The start command has comprehensive test coverage with 11 test cases:

### Test Categories

1. **Successful Scenarios**
   - Basic branch creation
   - Verbose mode handling

2. **Artifact Validation**
   - Non-ready status rejection
   - Missing artifact handling
   - Empty events array

3. **Git Repository Validation**
   - Not in git repository error

4. **Branch Creation Errors**
   - Git-ops failures
   - Verbose error details

5. **Edge Cases**
   - Loading states
   - Non-Error objects
   - Event sorting

### Running Tests

```bash
# Run all Start command tests
cd packages/cli
pnpm test Start.test.tsx

# Run with coverage
pnpm test Start.test.tsx --coverage
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Artifact not ready" | Artifact status is not 'ready' | Use `kodebase status <id>` to check current status |
| "Branch already exists" | Local branch with artifact ID exists | Delete existing branch or use different artifact |
| "Not in git repository" | Command run outside git repo | Navigate to git repository root |
| "Git operation failed" | Git configuration or permission issues | Check git setup and permissions |

### Debug Steps

1. **Check Artifact Status**:
   ```bash
   kodebase status D.2.2
   ```

2. **Verify Git Repository**:
   ```bash
   git status
   ```

3. **Check Existing Branches**:
   ```bash
   git branch -a
   ```

4. **Use Verbose Mode**:
   ```bash
   kodebase start D.2.2 --verbose
   ```

## Related Commands

- [`kodebase status`](status-command.md) - Check artifact status before starting
- [`kodebase list --status ready`](list-command.md) - Find artifacts ready to start
- [`kodebase create`](create-command.md) - Create new artifacts to work on

## Workflow Integration

The start command is part of the standard Kodebase development workflow:

1. **Plan** - Create and refine artifacts
2. **Ready** - Mark artifacts as ready for development
3. **Start** - Use `kodebase start` to begin work ← **This command**
4. **Develop** - Make changes and commit with artifact ID prefix
5. **Review** - Create PR and mark for review
6. **Complete** - Merge and mark artifact as completed

## Configuration

No additional configuration is required. The command uses:

- Git configuration for user identity
- Existing git-ops setup for hooks
- Current working directory for artifact discovery
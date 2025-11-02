# Git Hooks Module

This module implements git hooks for the Kodebase methodology, providing automated status transitions and validation through standard git operations.

## Overview

Git hooks serve as the primary automation mechanism, translating git operations into artifact lifecycle events without requiring manual status updates.

## Installation

To install hooks in a repository, use the `HookInstaller` class:

```typescript
import { HookInstaller } from '@kodebase/git-ops';

const installer = new HookInstaller();
await installer.install({ repoPath: '/path/to/repo' });
```

## Hook Implementations

- **Post-Checkout Hook** - Detects branch creation and updates artifact status
- **Pre-Commit Hook** - Validates commit message format and content
- **Pre-Push Hook** - Validates artifact state before pushing
- **Post-Merge Hook** - Updates artifact status on PR merge

## Hooks

### Post-Checkout Hook

Triggered after a successful `git checkout`. The hook:
- Detects when an artifact branch is checked out
- Adds an `in_progress` event to the artifact using @kodebase/core APIs
- Creates a draft PR for immediate visibility using CLI bridge with fallback
- Performs intelligent cascading for milestone and initiative transitions using CascadeHelper
- Handles error recovery gracefully without blocking git operations

**Key CLI Bridge Integration**:
- Uses `cliBridge.executeCommand('gh', ['pr', 'create', '--draft', ...])` for PR creation
- Implements graceful fallback pattern: CLI bridge → direct execSync if bridge fails
- Leverages CascadeHelper for milestone/initiative in_progress cascading
- Enhanced error handling ensures git operations continue even if CLI bridge fails

### Pre-Commit Hook

Triggered before a commit is created. The hook:
- Only runs on artifact branches (skips validation on main/feature branches)
- Validates commit message format (artifact ID prefix required)
- Ensures artifact ID matches the current branch
- Checks for conventional commit format

### Pre-Push Hook

Triggered before changes are pushed to remote. The hook:
- Validates branch naming conventions
- Ensures artifact is not in completed or archived state
- Warns about uncommitted changes (but allows push)
- Allows push for non-artifact branches

📖 **Detailed Documentation**: See [pre-push-detailed.md](./pre-push-detailed.md) for comprehensive implementation details and @kodebase/core integration examples.

### Post-Merge Hook

Triggered after a successful merge. The hook:
- Only runs on main/master branches
- Extracts the merged branch name from commit message using CLI bridge with fallback
- Adds a `completed` event to the artifact using @kodebase/core APIs
- Triggers cascade completion checks using CascadeHelper
- Uses CLI bridge for git reflog commands with graceful fallback to direct execution

**Key CLI Bridge Integration**:
- Uses `cliBridge.executeCommand('git', ['reflog', ...])` for branch extraction
- Implements fallback pattern: CLI bridge → direct execSync if bridge fails
- Maintains git operation flow even if CLI bridge encounters issues
- Enhanced error handling with structured error messages

📖 **Detailed Documentation**: See [post-merge-detailed.md](./post-merge-detailed.md) for comprehensive cascade logic, CascadeEngine integration, and advanced implementation patterns.

## @kodebase/core Integration

All hooks have been integrated with @kodebase/core APIs for direct state management, replacing previous CLI-based operations. Additionally, hooks now use the CLI bridge for external command execution with graceful fallback mechanisms.

### ArtifactLoader Utility

The `ArtifactLoader` class provides a unified interface for artifact file operations:

```typescript
import { ArtifactLoader } from './artifact-loader';

const loader = new ArtifactLoader();

// Load artifact with parsing and validation
const artifact = await loader.loadArtifact('A.1.5', repoPath);

// Save artifact back to file with proper formatting
await loader.saveArtifact(artifact, 'A.1.5', repoPath);

// Get git user information for event attribution
const actor = await loader.getGitActor(repoPath);
console.log(actor); // "John Doe (john@example.com)"
```

#### Methods

**`loadArtifact(artifactId: string, repoPath: string): Promise<Artifact>`**
- Loads and parses artifact YAML file using @kodebase/core `ArtifactParser`
- Automatically determines artifact type (initiative/milestone/issue) from ID format
- Validates artifact structure using `ArtifactValidator`
- Throws error if file not found or validation fails

**`saveArtifact(artifact: Artifact, artifactId: string, repoPath: string): Promise<void>`**
- Saves artifact to YAML file with consistent formatting
- Preserves proper field ordering for readability
- Creates directories if they don't exist
- Uses 2-space indentation and flow style for arrays

**`getGitActor(repoPath: string): Promise<string>`**
- Retrieves git user.name and user.email from repository config
- Formats as "Name (email)" for consistent event attribution
- Falls back to "Unknown User" if git config missing

**`getArtifactFilePath(artifactId: string, repoPath: string): string`**
- Resolves artifact file path using standard Kodebase directory structure
- Supports nested artifact paths (A.1.5 → initiatives/A/milestones/1/issues/5.yml)

### State Management APIs

Hooks now use @kodebase/core APIs directly:

```typescript
import { performTransition, canTransition, getCurrentState } from '@kodebase/core';
import { ArtifactLoader } from './artifact-loader';

const loader = new ArtifactLoader();

// Load artifact
const artifact = await loader.loadArtifact('A.1.5', repoPath);

// Check current state
const currentState = getCurrentState(artifact.metadata.events);
console.log(`Current state: ${currentState}`);

// Validate transition
if (canTransition(artifact, 'completed')) {
  // Get actor for event attribution
  const actor = await loader.getGitActor(repoPath);

  // Perform state transition
  performTransition(artifact, 'completed', actor);

  // Save updated artifact
  await loader.saveArtifact(artifact, 'A.1.5', repoPath);
}
```

### Hook Implementation Pattern

All hooks follow this pattern for @kodebase/core integration with CLI bridge support:

```typescript
import { CLIBridge } from '../cli-bridge';

export class ExampleHook {
  private artifactLoader: ArtifactLoader;
  private cliBridge: CLIBridge;

  constructor() {
    this.artifactLoader = new ArtifactLoader();
    this.cliBridge = new CLIBridge();
  }

  async run(context: HookContext): Promise<HookResult> {
    try {
      // Extract artifact ID from context
      const artifactId = this.extractArtifactId(context);

      // Load artifact using @kodebase/core
      const artifact = await this.artifactLoader.loadArtifact(artifactId, context.repoPath);

      // Perform validation/transition using @kodebase/core APIs
      if (canTransition(artifact, 'new_state')) {
        const actor = await this.artifactLoader.getGitActor(context.repoPath);
        performTransition(artifact, 'new_state', actor);
        await this.artifactLoader.saveArtifact(artifact, artifactId, context.repoPath);
      }

      // Execute CLI commands with fallback
      try {
        const result = await this.cliBridge.executeCommand('gh', ['pr', 'create', '--draft']);
        if (result.success) {
          console.log('✅ PR created via CLI bridge');
        }
      } catch (error) {
        console.warn('CLI bridge failed, falling back to direct execution:', error);
        // Fallback to direct execution
        execSync('gh pr create --draft', { encoding: 'utf-8' });
      }

      return { exitCode: 0, message: 'Success', continue: true };
    } catch (error) {
      return { exitCode: 1, message: error.message, continue: false };
    }
  }
}
```

### Error Handling

All hooks use the centralized error handling system with enhanced messaging:

**Structured Error Messages:**
- **Problem Description**: Clear explanation of what went wrong
- **Actionable Solutions**: Specific steps to resolve the issue
- **Documentation Links**: Direct links to relevant troubleshooting guides
- **Error Categorization**: Differentiates user errors, system failures, and external issues

**Common Error Scenarios:**
- **Artifact Not Found**: File path suggestions and existence checks
- **Invalid Artifact ID**: Format validation with examples
- **Git Config Missing**: Setup instructions and fallback behavior
- **Permission Errors**: File system access troubleshooting
- **Network Issues**: GitHub API connectivity guidance
- **State Transition Errors**: Valid transition options and current state info

**Debug Mode:**
Enable detailed error information:
```bash
export KODEBASE_DEBUG=true
git commit  # Shows detailed execution info
```

**Color-Coded Output:**
- 🔴 **Critical**: Blocks operation completely
- 🟠 **Error**: Operation failed but recoverable
- 🟡 **Warning**: Potential issues, operation continues
- 🔵 **Info**: Status information and guidance

### Testing Integration

The `core-integration.test.ts` file contains comprehensive tests:

```bash
# Run integration tests
pnpm test src/hooks/core-integration.test.ts

# Run specific test pattern
pnpm test -t "@kodebase/core Integration"
```

Tests verify:
- Hook → @kodebase/core API integration
- Event system v2.0 schema with trigger-based causation tracking
- Cascade propagation through `CascadeEngine`
- Error handling and graceful degradation
- End-to-end workflows

## Usage

```typescript
import { PostCheckoutHook } from '@kodebase/git-ops';

const hook = new PostCheckoutHook();
const result = await hook.run(context);

if (!result.success) {
  console.error('Hook failed:', result.error);
  process.exit(1);
}
```

## Hook Context

Each hook receives a context object with:
- `hookType`: The type of Git hook
- `repoPath`: Path to the Git repository
- `args`: Command line arguments passed to the hook
- `env`: Environment variables
- `cwd`: Current working directory

Additional context properties vary by hook type.

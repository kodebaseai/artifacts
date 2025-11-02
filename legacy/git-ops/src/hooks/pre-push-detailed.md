# Pre-Push Hook

The pre-push hook validates artifact state before allowing changes to be pushed to the remote repository using @kodebase/core state management APIs.

## Overview

This hook ensures that artifacts in completed or archived states cannot receive new changes, maintaining the integrity of the artifact lifecycle. The hook uses direct @kodebase/core integration for state validation instead of CLI commands.

## Validation Rules

1. **Non-artifact branches**: Always allowed to push (e.g., feature branches, hotfixes)
2. **Artifact branches**:
   - ✅ Allowed states: `draft`, `ready`, `in_progress`, `in_review`
   - ❌ Blocked states: `completed`, `archived`
3. **Uncommitted changes**: Warns but allows push

## Usage

The hook is automatically triggered by Git before any push operation:

```bash
git push origin A.1.5
# Hook validates artifact A.1.5 status
# If in_progress: push proceeds
# If completed: push is blocked
```

## Context

The hook receives:
- `remoteName`: Name of the remote (e.g., 'origin')
- `remoteUrl`: URL of the remote repository
- `refs`: Array of references being pushed, each containing:
  - `localRef`: Local reference name
  - `localSha`: Local commit SHA
  - `remoteRef`: Remote reference name
  - `remoteSha`: Remote commit SHA (000000 for new branches)

## Implementation Details

```typescript
const hook = new PrePushHook();
const result = await hook.run({
  hookType: 'pre-push',
  repoPath: '/path/to/repo',
  remoteName: 'origin',
  remoteUrl: 'https://github.com/org/repo.git',
  refs: [{
    localRef: 'refs/heads/A.1.5',
    localSha: 'abc123',
    remoteRef: 'refs/heads/A.1.5',
    remoteSha: '000000'
  }]
});
```

## @kodebase/core Integration

The pre-push hook uses @kodebase/core APIs for state validation:

### State Validation Process

1. **Load Artifact**: Uses `ArtifactLoader` to load and parse artifact file
2. **Check Current State**: Uses `getCurrentState()` to determine artifact state
3. **Validate Push**: Allows push only for valid states

### Implementation

```typescript
import { getCurrentState } from '@kodebase/core';
import { ArtifactLoader } from '../artifact-loader';

export class PrePushHook {
  private artifactLoader: ArtifactLoader;

  constructor() {
    this.artifactLoader = new ArtifactLoader();
  }

  async validateArtifactState(artifactId: string, repoPath: string): Promise<boolean> {
    try {
      // Load artifact using @kodebase/core
      const artifact = await this.artifactLoader.loadArtifact(artifactId, repoPath);

      // Get current state
      const currentState = getCurrentState(artifact.metadata.events);

      // Check if state allows push
      const allowedStates = ['draft', 'ready', 'in_progress', 'in_review'];
      return allowedStates.includes(currentState);
    } catch (error) {
      console.error('Failed to validate artifact state:', error);
      return false; // Block push on error
    }
  }
}
```

### Benefits Over CLI

- **Performance**: Direct API calls instead of spawning CLI processes
- **Type Safety**: Full TypeScript integration with compile-time validation
- **Reliability**: No dependency on external CLI availability
- **Error Handling**: Detailed error information from @kodebase/core APIs

## Exit Codes

- `0` (SUCCESS): Push allowed
- `1` (ERROR): Push blocked due to validation failure

## Examples

### Successful Push
```
$ git push origin A.1.5
✓ Artifact A.1.5 is in_progress, push allowed
```

### Blocked Push
```
$ git push origin A.1.5
Cannot push to completed artifact: A.1.5
error: failed to push some refs to 'origin'
```

### Warning About Uncommitted Changes
```
$ git push origin A.1.5
⚠️  Warning: You have uncommitted changes that will not be pushed
✓ Artifact A.1.5 is in_progress, push allowed
```

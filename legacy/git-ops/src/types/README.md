# Git Operations Types

This directory contains the TypeScript type definitions for the `@kodebase/git-ops` package. These types provide compile-time safety and serve as contracts for git operations, hooks, branch management, and automation.

## Overview

The type system provides:
- **Type safety** for all git operations
- **Clear contracts** for hook implementations
- **Platform-agnostic** interfaces for git automation
- **Comprehensive coverage** of branch and PR workflows

## Architecture

```
types/
├── constants.ts    # Git-related constants and enums
├── hooks.ts       # Hook context and handler types
├── branch.ts      # Branch management types
├── automation.ts  # PR and automation types
└── index.ts       # Public type exports
```

### Constants (`constants.ts`)

Defines constant objects for git operations:

```typescript
// Git hook types
export const CGitHook = {
  POST_CHECKOUT: 'post-checkout',
  PRE_COMMIT: 'pre-commit',
  PRE_PUSH: 'pre-push',
  POST_MERGE: 'post-merge'
} as const;

// Type alias
export type TGitHook = (typeof CGitHook)[keyof typeof CGitHook];
```

#### Available Constants:
- **`CGitHook`**: Git hook types (post-checkout, pre-commit, etc.)
- **`CHookExitCode`**: Hook exit codes (success, error, skip)
- **`CBranchProtection`**: Protection levels (none, basic, strict)
- **`CPRState`**: PR states (draft, ready, review, merged, etc.)
- **`CCommitType`**: Conventional commit types (feat, fix, docs, etc.)
- **`CGitPlatform`**: Git platforms (github, gitlab, bitbucket, local)
- **`CMergeStrategy`**: Merge strategies (squash, merge, rebase, cherry-pick)

### Hook Types (`hooks.ts`)

Types for git hook implementations:

#### Core Types

**`HookContext`**: Base context for all hooks
- Contains hook type, repo path, arguments, and environment
- Extended by specific hook contexts

**`HookResult`**: Standard hook execution result
- Exit code, message, and continuation flag
- Enables consistent hook responses

**`HookHandler<T>`**: Generic hook handler function type
- Async or sync execution support
- Type-safe context parameter

#### Hook-Specific Contexts

**`PostCheckoutContext`**: Branch checkout detection
```typescript
interface PostCheckoutContext extends HookContext {
  previousHead: string;
  newHead: string;
  isBranchCheckout: boolean;
}
```

**`PreCommitContext`**: Commit validation
```typescript
interface PreCommitContext extends HookContext {
  stagedFiles: string[];
  commitMessagePath?: string;
}
```

**`PrePushContext`**: Push validation
```typescript
interface PrePushContext extends HookContext {
  remoteName: string;
  remoteUrl: string;
  refs: PushRef[];
}
```

**`PostMergeContext`**: Merge completion
```typescript
interface PostMergeContext extends HookContext {
  isSquash: boolean;
  mergedBranch?: string;
  mergeCommit: string;
}
```

### Branch Types (`branch.ts`)

Types for branch management operations:

#### Validation
- **`BranchValidationResult`**: Branch name validation outcome
- Includes validity, error messages, and extracted artifact info

#### Creation & Management
- **`BranchCreateOptions`**: Options for creating branches
- **`BranchInfo`**: Comprehensive branch information
- **`BranchProtectionRules`**: Protection configuration

#### Cleanup
- **`BranchCleanupOptions`**: Cleanup configuration
- **`BranchCleanupResult`**: Cleanup operation results

#### Merging
- **`BranchMergeOptions`**: Merge operation configuration
- Supports all merge strategies from constants

### Automation Types (`automation.ts`)

Types for PR management and status automation:

#### Pull Requests
- **`PRCreateOptions`**: PR creation configuration
- **`PRUpdateOptions`**: PR update parameters
- **`PRInfo`**: Comprehensive PR information

#### Status Management
- **`StatusTransition`**: Artifact status change request
- **`StatusUpdateResult`**: Status update outcome
- **`CascadeEffect`**: Cascade effect information

#### Platform Abstraction
- **`GitPlatformAdapter`**: Interface for platform implementations
- **`AutomationConfig`**: Automation configuration

## Usage Examples

### Using Hook Types

```typescript
import type { PostCheckoutContext, HookResult } from '@kodebase/git-ops/types';
import { CHookExitCode } from '@kodebase/git-ops/types';

async function handlePostCheckout(context: PostCheckoutContext): Promise<HookResult> {
  if (!context.isBranchCheckout) {
    return {
      exitCode: CHookExitCode.SKIP,
      continue: true,
      message: 'File checkout - skipping'
    };
  }

  // Handle branch checkout
  return {
    exitCode: CHookExitCode.SUCCESS,
    continue: true,
    message: 'Branch checkout processed'
  };
}
```

### Using Branch Types

```typescript
import type { BranchCreateOptions, BranchInfo } from '@kodebase/git-ops/types';

const options: BranchCreateOptions = {
  artifactId: 'A.1.5',
  baseBranch: 'main',
  checkout: true,
  push: true,
  track: true
};

async function createIssueBranch(options: BranchCreateOptions): Promise<BranchInfo> {
  // Implementation
}
```

### Using Automation Types

```typescript
import type { PRCreateOptions, GitPlatformAdapter } from '@kodebase/git-ops/types';
import { CGitPlatform } from '@kodebase/git-ops/types';

class GitHubAdapter implements GitPlatformAdapter {
  platform = CGitPlatform.GITHUB;
  
  async createPR(options: PRCreateOptions): Promise<PRInfo> {
    // GitHub-specific implementation
  }
  
  // ... other methods
}
```

## Type Guards

Common type guard patterns:

```typescript
import type { HookContext, PostCheckoutContext } from '@kodebase/git-ops/types';
import { CGitHook } from '@kodebase/git-ops/types';

function isPostCheckoutContext(context: HookContext): context is PostCheckoutContext {
  return context.hookType === CGitHook.POST_CHECKOUT;
}
```

## Best Practices

1. **Import types explicitly** using `import type` for better tree-shaking
2. **Use constants** instead of string literals for enums
3. **Extend interfaces** when adding features to maintain compatibility
4. **Document with JSDoc** for better IDE support
5. **Avoid `any`** - use specific types or `unknown`
6. **Use type guards** for runtime type narrowing

## Naming Conventions

### Prefixes
- **`C`**: Constant objects (e.g., `CGitHook`)
- **`T`**: Type aliases from constants (e.g., `TGitHook`)
- No prefix for interfaces (implicit)

### Case Styles
- **PascalCase**: Types and interfaces
- **camelCase**: Properties and functions
- **UPPER_SNAKE_CASE**: Constant values

## Related Documentation

- [Hooks Documentation](../hooks/README.md) - Hook implementations
- [Branch Documentation](../branch/README.md) - Branch management
- [Automation Documentation](../automation/README.md) - PR and status automation
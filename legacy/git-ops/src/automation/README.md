# Git Automation

This module provides automation utilities for Pull Request management and other Git operations.

## PRManager

The `PRManager` class provides a high-level interface for managing Pull Requests using the GitHub CLI (`gh`).

### Features

- Create draft and regular PRs with automatic artifact ID prefixing
- Update PR titles, bodies, and status
- Merge PRs with different strategies (merge, squash, rebase)
- Query PR information and list PRs with filters
- Automatic PR number extraction from URLs

### Usage

```typescript
import { PRManager } from '@kodebase/git-ops';

const manager = new PRManager();

// Create a draft PR
const result = await manager.createDraftPR({
  branch: 'A.1.5',
  title: 'Implement email validation',
  body: 'This PR implements email validation as per issue A.1.5',
  draft: true,
  repoPath: process.cwd(),
  assignees: ['user1'],
  reviewers: ['reviewer1', 'reviewer2']
});

if (result.success) {
  console.log(`Created PR #${result.prNumber}: ${result.prUrl}`);
}

// Update PR to mark as ready
await manager.updatePR({
  prNumber: result.prNumber!,
  ready: true,
  repoPath: process.cwd()
});

// Get PR information
const info = await manager.getPRInfo(42, process.cwd());
if (info) {
  console.log(`PR #${info.number}: ${info.title} (${info.state})`);
}

// List PRs for a branch
const prs = await manager.listPRs(process.cwd(), {
  branch: 'A.1.5',
  state: 'open'
});

// Merge a PR
await manager.mergePR(42, process.cwd(), {
  method: 'squash',
  deleteBranch: true
});
```

### Methods

#### `createDraftPR(options: PRCreateOptions)`

Creates a new Pull Request, automatically prefixing the title with the artifact ID from the branch name.

**Options:**
- `branch?: string` - Branch to create PR from (defaults to current branch)
- `title: string` - PR title (will be prefixed with artifact ID)
- `body?: string` - PR description
- `draft?: boolean` - Create as draft PR (default: true)
- `repoPath: string` - Repository path
- `assignees?: string[]` - GitHub usernames to assign
- `reviewers?: string[]` - GitHub usernames to request reviews from

**Returns:**
```typescript
{
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
}
```

#### `updatePR(options: PRUpdateOptions)`

Updates an existing Pull Request.

**Options:**
- `prNumber: number` - PR number to update
- `title?: string` - New title
- `body?: string` - New body
- `ready?: boolean` - Mark PR as ready for review
- `repoPath: string` - Repository path

#### `mergePR(prNumber, repoPath, options?)`

Merges a Pull Request.

**Options:**
- `method?: 'merge' | 'squash' | 'rebase'` - Merge method (default: 'merge')
- `deleteBranch?: boolean` - Delete branch after merge

#### `getPRInfo(prNumber, repoPath)`

Retrieves information about a specific PR.

**Returns:** `PRInfo | null`

#### `listPRs(repoPath, options?)`

Lists Pull Requests with optional filters.

**Options:**
- `branch?: string` - Filter by head branch
- `state?: 'open' | 'closed' | 'merged' | 'all'` - Filter by state

### Requirements

- GitHub CLI (`gh`) must be installed and authenticated
- Repository must have a GitHub remote configured

### Error Handling

All methods return result objects with `success` and `error` fields, allowing for graceful error handling without throwing exceptions.
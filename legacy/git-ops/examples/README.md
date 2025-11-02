# @kodebase/git-ops Examples

This directory contains examples demonstrating how to use the @kodebase/git-ops package.

## Examples

### 1. @kodebase/core Integration (`core-integration-example.ts`) ⭐ **Featured**

**NEW**: Comprehensive example demonstrating complete @kodebase/core integration:
- State management with `performTransition` and `canTransition`
- Cascade engine usage with `CascadeEngine` and `CompletionCascadeAnalyzer`
- End-to-end workflow simulation with hooks
- Real-world artifact lifecycle management
- Error handling and debugging techniques

```bash
npx tsx examples/core-integration-example.ts
```

**Key Features Demonstrated:**
- ✅ Hook installation with @kodebase/core integration
- ✅ State transitions using `performTransition` API
- ✅ Cascade analysis and automatic parent completion
- ✅ Complete git workflow simulation (checkout → commit → merge)
- ✅ Integration health checks and diagnostics

### 2. Basic Workflow (`basic-workflow.ts`)

Demonstrates the complete workflow from hook installation to PR merge:
- Installing git hooks
- Validating artifact IDs
- Creating branches
- Automatic status updates
- PR management

```bash
npx tsx examples/basic-workflow.ts
```

### 3. Hook Management (`hook-management.ts`)

Shows how to manage git hooks:
- Checking hook status
- Installing specific hooks
- Creating backups
- Uninstalling and restoring

```bash
npx tsx examples/hook-management.ts
```

### 4. PR Automation (`pr-automation.ts`)

Demonstrates Pull Request automation:
- Creating draft PRs
- Updating PR details
- Listing PRs with filters
- Merging PRs with different strategies

```bash
npx tsx examples/pr-automation.ts
```

### 5. Custom Hook Usage (`custom-hook.ts`)

Shows how to use hooks programmatically:
- Running individual hooks
- Custom validation workflows
- Hook composition
- Manual hook execution

```bash
npx tsx examples/custom-hook.ts
```

## Prerequisites

Before running these examples:

1. **Initialize a git repository**:
   ```bash
   git init
   git remote add origin https://github.com/your-org/your-repo.git
   ```

2. **Install GitHub CLI** (for PR automation):
   ```bash
   # macOS
   brew install gh

   # Windows
   winget install GitHub.cli

   # Linux
   sudo apt install gh
   ```

3. **Authenticate with GitHub**:
   ```bash
   gh auth login
   ```

4. **Install dependencies**:
   ```bash
   pnpm add @kodebase/git-ops @kodebase/core
   ```

## Running Examples

You can run examples using `tsx` (TypeScript execute):

```bash
# Install tsx if needed
pnpm add -D tsx

# Run an example
npx tsx examples/basic-workflow.ts
```

Or compile and run with TypeScript:

```bash
# Compile
npx tsc examples/basic-workflow.ts

# Run
node examples/basic-workflow.js
```

## Environment Variables

Some examples may use these environment variables:

- `GITHUB_TOKEN`: GitHub personal access token (if not using `gh` CLI)
- `GIT_PLATFORM`: Git platform (default: 'github')
- `KODEBASE_HOOKS_ENABLED`: Enable/disable hooks (default: true)

## Common Patterns

### Error Handling

All operations return result objects for graceful error handling:

```typescript
const result = await operation();
if (!result.success) {
  console.error('Operation failed:', result.error);
  return;
}
```

### Checking Hook Status

Before installing hooks, check current status:

```typescript
const status = await installer.status(repoPath);
const hasKodebaseHooks = status.some(h => h.installed && h.isKodebase);
```

### Branch Validation

Always validate artifact IDs before creating branches:

```typescript
const validation = validator.validate(artifactId);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

## Troubleshooting

### Hook Not Triggering

1. Check if hooks are executable:
   ```bash
   chmod +x .git/hooks/*
   ```

2. Verify hook installation:
   ```typescript
   const status = await installer.status(repoPath);
   console.table(status);
   ```

### PR Creation Fails

1. Ensure you're authenticated:
   ```bash
   gh auth status
   ```

2. Check remote configuration:
   ```bash
   git remote -v
   ```

### Permission Errors

Run with appropriate permissions or use sudo (Linux/macOS):
```bash
sudo npx tsx examples/hook-management.ts
```

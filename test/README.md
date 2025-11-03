# @kodebase/artifacts Testing Guide

This guide covers how to write and run tests for the `@kodebase/artifacts` package.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Infrastructure](#test-infrastructure)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

## Test Infrastructure

### Test Utilities

The test infrastructure provides several utility modules to make testing easier:

#### 1. Filesystem Mocking (`test/utils/filesystem-mock.ts`)

Utilities for working with the in-memory filesystem (memfs):

```typescript
import {
  setupMockFs,
  resetMockFs,
  writeMockFile,
  readMockFile,
  createMockDirectory,
  mockFileExists,
  getMockFsStructure,
} from '../test/utils/filesystem-mock.js';

// In your test file
beforeEach(() => {
  const baseDir = setupMockFs(); // Returns /test-workspace
});

afterEach(() => {
  resetMockFs(); // Clean up after each test
});
```

#### 2. Fixture Loading (`test/utils/fixture-loader.ts`)

Load test fixtures from the `@kodebase/core` package (A.9.1 artifacts-tree):

```typescript
import {
  loadArtifactFixture,
  loadArtifactTree,
  createTestArtifact,
  FIXTURES,
} from '../test/utils/fixture-loader.js';

// Load a single fixture
const artifact = await loadArtifactFixture(FIXTURES.ARTIFACTS.ISSUE_VALID);

// Load an entire artifact tree
const tree = await loadArtifactTree(FIXTURES.TREES.CASCADE_INITIATIVE);

// Create a test artifact with defaults
const testArtifact = createTestArtifact('issue', {
  title: 'Custom Title',
  summary: 'Custom summary',
});
```

**Available Fixtures:**

- `FIXTURES.ARTIFACTS.INITIATIVE_VALID` - Valid initiative in YAML
- `FIXTURES.ARTIFACTS.MILESTONE_VALID` - Valid milestone in YAML
- `FIXTURES.ARTIFACTS.ISSUE_VALID` - Valid issue in YAML
- `FIXTURES.ARTIFACTS.ISSUE_LIFECYCLE_VALID` - Issue with lifecycle events
- `FIXTURES.TREES.CASCADE_INITIATIVE` - Complex hierarchy for integration tests
- `FIXTURES.TREES.LOADER_ENHANCEMENTS` - Another test hierarchy

#### 3. Temp Directory Management (`test/utils/temp-directory.ts`)

Manage isolated temporary directories for tests:

```typescript
import {
  createTempDir,
  cleanupTempDir,
  cleanupAllTempDirs,
  withTempDir,
  createTempStructure,
} from '../test/utils/temp-directory.js';

// Manual management
const tempDir = createTempDir('my-test');
// ... use tempDir ...
cleanupTempDir(tempDir);

// Automatic cleanup with RAII pattern
await withTempDir(async (tempDir) => {
  // tempDir is created
  // ... use tempDir ...
  // tempDir is automatically cleaned up
});

// Create nested structure
const tempDir = createTempDir();
createTempStructure(tempDir, [
  'src/components',
  'src/utils',
  'test/fixtures'
]);
```

#### 4. Test Helpers (`test/setup/test-helpers.ts`)

Common test setup and custom assertions:

```typescript
import {
  createTestContext,
  createTestHierarchy,
  expectArtifactValid,
  expectArtifactType,
  waitFor,
} from '../test/setup/test-helpers.js';

// Standard test context
let ctx: TestContext;

beforeEach(() => {
  ctx = createTestContext(); // Sets up mock filesystem
  // ctx.baseDir -> /test-workspace
  // ctx.artifactDir -> /test-workspace/.kodebase/artifacts
});

// Create a test hierarchy
const paths = await createTestHierarchy(ctx.baseDir, {
  initiative: { title: 'Test Initiative', id: 'A' },
  milestones: [
    { title: 'Milestone 1', id: 'A.1', parentId: 'A' },
  ],
  issues: [
    { title: 'Issue 1', id: 'A.1.1', parentId: 'A.1' },
  ],
});

// Custom assertions
expectArtifactValid(artifact); // Checks required fields
expectArtifactType(artifact, 'issue'); // Checks artifact type

// Wait for async condition
await waitFor(() => someCondition === true, 1000);
```

### Mocking Strategy

All tests use `memfs` to mock the filesystem, avoiding disk I/O:

```typescript
import { vol } from 'memfs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Mock node:fs/promises at the top of your test file
vi.mock('node:fs/promises', async () => {
  const { fs } = await import('memfs');
  return {
    default: fs.promises,
  };
});

describe('YourService', () => {
  beforeEach(() => {
    vol.reset(); // Clear filesystem
    vol.mkdirSync('/test-workspace', { recursive: true });
  });

  afterEach(() => {
    vol.reset(); // Clean up
  });
});
```

## Writing Tests

### Standard Test Structure

```typescript
import path from 'node:path';
import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { YourService } from './your-service.js';
import { createTestContext } from '../test/setup/test-helpers.js';

// Mock filesystem
vi.mock('node:fs/promises', async () => {
  const { fs } = await import('memfs');
  return { default: fs.promises };
});

describe('YourService', () => {
  let ctx: TestContext;
  let service: YourService;

  beforeEach(() => {
    ctx = createTestContext();
    service = new YourService();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('methodName', () => {
    it('should handle typical case', async () => {
      // Arrange
      const input = 'test-input';

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBe('expected-output');
    });

    it('should handle edge case', async () => {
      // Test edge cases
    });

    it('should throw error on invalid input', async () => {
      // Test error handling
      await expect(service.methodName('')).rejects.toThrow();
    });
  });
});
```

### Integration Tests

For integration tests that need complex artifact hierarchies:

```typescript
import { loadArtifactTree, FIXTURES } from '../test/utils/fixture-loader.js';
import { createTestHierarchy } from '../test/setup/test-helpers.js';

describe('Integration: Complex Operations', () => {
  it('should process entire artifact tree', async () => {
    // Load fixture tree from A.9.1
    const artifacts = await loadArtifactTree(FIXTURES.TREES.CASCADE_INITIATIVE);

    // Process the tree
    const result = await processArtifacts(artifacts);

    expect(result).toBeDefined();
  });

  it('should handle cross-artifact operations', async () => {
    // Create custom hierarchy for test
    const ctx = createTestContext();
    const paths = await createTestHierarchy(ctx.baseDir, {
      initiative: { title: 'Initiative', id: 'A' },
      milestones: [
        { title: 'M1', id: 'A.1', parentId: 'A' },
        { title: 'M2', id: 'A.2', parentId: 'A' },
      ],
    });

    // Test operations across artifacts
    const service = new ArtifactService();
    const artifacts = await service.loadAll(ctx.baseDir);

    expect(artifacts).toHaveLength(3);
  });
});
```

### Performance Tests

For performance-sensitive operations:

```typescript
import { describe, it, expect } from 'vitest';
import { loadArtifactTree } from '../test/utils/fixture-loader.js';

describe('Performance: Large Artifact Trees', () => {
  it('should process 1000+ artifacts in <1s', async () => {
    const startTime = performance.now();

    // Load large fixture
    const artifacts = await loadArtifactTree(FIXTURES.TREES.CASCADE_INITIATIVE);

    // Process artifacts
    const result = await processLargeTree(artifacts);

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(1000);
    expect(result).toBeDefined();
  }, 5000); // 5s timeout
});
```

## Running Tests

### Local Development

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests with interactive UI
pnpm test:ui

# Run specific test file
pnpm test src/artifact-service.test.ts

# Run tests matching a pattern
pnpm test --grep "ArtifactService"
```

### CI/CD

Tests run automatically in CI on every PR:

```bash
# This runs in CI (see .github/workflows/ci.yml)
pnpm test
```

Coverage reports are uploaded as CI artifacts and retained for 30 days.

## Coverage Requirements

The package enforces the following coverage thresholds (configured in [vitest.config.ts](../vitest.config.ts)):

- **Lines**: 90%
- **Functions**: 90%
- **Branches**: 80%
- **Statements**: 90%

### Viewing Coverage

```bash
# Generate coverage report
pnpm test:coverage

# Coverage reports are generated in:
# - coverage/index.html (HTML report - open in browser)
# - coverage/lcov.info (LCOV format for CI)
```

### Improving Coverage

1. Run coverage report to identify gaps:
   ```bash
   pnpm test:coverage
   open coverage/index.html
   ```

2. Add tests for uncovered code paths:
   - Untested functions
   - Uncovered branches (if/else, switch cases)
   - Error handling paths

3. Focus on critical paths first:
   - Public API methods
   - Error handling
   - Edge cases

## Best Practices

### 1. Test Isolation

Each test should be completely independent:

```typescript
beforeEach(() => {
  // Reset state before EACH test
  vol.reset();
  ctx = createTestContext();
});

afterEach(() => {
  // Clean up after EACH test
  vol.reset();
  cleanupAllTempDirs();
});
```

### 2. Descriptive Test Names

Use clear, specific test names:

```typescript
// Good ✓
it('should create artifact with proper directory structure', async () => {});
it('should throw ArtifactNotFoundError when artifact does not exist', async () => {});

// Bad ✗
it('should work', async () => {});
it('test create', async () => {});
```

### 3. Arrange-Act-Assert Pattern

Structure tests with clear sections:

```typescript
it('should update artifact title', async () => {
  // Arrange: Set up test data
  const artifact = createTestArtifact('issue', { title: 'Old Title' });
  const service = new ArtifactService();

  // Act: Perform the operation
  await service.update(artifact.metadata.id, { title: 'New Title' });

  // Assert: Verify the results
  const updated = await service.get(artifact.metadata.id);
  expect(updated.metadata.title).toBe('New Title');
});
```

### 4. Test Error Cases

Always test error handling:

```typescript
it('should throw when artifact ID is invalid', async () => {
  const service = new ArtifactService();

  await expect(
    service.get('invalid-id')
  ).rejects.toThrow(ArtifactNotFoundError);
});
```

### 5. Use Test Utilities

Prefer test utilities over manual setup:

```typescript
// Good ✓
const ctx = createTestContext();
const artifact = createTestArtifact('issue');

// Bad ✗
vol.reset();
vol.mkdirSync('/test-workspace', { recursive: true });
const artifact = scaffoldIssue({ /* many fields */ });
```

### 6. Keep Tests Fast

- Use in-memory filesystem (memfs) instead of real disk I/O
- Avoid unnecessary delays or timeouts
- Use `withTempDir` for automatic cleanup
- Mock external dependencies

### 7. Test Public API

Focus on testing public interfaces, not implementation details:

```typescript
// Good ✓ - Tests public API
it('should return artifact by ID', async () => {
  const service = new ArtifactService();
  const artifact = await service.get('A.1');
  expect(artifact.metadata.id).toBe('A.1');
});

// Bad ✗ - Tests internal implementation
it('should call internal _parseFile method', async () => {
  // Don't test private methods directly
});
```

### 8. Use Fixtures for Complex Data

Leverage the fixture loader for realistic test data:

```typescript
// Good ✓
const artifact = await loadArtifactFixture(FIXTURES.ARTIFACTS.ISSUE_VALID);

// Acceptable ✓
const artifact = createTestArtifact('issue', { title: 'Custom' });

// Bad ✗ - Too verbose for simple tests
const artifact = scaffoldIssue({
  title: 'Test',
  description: 'Test',
  acceptanceCriteria: ['Test'],
  createdBy: 'Test User (test@example.com)',
});
```

## Troubleshooting

### Tests Hanging

If tests hang indefinitely:

1. Check for missing `await` keywords on async operations
2. Verify cleanup happens in `afterEach`
3. Look for uncaught promise rejections

### Mock Filesystem Issues

If files aren't being found:

1. Ensure `vi.mock('node:fs/promises')` is at the top of your test file
2. Call `vol.reset()` in `beforeEach` and `afterEach`
3. Use absolute paths (starting with `/`)
4. Debug with `getMockFsStructure()` to see filesystem state

### Coverage Not Meeting Threshold

1. Run `pnpm test:coverage` and open `coverage/index.html`
2. Identify uncovered lines (highlighted in red)
3. Add tests for those code paths
4. Consider if the code is actually reachable (dead code elimination)

### Type Errors in Tests

1. Ensure `tsconfig.test.json` is properly configured
2. Import types from `@kodebase/core`
3. Use `type` imports for type-only imports
4. Check that test utilities are properly typed

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [memfs Documentation](https://github.com/streamich/memfs)
- [@kodebase/core Test Fixtures](../../core/test/fixtures/)
- [Kodebase Testing Guidelines](../../docs/testing.md)

## Questions?

If you have questions about testing:

1. Check this README first
2. Look at existing test files for examples
3. Check the test utilities source code
4. Ask the team on Slack

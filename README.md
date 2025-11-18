# @kodebase/artifacts

[![npm version](https://img.shields.io/npm/v/@kodebase/artifacts.svg?style=flat-square)](https://www.npmjs.com/package/@kodebase/artifacts)
[![npm downloads](https://img.shields.io/npm/dm/@kodebase/artifacts.svg?style=flat-square)](https://www.npmjs.com/package/@kodebase/artifacts)
[![CI status](https://img.shields.io/github/actions/workflow/status/kodebaseai/kodebase/ci.yml?branch=main&style=flat-square)](https://github.com/kodebaseai/kodebase/actions)

High-level artifact operations for Kodebase. Provides CRUD services, tree traversal, dependency graph analysis, readiness validation, query filtering, and user-friendly error formatting for Initiatives, Milestones, and Issues.

## Overview

`@kodebase/artifacts` is a service layer built on top of [@kodebase/core](https://www.npmjs.com/package/@kodebase/core) that provides high-level operations for managing Kodebase artifacts. While `@kodebase/core` handles low-level parsing, validation, and I/O, this package orchestrates complex workflows like ID allocation, scaffolding, tree traversal, dependency resolution, and readiness checks.

### Architecture

```
┌──────────────────────────────────────────────────┐
│                  CLI / Web UI                    │
│         (@kodebase/cli, custom tools)            │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│            @kodebase/artifacts                   │
│  • ArtifactService (CRUD operations)             │
│  • QueryService (tree traversal, filtering)      │
│  • DependencyGraphService (graph analysis)       │
│  • ReadinessService (workflow validation)        │
│  • ValidationService (orchestrated checks)       │
│  • ScaffoldingService (artifact creation)        │
│  • IdAllocationService (unique ID generation)    │
│  • ContextService (project detection)            │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│              @kodebase/core                      │
│  • Schemas (Zod validation)                      │
│  • Parser (YAML ↔ TypeScript)                    │
│  • State Machine (lifecycle transitions)         │
│  • I/O (file read/write)                         │
│  • Cascade Engine (automation)                   │
└──────────────────────────────────────────────────┘
```

### When to Use This Package

Use `@kodebase/artifacts` when you need:
- **High-level operations**: Creating, reading, updating artifacts with automatic path resolution
- **Complex queries**: Tree traversal, filtering by state/assignee/priority
- **Workflow validation**: Dependency checking, readiness validation, state transitions
- **ID management**: Auto-allocating sequential IDs, slug generation
- **Developer experience**: User-friendly error messages, CLI-ready formatting

Use `@kodebase/core` directly when you need:
- **Low-level control**: Custom validation logic, manual YAML parsing
- **Building blocks**: Implementing your own service layer
- **Performance**: Skipping service layer overhead for batch operations

## Installation

```bash
pnpm add @kodebase/artifacts
# or
npm install @kodebase/artifacts
```

**Dependencies**: This package requires `@kodebase/core` which is automatically installed as a dependency.

## Public API

### ArtifactService

High-level service for artifact CRUD operations with automatic directory structure handling.

```ts
import { ArtifactService } from "@kodebase/artifacts";
import { scaffoldInitiative } from "@kodebase/core";

const service = new ArtifactService();

// Create an artifact
const initiative = scaffoldInitiative({
  title: "New Initiative",
  createdBy: "Alice (alice@example.com)",
  vision: "Build something great",
  scopeIn: ["Feature A"],
  scopeOut: ["Feature B"],
  successCriteria: ["All tests pass"]
});

const filePath = await service.createArtifact({
  id: "A",
  artifact: initiative,
  slug: "new-initiative"
});

// Get an artifact
const artifact = await service.getArtifact({
  id: "A",
  slug: "new-initiative"
});

// Update metadata
const updated = await service.updateMetadata({
  id: "A",
  updates: {
    priority: CPriority.HIGH,
    title: "Updated Title"
  }
});

// Append an event
const withEvent = await service.appendEvent({
  id: "A",
  event: {
    event: "ready",
    timestamp: "2025-11-02T12:00:00Z",
    actor: "Alice (alice@example.com)",
    trigger: CEventTrigger.DEPENDENCIES_MET
  }
});
```

**Methods:**
- `createArtifact(options)` - Creates artifact with proper directory structure
- `getArtifact(options)` - Retrieves artifact by ID and optional slug
- `updateMetadata(options)` - Updates metadata while preserving events
- `appendEvent(options)` - Appends new event to events array

**Throws:**
- `ArtifactNotFoundError` - When artifact file doesn't exist

---

### QueryService

Query and traverse the artifact tree with filtering, tree operations, and dependency graph support.

```ts
import { QueryService } from "@kodebase/artifacts";

const service = new QueryService();

// Tree traversal
const tree = await service.getTree(); // Full hierarchy
const children = await service.getChildren("A.1"); // Direct children of A.1
const ancestors = await service.getAncestors("A.1.3"); // ["A", "A.1"]
const siblings = await service.getSiblings("A.1.3"); // Other A.1.x issues

// Query and filter
const inProgress = await service.findByState(CArtifactEvent.IN_PROGRESS);
const milestones = await service.findByType(CArtifact.MILESTONE);
const aliceWork = await service.findByAssignee("Alice (alice@example.com)");
const critical = await service.findByPriority(CPriority.CRITICAL);

// Complex queries
const results = await service.findArtifacts({
  state: "ready",
  type: CArtifact.ISSUE,
  assignee: "Alice (alice@example.com)",
  priority: CPriority.HIGH
});
```

**Tree Methods:**
- `getTree()` - Returns full artifact hierarchy with lazy loading
- `getChildren(parentId)` - Gets direct children of an artifact
- `getAncestors(id)` - Returns array from root to parent (e.g., [A, A.1] for A.1.3)
- `getSiblings(id)` - Returns artifacts with same parent

**Query Methods:**
- `findByState(state)` - Filter by current state (draft, ready, in_progress, etc.)
- `findByType(type)` - Filter by type (initiative, milestone, issue)
- `findByAssignee(assignee)` - Filter by assignee
- `findByPriority(priority)` - Filter by priority (low, medium, high, critical)
- `findArtifacts(criteria)` - Multi-criteria queries with combinations

**Performance:**
- Filters 1000+ artifacts in <100ms (with warm cache)
- Two-level caching (path cache + artifact cache) for fast repeated queries
- Lazy loading for tree traversal

---

### DependencyGraphService

Operations for dependency graph analysis, blocking relationships, and circular dependency detection.

```ts
import { DependencyGraphService } from "@kodebase/artifacts";

const service = new DependencyGraphService();

// Dependency analysis
const deps = await service.getDependencies("A.1.3"); // Get blocked_by artifacts
const blocked = await service.getBlockedArtifacts("A.1.2"); // What does this block?
const isBlocked = await service.isBlocked("A.1.3"); // Check if ready to work on
const chain = await service.resolveDependencyChain("A.1.5"); // Full transitive closure

// Validation
const hasCircular = await service.hasCircularDependencies("A.1.2");
const crossLevel = await service.hasCrossLevelDependencies("A.1");
const consistent = await service.isRelationshipConsistent("A.1.2", "A.1.3");
```

**Core Methods:**
- `getDependencies(id)` - Returns all artifacts in blocked_by array
- `getBlockedArtifacts(id)` - Returns artifacts where this ID appears in their blocked_by
- `isBlocked(id)` - Returns true if any blocked_by dependency is not completed
- `resolveDependencyChain(id)` - Returns full transitive closure of dependencies

**Validation Methods:**
- `hasCircularDependencies(id)` - Detects circular blocking relationships
- `hasCrossLevelDependencies(id)` - Checks for invalid cross-level dependencies
- `isRelationshipConsistent(id1, id2)` - Validates bidirectional relationship integrity

**Features:**
- BFS with path tracking for circular dependency detection
- Sibling-only constraint enforcement
- Graceful handling of missing dependencies (warns, doesn't crash)
- Performance: resolves 150+ artifact chains in <100ms

---

### ReadinessService

Comprehensive readiness validation for artifact workflow and state transitions.

```ts
import { ReadinessService } from "@kodebase/artifacts";

const service = new ReadinessService();

// Readiness checks
const ready = await service.isReady("A.1.3"); // Can work start?
const allReady = await service.getReadyArtifacts(); // All ready artifacts
const reasons = await service.getBlockingReasons("A.1.3"); // Why not ready?
const canStart = await service.canTransitionToInProgress("A.1.3"); // Valid transition?
```

**Methods:**
- `isReady(id)` - Returns true if artifact is ready to work on (no incomplete blocking siblings + ancestors completed if in ready state)
- `getReadyArtifacts()` - Returns all artifacts ready to work on
- `getBlockingReasons(id)` - Returns array of structured blocking reasons with ancestor diagnostics
- `canTransitionToInProgress(id)` - Validates ready→in_progress state transition

**Validation Rules:**
1. **Sibling dependencies:** No incomplete blocking siblings
2. **Ancestor validation:** Full ancestor chain (Initiative→Milestone→Issue) must be complete if artifact has READY event
3. **State transitions:** Only READY/IN_PROGRESS ancestors allow children to start; IN_REVIEW/COMPLETED block new work

**Integration:**
- Uses DependencyGraphService for sibling dependency checks
- Uses QueryService for parent traversal
- Uses state machine from @kodebase/core for state validation
- Performance: checks 100+ artifacts in <100ms

---

### ValidationService

Orchestrates schema, dependency, and state machine validation with aggregated error reporting.

```ts
import { ValidationService } from "@kodebase/artifacts";

const service = new ValidationService();

// Validate a single artifact
const result = service.validateArtifact(artifact, {
  artifactId: "A.1.1",
  allArtifacts: artifactsMap,
  currentState: "ready",
  nextState: CArtifactEvent.IN_PROGRESS
});

if (!result.valid) {
  result.errors.forEach(err => {
    console.error(`${err.code}: ${err.message}`);
    if (err.suggestedFix) {
      console.log(`  Fix: ${err.suggestedFix}`);
    }
  });
}

// Batch validate all artifacts
const results = service.validateAll({
  artifacts: new Map([
    ["A.1", artifactA1],
    ["A.2", artifactA2]
  ])
});

const failed = results.filter(r => !r.valid);
console.log(`${failed.length} artifacts failed validation`);
```

**Methods:**
- `validateArtifact(artifact, options)` - Validates single artifact through all validators
- `validateAll(options)` - Batch validates multiple artifacts with optimization

**Validation Checks:**
1. **Schema validation** - Zod schemas for initiative/milestone/issue
2. **Dependency validation** - Circular, cross-level, and consistency checks
3. **State machine validation** - Valid state transitions

**Returns:** `ValidationResult` with:
- `artifactId` - Artifact being validated
- `valid` - Boolean indicating pass/fail
- `errors` - Array of validation errors with context
- `warnings` - Array of non-blocking warnings

---

### ScaffoldingService

High-level service for creating artifacts with auto-allocated IDs, generated slugs, and git-based actor detection.

```ts
import { ScaffoldingService, IdAllocationService } from "@kodebase/artifacts";

const idService = new IdAllocationService("/path/.kodebase/artifacts");
const service = new ScaffoldingService(idService);

// Scaffold a new initiative
const { id, artifact, slug } = await service.scaffoldInitiative(
  "Core Package Development",
  {
    vision: "Build production-ready core package",
    scopeIn: ["Types", "Schemas", "Validators"],
    scopeOut: ["CLI", "Web UI"],
    successCriteria: ["Package published", "95%+ test coverage"],
    assignee: "alice@example.com",
    priority: CPriority.HIGH,
    estimation: CEstimationSize.L
  }
);

console.log(id);   // "C" (next available ID)
console.log(slug); // "core-package-development"

// Scaffold a milestone under initiative B
const milestone = await service.scaffoldMilestone("B", "API Implementation", {
  summary: "Implement REST API endpoints",
  deliverables: ["OpenAPI spec", "Rate limiting", "Auth middleware"],
  priority: CPriority.HIGH,
  estimation: CEstimationSize.M
});

// Scaffold an issue under milestone A.1
const issue = await service.scaffoldIssue("A.1", "Fix memory leak", {
  summary: "Memory leak in WebSocket connections",
  acceptanceCriteria: [
    "No memory growth after 1000 connections",
    "All tests pass",
    "Added regression test"
  ],
  priority: CPriority.CRITICAL,
  estimation: CEstimationSize.S
});
```

**Methods:**
- `scaffoldInitiative(title, metadata?)` - Create initiative with auto-allocated ID
- `scaffoldMilestone(parentId, title, metadata?)` - Create milestone under initiative
- `scaffoldIssue(parentId, title, metadata?)` - Create issue under milestone

**Features:**
- Automatically allocates next sequential ID (A, B, ..., Z, AA, AB, ...)
- Generates URL-friendly slugs from titles
- Detects git user info for `createdBy` field
- Provides sensible defaults for all required fields
- Returns ready-to-use artifact objects with `draft` event

**See Also:** [@kodebase/core scaffolding functions](https://www.npmjs.com/package/@kodebase/core#builder--scaffolder) for low-level artifact creation

---

### IdAllocationService

Service for allocating unique sequential IDs for Kodebase artifacts.

```ts
import { IdAllocationService } from "@kodebase/artifacts";

const service = new IdAllocationService("/path/.kodebase/artifacts");

// Allocate next initiative ID
const initiativeId = await service.allocateNextInitiativeId();
// Returns: "A" (or next in sequence: B, C, ..., Z, AA, AB, ...)

// Allocate next milestone ID for initiative B
const milestoneId = await service.allocateNextMilestoneId("B");
// Returns: "B.1" (or B.2, B.3, etc.)

// Allocate next issue ID for milestone A.1
const issueId = await service.allocateNextIssueId("A.1");
// Returns: "A.1.1" (or A.1.2, A.1.3, etc.)
```

**Methods:**
- `allocateNextInitiativeId()` - Returns next initiative ID in sequence
- `allocateNextMilestoneId(parentId)` - Returns next milestone ID for initiative
- `allocateNextIssueId(parentId)` - Returns next issue ID for milestone

**ID Format:**
- **Initiatives**: Single or multiple uppercase letters (A, B, ..., Z, AA, AB, ...)
- **Milestones**: Initiative ID + numeric suffix (A.1, A.2, B.1, ...)
- **Issues**: Milestone ID + numeric suffix (A.1.1, A.1.2, B.2.1, ...)

**Features:**
- Scans filesystem to determine next available ID
- Prevents ID conflicts
- Supports multi-letter initiatives (Z → AA → AB → ... → ZZ → AAA)
- Base-26 conversion algorithm (similar to Excel columns)

---

### ContextService

Service for detecting Kodebase project context and navigating to artifact root.

```ts
import { ContextService, NotInKodebaseProjectError } from "@kodebase/artifacts";

const service = new ContextService();

try {
  // Find .kodebase/artifacts from current directory
  const artifactsPath = await service.findArtifactsRoot();
  console.log(artifactsPath); // "/path/to/project/.kodebase/artifacts"

  // Find from specific starting directory
  const path = await service.findArtifactsRoot("/path/to/nested/dir");
} catch (error) {
  if (error instanceof NotInKodebaseProjectError) {
    console.error("Not in a Kodebase project");
    console.error(`Searched from: ${error.directory}`);
  }
}
```

**Methods:**
- `findArtifactsRoot(startDir?)` - Searches upward for `.kodebase/artifacts` directory

**Features:**
- Walks up directory tree to find project root
- Returns absolute path to artifacts directory
- Throws `NotInKodebaseProjectError` if not in a Kodebase project
- Defaults to `process.cwd()` if no directory specified

**Use Cases:**
- CLI commands that need to work from any subdirectory
- IDEs/editors detecting project context
- Scripts that validate artifact hierarchy

---

### Error Formatting Utilities

User-friendly error messages for CLI output with artifact context and suggested fixes.

```ts
import {
  ArtifactError,
  formatValidationErrors,
  formatValidationWarnings,
  formatSchemaError,
  createUserFriendlyError
} from "@kodebase/artifacts";

// Create custom error with context
const error = new ArtifactError({
  code: "ARTIFACT_NOT_FOUND",
  message: "Artifact file not found",
  artifactId: "A.1.1",
  field: "metadata.relationships.blocks",
  suggestion: "Ensure the artifact exists before referencing it"
});

// Format validation errors for CLI
const errors = [
  {
    code: "RELATIONSHIP_INVALID_ID",
    message: "'invalid' is not a valid artifact ID",
    field: "metadata.relationships.blocks[0]",
    suggestedFix: "Use valid artifact ID format (e.g., A, A.1, A.1.1)"
  }
];

const output = formatValidationErrors(errors, "A.1.1");
console.error(output);
// ❌ Validation failed for artifact A.1.1
//
//   RELATIONSHIP_INVALID_ID (metadata.relationships.blocks[0]):
//     'invalid' is not a valid artifact ID
//     💡 Fix: Use valid artifact ID format (e.g., A, A.1, A.1.1)

// Convert Zod errors to ValidationError format
const zodIssues = zodError.issues;
const validationErrors = formatSchemaError(zodIssues, "A.1.1");

// Wrap unknown errors gracefully
try {
  await dangerousOperation();
} catch (error) {
  throw createUserFriendlyError(error, {
    code: "OPERATION_FAILED",
    artifactId: "A.1.1",
    suggestion: "Check file permissions and try again"
  });
}
```

**Exports:**
- `ArtifactError` - Custom error class with artifact context
- `formatValidationErrors(errors, artifactId?, options?)` - CLI-friendly error output
- `formatValidationWarnings(warnings, artifactId?, options?)` - CLI-friendly warning output
- `formatSchemaError(issues, artifactId?)` - Convert Zod errors to ValidationError
- `createUserFriendlyError(error, options?)` - Wrap any error with context

---

## Real-World Usage Examples

### Building a CLI Command to Create Artifacts

```ts
import {
  ScaffoldingService,
  IdAllocationService,
  ContextService,
  ArtifactService,
  ValidationService,
  formatValidationErrors
} from "@kodebase/artifacts";

async function createIssue(title: string, summary: string) {
  // 1. Find project root
  const contextService = new ContextService();
  const artifactsPath = await contextService.findArtifactsRoot();

  // 2. Scaffold the issue with auto-allocated ID
  const idService = new IdAllocationService(artifactsPath);
  const scaffoldService = new ScaffoldingService(idService);

  const { id, artifact, slug } = await scaffoldService.scaffoldIssue("A.1", title, {
    summary,
    acceptanceCriteria: ["Implementation complete", "Tests pass"],
    priority: CPriority.MEDIUM,
    estimation: CEstimationSize.M
  });

  // 3. Validate before creating
  const validationService = new ValidationService();
  const result = validationService.validateArtifact(artifact, {
    artifactId: id
  });

  if (!result.valid) {
    console.error(formatValidationErrors(result.errors, id));
    process.exit(1);
  }

  // 4. Create the artifact file
  const artifactService = new ArtifactService(artifactsPath);
  const filePath = await artifactService.createArtifact({ id, artifact, slug });

  console.log(`✅ Created issue ${id} at ${filePath}`);
}
```

### Building a Dashboard to Show Ready Work

```ts
import { QueryService, ReadinessService } from "@kodebase/artifacts";

async function getReadyWork() {
  const queryService = new QueryService();
  const readinessService = new ReadinessService();

  // Get all ready artifacts
  const ready = await readinessService.getReadyArtifacts();

  // Group by assignee
  const byAssignee = new Map<string, typeof ready>();

  for (const { id } of ready) {
    const artifact = await queryService.loadArtifact(id);
    const assignee = artifact.metadata.assignee || "Unassigned";

    if (!byAssignee.has(assignee)) {
      byAssignee.set(assignee, []);
    }
    byAssignee.get(assignee)!.push({ id, artifact });
  }

  // Display
  for (const [assignee, items] of byAssignee) {
    console.log(`\n${assignee} (${items.length} ready)`);
    for (const { id, artifact } of items) {
      console.log(`  • ${id}: ${artifact.metadata.title}`);
    }
  }
}
```

### Validating Artifact Tree Before CI Merge

```ts
import {
  ValidationService,
  DependencyGraphService,
  QueryService,
  formatValidationErrors
} from "@kodebase/artifacts";

async function validateTree() {
  const queryService = new QueryService();
  const depService = new DependencyGraphService();
  const validationService = new ValidationService();

  // Load all artifacts
  const tree = await queryService.getTree();
  const allArtifacts = new Map<string, TAnyArtifact>();

  async function collectArtifacts(node: ArtifactTreeNode) {
    allArtifacts.set(node.id, node.artifact);
    for (const child of node.children) {
      await collectArtifacts(child);
    }
  }

  for (const root of tree) {
    await collectArtifacts(root);
  }

  // Batch validate
  const results = validationService.validateAll({ artifacts: allArtifacts });
  const failed = results.filter(r => !r.valid);

  if (failed.length > 0) {
    console.error(`❌ ${failed.length} artifacts failed validation\n`);

    for (const result of failed) {
      console.error(formatValidationErrors(result.errors, result.artifactId));
    }

    process.exit(1);
  }

  // Check for circular dependencies
  for (const [id] of allArtifacts) {
    const hasCircular = await depService.hasCircularDependencies(id);
    if (hasCircular) {
      console.error(`❌ Circular dependency detected in ${id}`);
      process.exit(1);
    }
  }

  console.log("✅ All artifacts valid");
}
```

### Automated State Transitions Based on Dependencies

```ts
import {
  QueryService,
  DependencyGraphService,
  ArtifactService,
  ReadinessService
} from "@kodebase/artifacts";

async function autoTransitionToReady(artifactId: string) {
  const queryService = new QueryService();
  const depService = new DependencyGraphService();
  const artifactService = new ArtifactService();
  const readinessService = new ReadinessService();

  // Check if all dependencies are complete
  const isBlocked = await depService.isBlocked(artifactId);

  if (!isBlocked) {
    // Check if can transition to ready
    const canTransition = await readinessService.canTransitionToInProgress(artifactId);

    if (canTransition) {
      // Add ready event
      await artifactService.appendEvent({
        id: artifactId,
        event: {
          event: "ready",
          timestamp: new Date().toISOString(),
          actor: "automation (automation@kodebase.ai)",
          trigger: CEventTrigger.DEPENDENCIES_MET
        }
      });

      console.log(`✅ Auto-transitioned ${artifactId} to ready`);
    } else {
      const reasons = await readinessService.getBlockingReasons(artifactId);
      console.log(`⏸️  ${artifactId} still blocked:`, reasons);
    }
  }
}
```

---

## Error Handling Patterns

### Graceful Error Handling with Context

```ts
import {
  ArtifactService,
  ArtifactNotFoundError,
  NotInKodebaseProjectError,
  ContextService,
  createUserFriendlyError
} from "@kodebase/artifacts";

async function safeLoadArtifact(id: string) {
  try {
    const contextService = new ContextService();
    const artifactsPath = await contextService.findArtifactsRoot();
    const service = new ArtifactService(artifactsPath);

    return await service.getArtifact({ id });
  } catch (error) {
    if (error instanceof ArtifactNotFoundError) {
      console.error(`❌ Artifact ${error.artifactId} not found`);
      console.error(`   Expected at: ${error.filePath}`);
      console.error(`   💡 Tip: Use 'ls' to list available artifacts`);
      process.exit(1);
    }

    if (error instanceof NotInKodebaseProjectError) {
      console.error("❌ Not in a Kodebase project");
      console.error(`   Searched from: ${error.directory}`);
      console.error(`   💡 Tip: Run 'kodebase init' or navigate to project root`);
      process.exit(1);
    }

    // Wrap unexpected errors with context
    throw createUserFriendlyError(error, {
      code: "LOAD_ARTIFACT_FAILED",
      artifactId: id,
      suggestion: "Check file permissions and artifact structure"
    });
  }
}
```

### Validation Error Handling

```ts
import { ValidationService, formatValidationErrors } from "@kodebase/artifacts";

function handleValidation(artifact: TAnyArtifact, id: string) {
  const service = new ValidationService();
  const result = service.validateArtifact(artifact, { artifactId: id });

  if (!result.valid) {
    // Format errors for CLI output
    const errorOutput = formatValidationErrors(result.errors, id, {
      showField: true,
      showSuggestion: true
    });

    console.error(errorOutput);

    // Log structured data for debugging
    console.error("\nDetailed errors:", JSON.stringify(result.errors, null, 2));

    return false;
  }

  // Handle warnings (non-blocking)
  if (result.warnings.length > 0) {
    const warningOutput = formatValidationWarnings(result.warnings, id);
    console.warn(warningOutput);
  }

  return true;
}
```

### Dependency Resolution with Fallbacks

```ts
import { DependencyGraphService, QueryService } from "@kodebase/artifacts";

async function resolveDependenciesWithFallback(artifactId: string) {
  const depService = new DependencyGraphService();
  const queryService = new QueryService();

  try {
    // Try to resolve full dependency chain
    const chain = await depService.resolveDependencyChain(artifactId);

    console.log(`Dependency chain for ${artifactId}:`);
    for (const node of chain) {
      const artifact = await queryService.loadArtifact(node.artifactId);
      console.log(`  ${node.depth === 0 ? "→" : "  ".repeat(node.depth) + "↳"} ${node.artifactId}: ${artifact.metadata.title}`);
    }

    return chain;
  } catch (error) {
    // Fall back to direct dependencies only
    console.warn(`⚠️  Could not resolve full chain, showing direct dependencies only`);

    const directDeps = await depService.getDependencies(artifactId);
    console.log(`Direct dependencies: ${directDeps.map(a => a.id).join(", ") || "none"}`);

    return directDeps.map((artifact, idx) => ({
      artifactId: artifact.id,
      depth: 1,
      path: [artifactId, artifact.id]
    }));
  }
}
```

---

## Performance Considerations

### Caching Strategy

All services use multi-level caching to optimize repeated queries:

**QueryService and DependencyGraphService**:
- **Path cache**: Maps artifact IDs to file paths (lazy-loaded once)
- **Artifact cache**: Stores loaded artifact objects in memory
- **Performance**: 1000+ artifacts filtered in <100ms with warm cache

```ts
const service = new QueryService();

// First call: loads from disk and builds path cache
const tree1 = await service.getTree(); // ~500ms for 150 artifacts

// Subsequent calls: uses in-memory cache
const tree2 = await service.getTree(); // ~5ms

// Clear cache when artifact files change
service.clearCache();
```

### Batch Operations

Use batch operations to reduce I/O overhead:

```ts
import { ValidationService, QueryService } from "@kodebase/artifacts";

// ❌ Slow: validates one at a time
for (const [id, artifact] of artifacts) {
  await validationService.validateArtifact(artifact, { artifactId: id });
}

// ✅ Fast: batch validates with shared context
const results = validationService.validateAll({ artifacts });
```

### Lazy Loading

Tree traversal operations use lazy loading to avoid loading entire tree upfront:

```ts
const service = new QueryService();

// Only loads ancestors, not entire tree
const ancestors = await service.getAncestors("A.1.5");

// Only loads children of specific parent
const children = await service.getChildren("A.1");

// Loads full tree (heavier operation)
const tree = await service.getTree();
```

### Best Practices

1. **Reuse service instances**: Service instances cache data, so reuse them within a workflow
2. **Batch validation**: Use `validateAll()` instead of individual `validateArtifact()` calls
3. **Clear cache when modifying**: Call `clearCache()` after creating/updating artifacts
4. **Use specific queries**: Prefer `getChildren()` over `getTree()` when possible
5. **Handle errors early**: Validate inputs before expensive operations

---

## Migration Guide

### Migrating from Legacy `@kodebase/artifact-*` Packages

If you were using the deprecated `@kodebase/artifact-validation`, `@kodebase/artifact-query`, or similar packages, here's how to migrate:

#### Before (Legacy)

```ts
import { validateArtifact } from "@kodebase/artifact-validation";
import { queryArtifacts } from "@kodebase/artifact-query";
import { createArtifact } from "@kodebase/artifact-manager";

// Legacy validation
const result = validateArtifact(artifact);

// Legacy query
const results = await queryArtifacts({ state: CArtifactEvent.READY });

// Legacy create
await createArtifact(id, artifact);
```

#### After (Current)

```ts
import {
  ValidationService,
  QueryService,
  ArtifactService
} from "@kodebase/artifacts";

// Current validation
const validationService = new ValidationService();
const result = validationService.validateArtifact(artifact, { artifactId: id });

// Current query
const queryService = new QueryService();
const results = await queryService.findByState(CArtifactEvent.READY);

// Current create
const artifactService = new ArtifactService();
await artifactService.createArtifact({ id, artifact, slug: "my-artifact" });
```

### Key Changes

1. **Service-based API**: All operations now go through service classes instead of standalone functions
2. **Explicit context**: Pass `artifactId` explicitly to validation for better error messages
3. **Options objects**: Methods use options objects instead of positional parameters
4. **Dependency injection**: Services like `ScaffoldingService` take dependencies (e.g., `IdAllocationService`) as constructor parameters

### Incremental Migration

You can migrate incrementally by running both packages side-by-side:

```json
{
  "dependencies": {
    "@kodebase/core": "^0.1.0",
    "@kodebase/artifacts": "^0.3.0"
  }
}
```

Start by migrating one workflow at a time, using the new API for new features while keeping legacy code functional.

---

## Type Exports

All types from services and utilities are exported for TypeScript users:

```ts
import type {
  // ArtifactService types
  TAnyArtifact,
  CreateArtifactOptions,
  GetArtifactOptions,
  UpdateMetadataOptions,
  AppendEventOptions,

  // QueryService types
  ArtifactTreeNode,
  ArtifactWithId,
  QueryCriteria,

  // DependencyGraphService types
  DependencyChainNode,

  // ReadinessService types
  BlockingReason,

  // ValidationService types
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidateArtifactOptions,
  ValidateAllOptions,

  // Error formatting types
  FormatValidationErrorsOptions,
  SchemaErrorIssue,
  CreateUserFriendlyErrorOptions
} from "@kodebase/artifacts";
```

## Package Features

- **ESM-only** - Modern ES module distribution for tree-shaking
- **Tree-shakable** - Import only what you use for optimal bundle size
- **Strict TypeScript** - Full type safety with strict mode enabled
- **Zero circular dependencies** - Clean module structure verified with madge
- **Comprehensive tests** - 96%+ coverage with memfs-based fast tests
- **Type declarations** - Full `.d.ts` with source maps for IDE navigation

## Dependencies

This package requires `@kodebase/core` for underlying types, schemas, and file operations:

```ts
// Core types and schemas available via @kodebase/core
import {
  TInitiative,
  TMilestone,
  TIssue,
  scaffoldInitiative,
  scaffoldMilestone,
  scaffoldIssue,
  readArtifact,
  writeArtifact
} from "@kodebase/core";
```

See [@kodebase/core documentation](https://www.npmjs.com/package/@kodebase/core) for available schemas, validators, and file operations.

---

## API Reference

For complete API documentation with detailed parameter descriptions, return types, and additional examples, see the generated TypeDoc documentation (coming soon) or refer to the inline JSDoc comments in the source code.

All public APIs are fully documented with:
- Parameter descriptions and types
- Return type documentation
- Thrown error documentation
- Usage examples with multiple scenarios
- Cross-references to related methods

Example of viewing JSDoc in your IDE:

```ts
import { ScaffoldingService } from "@kodebase/artifacts";

// Hover over the method to see full documentation
const service = new ScaffoldingService(idService);
const result = await service.scaffoldInitiative(/*...*/);
```

## License

MIT

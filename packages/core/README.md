# @kodebase/core

[![npm version](https://img.shields.io/npm/v/@kodebase/core.svg?style=flat-square)](https://www.npmjs.com/package/@kodebase/core)
[![npm downloads](https://img.shields.io/npm/dm/@kodebase/core.svg?style=flat-square)](https://www.npmjs.com/package/@kodebase/core)
[![CI status](https://img.shields.io/github/actions/workflow/status/kodebaseai/kodebase/ci.yml?branch=main&style=flat-square)](https://github.com/kodebaseai/kodebase/actions)

Core TypeScript utilities for Kodebase artifact management. Parse, validate, transform, and automate workflows for Initiatives, Milestones, and Issues.

## Installation

```bash
pnpm add @kodebase/core
# or
npm install @kodebase/core
```

## Public API

### Constants and Types

```ts
import {
  CArtifact,           // Artifact types: INITIATIVE, MILESTONE, ISSUE
  CArtifactEvent,      // Lifecycle states: draft, ready, blocked, in_progress, etc.
  CArtifactTrigger,    // State transition triggers
  CArtifactPriority,   // Priority levels: low, medium, high, critical
  CArtifactEstimation, // Estimation sizes: XS, S, M, L, XL
  ACTOR_REGEX,         // Pattern for validating actor strings
  ARTIFACT_ID_REGEX,   // Pattern for validating artifact IDs
} from "@kodebase/core";
```

All constants and enums that define artifact structure and lifecycle.

---

### Schemas

```ts
import {
  InitiativeSchema,  // Zod schema for initiatives
  MilestoneSchema,   // Zod schema for milestones
  IssueSchema,       // Zod schema for issues
  TInitiative,       // TypeScript type for initiatives
  TMilestone,        // TypeScript type for milestones
  TIssue,            // TypeScript type for issues
} from "@kodebase/core";
```

Zod schemas and TypeScript types for all artifact types. Use these for validation, type-checking, and generating UI forms.

---

### Parser

```ts
import {
  parseInitiative,
  parseMilestone,
  parseIssue,
  parseYaml,
} from "@kodebase/core";

// Parse YAML string into typed artifact
const initiative = parseInitiative(yamlString);
const milestone = parseMilestone(yamlString);
const issue = parseIssue(yamlString);

// Parse generic YAML artifact (auto-detects type)
const artifact = parseYaml(yamlString);
```

Parse YAML strings into typed artifact objects with validation.

---

### Validator

```ts
import {
  validateArtifact,
  validateInitiative,
  validateMilestone,
  validateIssue,
  getArtifactType,
  detectCircularDependencies,
  detectCrossLevelDependencies,
  validateRelationshipConsistency,
} from "@kodebase/core";

// Validate any artifact (auto-detects type)
const result = validateArtifact(artifact);
// Returns: { type: "initiative" | "milestone" | "issue", data: TArtifact }
// Throws: ZodError with formatted issues if invalid

// Validate specific artifact type
validateInitiative(data);
validateMilestone(data);
validateIssue(data);

// Detect artifact type from structure
const type = getArtifactType(data); // "initiative" | "milestone" | "issue"

// Validate dependency relationships
const circular = detectCircularDependencies(artifacts);
const crossLevel = detectCrossLevelDependencies(artifacts);
const consistency = validateRelationshipConsistency(artifacts);
```

Comprehensive validation with helpful error messages. The validator handles both schema validation and relationship consistency checks.

---

### Error Formatting

```ts
import {
  formatZodIssue,
  formatZodError,
  formatParseIssues,
  formatIssuesSummary,
} from "@kodebase/core";

// Format single Zod validation issue
const formatted = formatZodIssue(zodIssue);
// { path: "metadata.title", reason: "...", suggestion: "..." }

// Format entire Zod error
try {
  schema.parse(data);
} catch (error) {
  if (error instanceof ZodError) {
    const issues = formatZodError(error);
    issues.forEach(issue => {
      console.log(`${issue.path}: ${issue.reason}`);
      if (issue.suggestion) console.log(`  → ${issue.suggestion}`);
    });
  }
}

// Format parser issues
const result = parseInitiative(yaml);
if (!result.success && result.error.issues) {
  const formatted = formatParseIssues(result.error.issues);
  console.error(formatIssuesSummary(formatted));
}
```

Transform technical Zod validation errors into user-friendly messages with field-specific hints and actionable suggestions. Critical for developer experience when validation fails.

---

### State Machine

```ts
import {
  canTransition,
  getValidTransitions,
  assertTransition,
} from "@kodebase/core";

// Check if transition is allowed
const allowed = canTransition(
  CArtifact.ISSUE,
  CArtifactEvent.DRAFT,
  CArtifactEvent.READY
); // true

// Get all valid next states
const validStates = getValidTransitions(
  CArtifact.MILESTONE,
  CArtifactEvent.BLOCKED
); // ["ready", "cancelled"]

// Assert transition is valid (throws if not)
assertTransition(
  CArtifact.INITIATIVE,
  CArtifactEvent.IN_PROGRESS,
  CArtifactEvent.IN_REVIEW
);
```

Enforce valid state transitions across artifact lifecycles with comprehensive state machine logic.

---

### Event Builder

```ts
import {
  createEvent,
  createDraftEvent,
  createReadyEvent,
  createBlockedEvent,
  createInProgressEvent,
  createInReviewEvent,
  createCompletedEvent,
  createCancelledEvent,
} from "@kodebase/core";

// Create event with explicit trigger
const event = createEvent({
  event: CArtifactEvent.READY,
  actor: "Ada Lovelace (ada@example.com)",
  trigger: CArtifactTrigger.DEPENDENCIES_MET,
  metadata: { /* optional */ },
});

// Convenience builders with default triggers
const draft = createDraftEvent("Ada Lovelace (ada@example.com)");
const ready = createReadyEvent("Ada Lovelace (ada@example.com)");
const blocked = createBlockedEvent("Ada Lovelace (ada@example.com)");
```

Create properly formatted lifecycle events with timestamps and required triggers.

---

### Event Order Validation

```ts
import { validateEventOrder } from "@kodebase/core";

// Validate events are in chronological order
const artifact = { metadata: { events: [...] } };
validateEventOrder(artifact.metadata.events);
// Throws EventOrderError if out of order
```

Ensure event history maintains chronological ordering.

---

### Cascade Engine

```ts
import { CascadeEngine } from "@kodebase/core";

const engine = new CascadeEngine();

// Check if parent should auto-progress
const shouldCascade = engine.shouldCascadeToParent(
  parentArtifact,
  childArtifacts
);

// Generate cascade event for parent
const cascadeEvent = engine.generateCascadeEvent(
  parentArtifact,
  completedChild,
  "Ada Lovelace (ada@example.com)"
);

// Evaluate dependency completion
const resolution = engine.resolveDependencyCompletion(
  artifact,
  allArtifacts
);

// Check parent cancellation rules
const shouldCancel = engine.evaluateParentCancellation(
  parentArtifact,
  childArtifacts
);
```

Automate parent artifact progression when all children complete. Handles upward-only cascades with dependency resolution.

---

### Loading and I/O

```ts
import {
  loadAllArtifactPaths,
  loadArtifactsByType,
  getArtifactIdFromPath,
  readArtifact,
  writeArtifact,
  ARTIFACT_FILENAME_REGEX,
} from "@kodebase/core";

// Discover all artifact files recursively
const paths = await loadAllArtifactPaths(".kodebase/artifacts");

// Filter by artifact type
const initiatives = loadArtifactsByType(paths, "initiative");
const milestones = loadArtifactsByType(paths, "milestone");
const issues = loadArtifactsByType(paths, "issue");

// Extract artifact ID from file path
const id = getArtifactIdFromPath("/path/to/A.1.feature.yml"); // "A.1"

// Read and write artifacts with stable YAML formatting
const artifact = await readArtifact("/path/to/A.1.feature.yml");
await writeArtifact("/path/to/A.1.feature.yml", artifact);
```

Discover, load, and persist artifacts with slug-tolerant ID extraction and stable YAML formatting that prevents spurious diffs.

---

### Wizard Helpers

```ts
import {
  // Layout management
  ensureArtifactsLayout,
  resolveArtifactPaths,

  // Context detection and ID allocation
  detectContextLevel,
  allocateNextId,

  // Runtime gating
  isAncestorBlockedOrCancelled,
} from "@kodebase/core";

// Ensure .kodebase/artifacts structure exists
const artifactsRoot = await ensureArtifactsLayout("/project/root");

// Resolve canonical paths for artifact
const { dirPath, filePath } = await resolveArtifactPaths({
  id: "A.1.1",
  slug: "feature-name",
  baseDir: "/project/root",
});

// Detect what type of artifact to create based on parent
const type = detectContextLevel("A.1"); // "issue"
const rootType = detectContextLevel(null); // "initiative"

// Allocate next available ID
const nextId = await allocateNextId("A.1", "/project/root"); // "A.1.2"

// Check if parent chain blocks operations
const { isBlocked, reason } = await isAncestorBlockedOrCancelled(
  "A.1.1",
  "/project/root"
);
```

UI-agnostic helpers for building artifact creation wizards. Handles layout, ID allocation, and runtime gating.

---

### Builder / Scaffolder

```ts
import {
  scaffoldInitiative,
  scaffoldMilestone,
  scaffoldIssue,
} from "@kodebase/core";

// Create new initiative with minimal input
const initiative = scaffoldInitiative({
  title: "Q1 Platform Goals",
  createdBy: "Ada Lovelace (ada@example.com)",
  vision: "Deliver scalable infrastructure",
  scopeIn: ["API improvements", "Database optimization"],
  scopeOut: ["UI redesign"],
  successCriteria: ["99.9% uptime", "2x throughput"],
  priority: "high",
  estimation: "XL",
});

// Create new milestone
const milestone = scaffoldMilestone({
  title: "API v2 Release",
  createdBy: "Ada Lovelace (ada@example.com)",
  summary: "Ship new REST API",
  deliverables: ["OpenAPI spec", "Client SDKs"],
  priority: "medium",
  estimation: "L",
});

// Create new issue
const issue = scaffoldIssue({
  title: "Add rate limiting",
  createdBy: "Ada Lovelace (ada@example.com)",
  summary: "Implement token bucket algorithm",
  acceptanceCriteria: ["Configurable limits", "Graceful degradation"],
  priority: "high",
  estimation: "M",
});
```

Create valid artifact objects with initial `draft` events. Perfect for CLI commands and UI forms.

---

## Quick Start

```ts
import {
  scaffoldIssue,
  validateArtifact,
  writeArtifact,
  resolveArtifactPaths,
} from "@kodebase/core";

// 1. Create new artifact
const issue = scaffoldIssue({
  title: "Fix login bug",
  createdBy: "Ada Lovelace (ada@example.com)",
  summary: "Users can't login with SSO",
  acceptanceCriteria: ["SSO works", "Tests pass"],
});

// 2. Validate it
const { type, data } = validateArtifact(issue);
console.log(`Valid ${type}:`, data.metadata.title);

// 3. Resolve file path
const { filePath } = await resolveArtifactPaths({
  id: "A.1.1",
  baseDir: "/project/root",
});

// 4. Write to disk
await writeArtifact(filePath, issue);
```

---

## Use Cases

**CLI Tools**: Build commands like `kodebase add`, `kodebase validate`, `kodebase cascade`

**IDE Extensions**: Provide artifact validation, auto-completion, and scaffolding

**CI/CD Automation**: Validate PRs, auto-progress parent artifacts, enforce workflow rules

**Web Dashboards**: Parse and display artifact hierarchies with real-time validation

---

## Development

### Run Tests

```bash
pnpm --filter @kodebase/core test
```

Vitest with Istanbul coverage (currently 97%). Coverage report written to `packages/core/coverage/`.

### Type Checking

```bash
pnpm --filter @kodebase/core check-types
```

### Linting

```bash
pnpm --filter @kodebase/core lint
```

---

## Architecture

```
src/
├── constants.ts              # Enums and constants
├── schemas/                  # Zod schemas and type definitions
│   ├── registries/          # Modular schema components
│   └── schemas.ts           # Composed artifact schemas
├── parser/                   # YAML parsing
├── validator/                # Validation orchestration
├── state/                    # State machine and event builders
├── automation/cascade/       # Parent progression automation
├── loading/                  # File discovery and I/O
├── wizard/                   # Artifact creation helpers
└── builder/                  # Artifact scaffolding
```

---

## License

MIT

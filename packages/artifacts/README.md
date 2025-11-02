# @kodebase/artifacts

[![npm version](https://img.shields.io/npm/v/@kodebase/artifacts.svg?style=flat-square)](https://www.npmjs.com/package/@kodebase/artifacts)
[![npm downloads](https://img.shields.io/npm/dm/@kodebase/artifacts.svg?style=flat-square)](https://www.npmjs.com/package/@kodebase/artifacts)
[![CI status](https://img.shields.io/github/actions/workflow/status/kodebaseai/kodebase/ci.yml?branch=main&style=flat-square)](https://github.com/kodebaseai/kodebase/actions)

High-level artifact operations for Kodebase. Provides CRUD services, orchestrated validation, and user-friendly error formatting for Initiatives, Milestones, and Issues.

## Installation

```bash
pnpm add @kodebase/artifacts
# or
npm install @kodebase/artifacts
```

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
    priority: "high",
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
    trigger: "dependencies_met"
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
  nextState: "in_progress"
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

## License

MIT

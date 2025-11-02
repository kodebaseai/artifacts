---
"@kodebase/artifacts": minor
"@kodebase/core": patch
---

**@kodebase/artifacts: Initial Release - Foundation Services**

Complete artifact operations layer providing CRUD services, orchestrated validation, and user-friendly error formatting.

**Features:**

- **ArtifactService** - High-level CRUD operations with automatic directory structure handling
  - `createArtifact()` - Creates artifacts with proper initiative/milestone/issue directory hierarchy
  - `getArtifact()` - Retrieves artifacts by ID with optional slug support
  - `updateMetadata()` - Updates metadata while preserving event history
  - `appendEvent()` - Appends events with immutability guarantees
  - Custom `ArtifactNotFoundError` with artifact context for better debugging

- **ValidationService** - Orchestrated validation pipeline with aggregated error reporting
  - Integrates schema validation (Zod), dependency validation (circular, cross-level, consistency), and state machine validation
  - `validateArtifact()` - Single artifact validation through all validators
  - `validateAll()` - Batch validation with performance optimization
  - Provides actionable error messages with field paths and suggested fixes

- **Error Formatting Utilities** - CLI-friendly error output
  - `ArtifactError` class with artifact context (code, message, artifactId, field, suggestion)
  - `formatValidationErrors()` - CLI-friendly output with emoji indicators (❌, 💡)
  - `formatValidationWarnings()` - Warning output with consistent structure
  - `formatSchemaError()` - Converts Zod errors to ValidationError format with field paths
  - `createUserFriendlyError()` - Gracefully wraps any error type with context

**Package Configuration:**

- ESM-only distribution with tree-shakable exports (`sideEffects: false`)
- TypeScript strict mode enabled via shared config
- Zero circular dependencies (verified with madge)
- Full type declarations with source maps for IDE navigation
- Package validation with publint and attw (esm-only profile)
- Public mirror repository at https://github.com/kodebaseai/artifacts

---

**@kodebase/core: Package Configuration Fix**

Fixed attw (Are The Types Wrong) configuration to use `--profile esm-only`, resolving CI pipeline failures that previously blocked npm publication. This change allows intentional ESM-only packages to pass validation while still checking type declaration correctness for ESM consumers.

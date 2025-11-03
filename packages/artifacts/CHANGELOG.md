# @kodebase/artifacts

## 0.2.0

### Minor Changes

- [#94](https://github.com/kodebaseai/kodebase/pull/94) [`2497acd`](https://github.com/kodebaseai/kodebase/commit/2497acd9b6818a247940a617152ef7f903f43490) Thanks [@migcarva](https://github.com/migcarva)! - Complete B.2 - Creation & Context milestone

  **Context Detection Service (B.2.1)**

  - Implemented ContextService with 7 methods for full context detection
  - Added detectContext() for inferring artifact level and parent from directory paths
  - Added detectFromBranch() for parsing artifact IDs from git branch names (add/_, artifact-id, complete/_)
  - Added project validation utilities (isKodebaseProject, ensureLayout, requireContext)
  - Achieved 96.7% test coverage (113 tests) using memfs for fast isolated testing

  **ID Allocation Logic (B.2.2)**

  - Implemented IdAllocationService with stateless filesystem-based ID allocation
  - Added allocateNextInitiativeId() using base-26 conversion (A→Z→AA→ZZ like Excel columns)
  - Added allocateNextMilestoneId() and allocateNextIssueId() for numeric sequential IDs
  - Implemented gap-avoiding chronological increment strategy to preserve ID chronology
  - Achieved 97.32% test coverage (29 tests) with performance <100ms for 100+ artifacts

  **Artifact Templates (B.2.3)**

  - Created generateSlug() utility handling Unicode, emoji, and special characters
  - Re-exported scaffold functions (scaffoldInitiative, scaffoldMilestone, scaffoldIssue) from @kodebase/core
  - Achieved 100% test coverage (44 tests) for slug generation edge cases

  **Scaffolding Service (B.2.4)**

  - Implemented ScaffoldingService as orchestration layer combining ID allocation, slug generation, and scaffold functions
  - Added git-based actor detection (getGitActor) with fallback for non-git environments
  - Created unified API (scaffoldInitiative, scaffoldMilestone, scaffoldIssue) for artifact creation workflows
  - Achieved 100% test coverage (20 tests) with memfs-based integration testing

  **Package Status**
  ✅ All 206 tests passing with 97.5% overall coverage
  ✅ All 4 deliverables (B.2.1-B.2.4) completed with 95%+ individual coverage
  ✅ ESM-only configuration maintained with zero circular dependencies
  ✅ Full spec compliance for context-aware artifact creation
  ✅ Ready for B.3 CLI integration enabling `kodebase add` commands

## 0.1.0

### Minor Changes

- [`d9083fe`](https://github.com/kodebaseai/kodebase/commit/d9083fe4424ce1a8abf74017ee16282edb5aeff9) Thanks [@migcarva](https://github.com/migcarva)! - **@kodebase/artifacts: Initial Release - Foundation Services**

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

  ***

  **@kodebase/core: Package Configuration Fix**

  Fixed attw (Are The Types Wrong) configuration to use `--profile esm-only`, resolving CI pipeline failures that previously blocked npm publication. This change allows intentional ESM-only packages to pass validation while still checking type declaration correctness for ESM consumers.

### Patch Changes

- Updated dependencies [[`d9083fe`](https://github.com/kodebaseai/kodebase/commit/d9083fe4424ce1a8abf74017ee16282edb5aeff9)]:
  - @kodebase/core@1.0.1

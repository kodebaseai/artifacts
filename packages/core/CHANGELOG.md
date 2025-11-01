# @kodebase/core

## 0.5.0

### Minor Changes

- [#64](https://github.com/kodebaseai/kodebase/pull/64) [`157a259`](https://github.com/kodebaseai/kodebase/commit/157a25967af14fb2a0bfbf715e449fa449b9ca1f) Thanks [@migcarva](https://github.com/migcarva)! - Complete A.8 - Public API, Docs, and Packaging milestone

  **API Surface Curation (A.8.1)**

  - Cleaned up index.ts exports removing internal utilities
  - Consolidated public API into 12 module groups
  - Increased documentation coverage from ~25% to ~95%

  **Documentation and Cross-linking (A.8.2)**

  - Added comprehensive JSDoc for all public functions across 11 modules
  - Added Error Formatting section to README.md
  - Maintained 333 tests at 97% coverage

  **ESM Build and Smoke Tests (A.8.3)**

  - Implemented TypeScript compilation to dist/ with proper build infrastructure
  - Created comprehensive smoke tests validating ESM imports (12 module groups) and type completeness
  - Added package validation tools (publint, @arethetypeswrong/cli)
  - Integrated smoke tests into CI pipeline
  - Fixed Zod v4 type declaration bugs with skipLibCheck workaround
  - Exported missing types (TArtifactMetadata, TEvent)
  - Added prepack validation to prevent publishing issues

  **Package Status**
  ✅ All 333 unit tests passing
  ✅ All ESM import smoke tests passing
  ✅ Type completeness validation passing
  ✅ Package validation (publint) passing
  ✅ Ready for npm publishing with proper dist/ artifacts, type declarations, and source maps

## 0.4.0

### Minor Changes

- [#59](https://github.com/kodebaseai/kodebase/pull/59) [`2453d82`](https://github.com/kodebaseai/kodebase/commit/2453d823c1eb0ab14404038fb2b03574f43381e4) Thanks [@migcarva](https://github.com/migcarva)! - Complete wizard support helpers milestone (A.7)

  Add comprehensive wizard helper API for artifact creation and management:

  - Layout and path resolution (ensureArtifactsLayout, resolveArtifactPaths)
  - Context detection and ID allocation (detectContextLevel, allocateNextId)
  - Artifact scaffolding (scaffoldInitiative, scaffoldMilestone, scaffoldIssue)
  - Runtime gating helper (isAncestorBlockedOrCancelled)
  - Integration tests validating end-to-end workflows

  All helpers use options object pattern for better DX and include defensive handling for edge cases.

## 0.3.0

### Minor Changes

- [#52](https://github.com/kodebaseai/kodebase/pull/52) [`f8c6446`](https://github.com/kodebaseai/kodebase/commit/f8c64461637aed624ba84cdbdfd479ea5888eb80) Thanks [@migcarva](https://github.com/migcarva)! - Add loader and file I/O stack with slug-tolerant ID extraction, recursive artifact
  discovery, type filters, and stable YAML read/write operations. (A.6)

## 0.2.0

### Minor Changes

- [#46](https://github.com/kodebaseai/kodebase/pull/46) [`55db75f`](https://github.com/kodebaseai/kodebase/commit/55db75f28703f1df9e9e77c9b907600be91559e4) Thanks [@migcarva](https://github.com/migcarva)! - Expand the cascade engine with dependency resolution, cancellation guardrails,
  and documentation updates across the cascade, state, and schema modules. (A.5)

## 0.1.1

### Patch Changes

- bump to 0.1.1

## 0.1.0

### Minor Changes

- [#33](https://github.com/kodebaseai/kodebase/pull/33) [`a600c91`](https://github.com/kodebaseai/kodebase/commit/a600c911decd5c635df0579d05dee532c0bfe44f) Thanks [@migcarva](https://github.com/migcarva)! - Core schema stack shipped with registry coverage and passing test suite, enabling downstream adoption work. (A.1)

- [#33](https://github.com/kodebaseai/kodebase/pull/33) [`a600c91`](https://github.com/kodebaseai/kodebase/commit/a600c911decd5c635df0579d05dee532c0bfe44f) Thanks [@migcarva](https://github.com/migcarva)! - Parser and validator stack shipped with actionable errors, fixtures, and docs ready for downstream tooling. (A.2)

- [#33](https://github.com/kodebaseai/kodebase/pull/33) [`a600c91`](https://github.com/kodebaseai/kodebase/commit/a600c911decd5c635df0579d05dee532c0bfe44f) Thanks [@migcarva](https://github.com/migcarva)! - Readiness validation now ensures relationships are sibling-only, cycle-free, cross-level safe, and reciprocal. (A.3)

- [#34](https://github.com/kodebaseai/kodebase/pull/34) [`b1594b0`](https://github.com/kodebaseai/kodebase/commit/b1594b0f76c7d23279bee023e308d5fd78dba24f) Thanks [@migcarva](https://github.com/migcarva)! - Add lifecycle state utilities and chronology validation in @kodebase/core:

  - State machine: `canTransition`, `getValidTransitions`, and `StateTransitionError` with tests and docs. (A.4.1)
  - Event ordering: `validateEventOrder` and `EventOrderError` enforcing first `draft` and non-decreasing timestamps, with tests. (A.4.2)

### Patch Changes

- [#37](https://github.com/kodebaseai/kodebase/pull/37) [`0c74355`](https://github.com/kodebaseai/kodebase/commit/0c743557763fa4ac6f7f9a9a2eaa59334ea4630a) Thanks [@migcarva](https://github.com/migcarva)! - Add state-machine transition sequence tests across artifact types, event-order fixture tests, and lifecycle YAML fixtures. Expand archived helper coverage. (A.4.4)

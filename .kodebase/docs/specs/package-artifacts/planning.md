# Initiative B: Artifacts Package - Planning

**Status**: Draft
**Created**: 2025-11-02
**Owner**: Miguel Carvalho (m@kodebase.ai)

---

## Overview

This planning document breaks down Initiative B (Artifacts Package) into milestones with concrete deliverables. Each milestone represents a shippable increment that builds toward the complete package.

**Reference**: [Artifacts Package Spec](./artifacts-package-spec.md)

---

## Initiative Structure

```
B. Artifacts Package (Initiative)
├── B.1. Foundation Services (Milestone)
│   ├── B.1.1. ArtifactService implementation
│   ├── B.1.2. ValidationService implementation
│   └── B.1.3. Error formatting utilities
├── B.2. Creation & Context (Milestone)
│   ├── B.2.1. ContextService implementation
│   ├── B.2.2. ScaffoldService implementation
│   └── B.2.3. ID allocation logic
├── B.3. Query & Tree Operations (Milestone)
│   ├── B.3.1. QueryService implementation
│   ├── B.3.2. Tree traversal algorithms
│   └── B.3.3. Dependency graph operations
├── B.4. Testing & Integration (Milestone)
│   ├── B.4.1. Unit test suite
│   ├── B.4.2. Integration tests with core fixtures
│   ├── B.4.3. Performance benchmarks
│   └── B.4.4. Package configuration & build
└── B.5. Documentation & CLI Prep (Milestone)
    ├── B.5.1. JSDoc coverage (95%+)
    ├── B.5.2. API documentation
    └── B.5.3. CLI integration examples
```

---

## Milestone Breakdown

### B.1. Foundation Services

**Goal**: Establish core CRUD and validation operations that all other services depend on.

**Priority**: Critical (blocks all other milestones)

**Estimation**: M (32-40 hours)

**Deliverables**:

1. **ArtifactService** (`services/artifact-service.ts`)
   - CRUD operations: `getArtifact`, `getArtifactByPath`, `artifactExists`
   - Write operations: `createArtifact`, `updateArtifact`
   - Event operations: `appendEvent`, `getLatestEvent`, `getEventHistory`
   - Metadata operations: `updateMetadata`
   - Uses `@kodebase/core` loader and file service internally
   - Validates artifacts before write

2. **ValidationService** (`services/validation-service.ts`)
   - Single artifact validation: `validateArtifact`, `validateArtifactFromPath`
   - Batch validation: `validateAll` with type/status filters
   - Specific checks: `checkSchema`, `checkReadiness`, `checkStateMachine`, `checkDependencies`
   - Auto-fix: `autoFix` with dry-run support
   - Returns structured `ValidationResult` with errors/warnings
   - Error codes: `SCHEMA_INVALID`, `DEPS_CROSS_LEVEL`, `DEPS_CIRCULAR`, etc.

3. **Error Formatting Utilities** (`utils/error-formatter.ts`)
   - `ArtifactError` class with code, artifactId, field, fixable flag
   - `formatValidationErrors` for user-friendly output
   - `formatSchemaError` to convert Zod errors
   - `createUserFriendlyError` for exception handling

**Validation Criteria**:
- ✅ All ArtifactService methods tested with core fixtures
- ✅ ValidationService orchestrates all 4 core validators
- ✅ Error messages include artifact context and suggested fixes
- ✅ Integration test: create → validate → update workflow passes

**Dependencies**:
- `@kodebase/core@1.0.0` (done)

---

### B.2. Creation & Context

**Goal**: Enable artifact creation with context awareness and auto-allocated IDs.

**Priority**: Critical (required for `kodebase add` command)

**Estimation**: M (24-32 hours)

**Deliverables**:

1. **ContextService** (`services/context-service.ts`)
   - Context detection: `detectContext`, `detectFromBranch`, `detectFromPath`
   - Context validation: `isValidContext`, `requireContext`
   - Layout management: `ensureLayout`, `isKodebaseProject`
   - Returns `ContextInfo` with level, currentId, parentId, ancestorIds, branchName
   - Branch name parsing: `A.1.3` → issue context, `add/A.1` → milestone context, `complete/A` → initiative context

2. **ScaffoldService** (`services/scaffold-service.ts`)
   - Scaffold operations: `scaffoldInitiative`, `scaffoldMilestone`, `scaffoldIssue`
   - ID allocation: `allocateNextId` (initiatives: A→Z→AA, milestones/issues: numeric)
   - Template operations: `getTemplate`, `validateScaffoldOptions`
   - Creates `draft` event with `artifact_created` trigger
   - Sets `schema_version: "0.0.1"`
   - Auto-creates parent directories

3. **ID Allocation Logic** (`services/scaffold-service.ts` + `utils/artifact-helpers.ts`)
   - Initiative IDs: Find highest letter ID (A, B, ..., Z, AA, AB, ...)
   - Milestone IDs: Find highest numeric ID under parent (A.1, A.2, ...)
   - Issue IDs: Find highest numeric ID under parent (A.1.1, A.1.2, ...)
   - Thread-safe allocation (no race conditions)

**Validation Criteria**:
- ✅ Context detection works from directory path and branch name
- ✅ Scaffolding creates valid artifacts in draft state
- ✅ ID allocation increments correctly (no duplicates)
- ✅ Integration test: add initiative → add milestone → add issue workflow passes

**Dependencies**:
- B.1. Foundation Services (ArtifactService, ValidationService)

---

### B.3. Query & Tree Operations

**Goal**: Enable tree traversal, dependency graphs, and filtered queries for `kodebase status`.

**Priority**: High (required for status command and CLI operations)

**Estimation**: M (24-32 hours)

**Deliverables**:

1. **QueryService** (`services/query-service.ts`)
   - Tree operations: `getTree`, `getChildren`, `getParent`, `getSiblings`
   - Dependency graph: `getDependencies`, `getBlockedBy`, `getBlocking`
   - Query operations: `findArtifacts`, `findByState`, `findByAssignee`
   - Path operations: `getArtifactPath`, `getDepth`
   - Statistics: `getStats` (total, byType, byState)

2. **Tree Traversal Algorithms** (`services/query-service.ts`)
   - Lazy loading for large trees
   - Caching for repeated queries within same operation
   - O(siblings) for dependency checks
   - O(depth) for parent traversal
   - Handles deep nesting (10+ levels)

3. **Dependency Graph Operations** (`services/query-service.ts`)
   - Resolve all dependencies (blocked_by list)
   - Resolve all blocking artifacts (reverse lookup)
   - Check if artifact is blocked by dependencies
   - Performance: O(siblings) lookups

**Validation Criteria**:
- ✅ Tree traversal handles 1000+ artifacts efficiently
- ✅ Dependency graph correctly resolves sibling-only relationships
- ✅ Query filters work with multiple criteria (type, state, assignee)
- ✅ Performance test: validate 1000 artifacts in <1 second

**Dependencies**:
- B.1. Foundation Services (ArtifactService)

---

### B.4. Testing & Integration

**Goal**: Comprehensive test coverage, CI integration, and package build configuration.

**Priority**: Critical (required for production release)

**Estimation**: M (24-32 hours)

**Deliverables**:

1. **Unit Test Suite** (`test/unit/`)
   - ArtifactService: CRUD operations, event management, error cases
   - ValidationService: All validation pipelines, error formatting
   - ContextService: Context detection, branch parsing
   - ScaffoldService: ID allocation, template generation
   - QueryService: Tree traversal, dependency resolution
   - Utilities: artifact-helpers, error-formatter
   - Target: 90%+ coverage

2. **Integration Tests** (`test/integration/`)
   - Reuse `@kodebase/core` fixtures from A.9.1 (artifacts-tree/)
   - Test full workflows:
     - Create initiative → validate → submit
     - Add milestone with dependencies → validate
     - Add issue → start → complete
   - Test error conditions:
     - Invalid cross-level dependencies
     - Circular dependency detection
     - Illegal state transitions
   - Test batch operations with large artifact trees (100+ artifacts)

3. **Performance Benchmarks** (`test/performance/`)
   - Validate 1000+ artifacts in <1 second
   - Query operations scale linearly with siblings
   - Tree traversal handles 10+ level nesting
   - Benchmark results in CI logs

4. **Package Configuration** (`package.json`, `tsconfig.json`, `vitest.config.ts`)
   - Package metadata: name, version, description, license
   - ESM build with TypeScript
   - Exports map for tree-shaking
   - Dependencies: `@kodebase/core@^1.0.0`
   - Dev dependencies: Vitest, Biome, @kodebase/typescript-config
   - Scripts: build, test, lint, format

**Validation Criteria**:
- ✅ All tests passing (349+ tests for full package)
- ✅ 90%+ test coverage achieved
- ✅ CI pipeline runs tests on PR
- ✅ Package builds successfully with `pnpm build`
- ✅ No type errors with `pnpm check-types`

**Dependencies**:
- B.1. Foundation Services
- B.2. Creation & Context
- B.3. Query & Tree Operations

---

### B.5. Documentation & CLI Prep

**Goal**: Prepare package for CLI consumption with comprehensive documentation.

**Priority**: High (required for Initiative C)

**Estimation**: S (16-24 hours)

**Deliverables**:

1. **JSDoc Coverage** (all source files)
   - 95%+ JSDoc coverage on public APIs
   - All service classes fully documented
   - Method parameters with types and descriptions
   - Return types documented
   - Examples for complex operations
   - Error conditions documented

2. **API Documentation** (`README.md`, `docs/`)
   - Package overview and purpose
   - Installation instructions
   - Quick start guide
   - Service API reference with examples
   - Error handling guide
   - Migration guide from legacy packages

3. **CLI Integration Examples** (`examples/`)
   - Example: `kodebase add` flow using ArtifactService + ScaffoldService
   - Example: `kodebase validate` flow using ValidationService
   - Example: `kodebase status` flow using QueryService
   - Example: Error handling patterns
   - Code snippets for Initiative C developers

**Validation Criteria**:
- ✅ 95%+ JSDoc coverage verified
- ✅ README includes all service APIs with examples
- ✅ CLI examples compile and run successfully
- ✅ Documentation reviewed and approved

**Dependencies**:
- B.4. Testing & Integration (package must be stable)

---

## Critical Path

```
B.1 (Foundation) → B.2 (Creation) → B.4 (Testing) → B.5 (Docs) → Ship
                 ↘ B.3 (Query) ↗
```

**Key insight**: B.2 and B.3 can be developed in parallel after B.1 is complete.

---

## Timeline Estimate

| Milestone | Effort | Duration (solo) | Dependencies |
|-----------|--------|-----------------|--------------|
| B.1. Foundation Services | M (32-40h) | 4-5 days | None |
| B.2. Creation & Context | M (24-32h) | 3-4 days | B.1 |
| B.3. Query & Tree Operations | M (24-32h) | 3-4 days | B.1 |
| B.4. Testing & Integration | M (24-32h) | 3-4 days | B.1, B.2, B.3 |
| B.5. Documentation & CLI Prep | S (16-24h) | 2-3 days | B.4 |

**Total Effort**: 120-160 hours

**Total Duration** (solo, sequential): 15-20 days

**Total Duration** (optimized, parallel B.2+B.3): 12-16 days

---

## Risk Mitigation

### Risk 1: Fixture incompatibility with core package
**Mitigation**: Verify core fixtures load correctly in B.1; adjust if needed

### Risk 2: Performance degradation with large artifact trees
**Mitigation**: Benchmark early in B.3; optimize caching if needed

### Risk 3: API surface too complex for CLI
**Mitigation**: Create CLI examples in B.5; iterate based on feedback

### Risk 4: Testing coverage below target
**Mitigation**: Write tests alongside implementation; review coverage in B.4

---

## Success Criteria (Initiative Level)

1. ✅ All 5 services implemented and tested
2. ✅ 90%+ test coverage achieved
3. ✅ Package builds and publishes successfully
4. ✅ CLI integration examples work end-to-end
5. ✅ Performance benchmarks meet targets (<1s for 1000 artifacts)
6. ✅ Documentation complete (95%+ JSDoc coverage)
7. ✅ Initiative C (CLI) can consume this package

---

## Next Steps

1. **Create Initiative B artifact** (B.yml)
2. **Create Milestone artifacts** (B.1.yml, B.2.yml, B.3.yml, B.4.yml, B.5.yml)
3. **Create Issue artifacts** for each milestone (B.1.1, B.1.2, etc.)
4. **Start B.1.1** (ArtifactService implementation)

---

## Related Documents

- [Artifacts Package Spec](./artifacts-package-spec.md)
- [Core Package Spec](../package-core/core-package-spec.md)
- [Product Vision](.kodebase/docs/strategy/PRODUCT-VISION.md)
- [Agentic Constitution](.kodebase/docs/AGENTIC_CONSTITUTION.mdc)

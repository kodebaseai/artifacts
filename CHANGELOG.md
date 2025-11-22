# @kodebase/artifacts

## 1.1.3

### Patch Changes

- [#301](https://github.com/kodebaseai/kodebase/pull/301) [`ee86091`](https://github.com/kodebaseai/kodebase/commit/ee86091417044998e1c9c0b33d1d05ad8dc20835) Thanks [@migcarva](https://github.com/migcarva)! - Complete F.4 Interactions & File Watcher milestone - Real-time artifact monitoring, state persistence, and enhanced UI features:

  **F.4.2: File Watcher & Cache Management (#279)**

  - FileWatcherService (300 lines) with chokidar integration for real-time artifact monitoring
  - Fixed-window debounce (300ms) with Set-based deduplication
  - Generation counter for race condition prevention
  - Atomic cache invalidation pipeline with 4 checkpoints
  - awaitWriteFinish for stable file reads

  **F.4.3: UI Update Pipeline & Real-Time Sync (#280)**

  - Complete UI update pipeline with three view builders (Work, Tree, Timeline)
  - Integrated groupByStatus(), buildTree(), and buildTimeline()
  - Loading state messaging during pipeline execution
  - Performance measurement at each stage (<50ms grouping, <100ms tree/timeline)

  **F.4.4: View Preferences Persistence (#281)**

  - PreferenceStorage service (110 lines) with globalState integration
  - State schema: ViewPreference, SortPreference, ExpandedGroupsState
  - Storage keys: artifactExplorer.preferences.{view,sort,expandedGroups}
  - Atomic preference updates with lifecycle management

  **F.4.5: State Persistence & Synchronization (#282)**

  - Unified state persistence architecture with 6 integrated phases
  - Backward-compatible schema migration (3 keys → 1 unified key)
  - Crash recovery with checkpoint files (3-step atomic process)
  - External change detection via globalState.onDidChange
  - Fixed-window debounce (300ms) for preference updates
  - 221 tests passing with 95.84% coverage

  **F.4.6: Loading States & Visual Feedback (#283)**

  - LoadingSpinner component with animated overlay and backdrop-filter blur
  - Bidirectional SET_LOADING message protocol
  - Four-phase loading sequence with user-friendly status messages
  - Semantic HTML (<output>) for accessibility

  **F.4.7 & F.4.8: Settings Configuration & Integration (#284)**

  - Comprehensive settings schema with 7 configurable options across 4 categories
  - SettingsService for reactive behavior with onDidChangeConfiguration listener
  - artifactPath changes trigger immediate reload
  - autoRefresh toggles file watcher on/off
  - Path type detection with platform independence

  **F.4.9: Activity Bar Logo & Extension Activation (#285)**

  - Editor Title Menu activation UI with Kodebase logo
  - WorkTrackerPanel.toggle() for visibility state management
  - SVG icon (16x17px) with light/dark theme support

  **F.4.10: Multi-Panel Architecture (#288)**

  - Multi-panel architecture supporting 3 panels (Artifact Explorer, Initiative Planner, Project Dashboard)
  - Centralized state management with globalState persistence
  - Semantic icon navigation (Compass, BotMessageSquare, ChartNoAxesCombined)
  - VSCode theme color integration using Tailwind arbitrary syntax
  - ThemeShowcase component as design system reference

  **F.4.11: Artifact List UI Revamp - Linear-Inspired Design (#289)**

  - Complete UI redesign with expandable content sections
  - Full event timeline display with type-safe data pipeline (TEvent[])
  - Blocking dependency visualization with resolved status
  - Corrected artifact sorting (CRITICAL→LOW, XL→XS)
  - Accordion-based collapsible sections for metadata
  - 220 tests passing with 94.67% coverage

  **F.4.12: Enhanced Parent Blocking UX (#292)**

  - Contextual status display ("Ready (blocked by parent D.3)")
  - Synthetic BLOCKED events for parent-blocking scenarios
  - Improved metadata organization (2 logical rows)
  - Context generator moved to @kodebase/artifacts package
  - Parent blocking hierarchy detection (all ancestors checked)
  - 11 comprehensive tests

  **F.4.14: Timeline View - Parent-Grouped Gantt Chart (#291)**

  - Parent-grouped hierarchical visualization (Issues→Milestones→Initiatives)
  - Type selector with Issue/Milestone/Initiative views
  - Fixed-width columns (75px/day, 100px/week, 120px/month)
  - Event-based timeline extraction with segmented state transitions
  - Velocity estimation with median calculation and confidence scoring
  - 12-color fixed palette for parent groups with hover interactions
  - Sticky headers with both-axis scrolling
  - Progress indicators and estimated completion visualization

  **Key Technical Achievements:**

  - Real-time synchronization with file watcher debouncing and atomic cache invalidation
  - Unified state management with crash recovery and schema migration
  - Extensible multi-panel architecture for future IDE companion features
  - WCAG AA accessibility compliance with keyboard navigation
  - Performance optimizations: virtualization, memoization, <100ms rendering for 100+ artifacts
  - Comprehensive TypeScript strict mode compliance across all components
  - 440+ tests passing with >94% coverage

  **Package Changes:**

  - @kodebase/vscode-extension: Core extension functionality with all F.4 features
  - @kodebase/artifacts: Context generator extraction for reusability

  Resolves F.4 milestone - Interactions & File Watcher.

## 1.1.2

### Patch Changes

- [#180](https://github.com/kodebaseai/kodebase/pull/180) [`e324343`](https://github.com/kodebaseai/kodebase/commit/e3243435f2c8380081088c97c4cc46fc0bc9427e) Thanks [@migcarva](https://github.com/migcarva)! - Scaffold shared test infrastructure package `@kodebase/test-utils` with core fakes and helpers:

  - Add FakeGitAdapter (in-memory Git adapter)
  - Add FakeClock utility
  - Add ConfigBuilder for YAML config scaffolding
  - Add memfs wrapper for consistent fs mocking in tests

  Adopt in two packages:

  - @kodebase/git-ops: use FakeGitAdapter from `@kodebase/test-utils` in contract tests
  - @kodebase/artifacts: replace inline memfs mocking with `mockFsPromises` helper

## 1.1.1

### Patch Changes

- [#164](https://github.com/kodebaseai/kodebase/pull/164) [`38f531e`](https://github.com/kodebaseai/kodebase/commit/38f531e11e9ba887b5a3a75bfb3a88874d415a43) Thanks [@migcarva](https://github.com/migcarva)! - Add comprehensive test coverage for template-utils

  Increased test coverage for template-utils.ts from 5.4% to 97.29% by adding 42 new tests covering previously untested functions:

  - ARTIFACT_ID_REGEX: 10 tests validating regex pattern matching for artifact IDs
  - getCurrentState(): 6 tests for extracting artifact state from events
  - extractArtifactIds(): 20 tests for extracting IDs from branches, PR titles, and bodies
  - getArtifactSlug(): 10 tests with filesystem integration for slug extraction

  All 86 tests passing.

## 1.1.0

### Minor Changes

- [#120](https://github.com/kodebaseai/kodebase/pull/120) [`90b9267`](https://github.com/kodebaseai/kodebase/commit/90b9267c6e094978d207b9ece22ca9d96cac15ed) Thanks [@migcarva](https://github.com/migcarva)! - Add CascadeService with comprehensive cascade automation support

  Implement complete CascadeService API in @kodebase/artifacts package, providing unified interface for all cascade operations:

  - **CascadeService API**: Exported service with 4 cascade methods (completion, readiness, progress, orchestration)
  - **Completion Cascade**: Auto-transitions parent to in_review when all siblings complete
  - **Readiness Cascade**: Auto-unblocks dependents when blockers complete (handles partial dependency resolution)
  - **Progress Cascade**: Auto-transitions parent to in_progress when first child starts work
  - **Orchestration**: executeCascades() provides single entry point with trigger-based routing
  - **Performance**: <100ms execution validated for typical 3-5 level hierarchies
  - **Testing**: 363 comprehensive tests with 91.35% coverage
  - **Architecture**: Proper layering - CascadeService wraps CascadeEngine from @kodebase/core per ADR-001

  This enables git-ops package to automate artifact state transitions without violating architecture boundaries or duplicating cascade logic.

## 1.0.0

### Major Changes

- [#112](https://github.com/kodebaseai/kodebase/pull/112) [`0004502`](https://github.com/kodebaseai/kodebase/commit/0004502cef1c1ae6142f0e5827ca857749345228) Thanks [@migcarva](https://github.com/migcarva)! - 🎉 Initiative B Complete: @kodebase/artifacts v1.0.0

  - ✅ **8 Service Modules**: ArtifactService, ValidationService, ContextService, ScaffoldingService, QueryService, DependencyGraphService, ReadinessService, IdAllocationService
  - ✅ **Unified Validation Pipeline**: Schema + readiness + state machine validation orchestration
  - ✅ **Context-Aware Scaffolding**: Auto-allocated IDs with template-based artifact creation
  - ✅ **Tree Traversal & Queries**: Dependency graph operations with multi-level caching
  - ✅ **Comprehensive Error Formatting**: CLI-friendly error messages with actionable suggestions

  ## Quality Metrics

  - **330 tests** across 13 test files with **96.21% code coverage** (B.4.1)
  - **100% JSDoc coverage** (418+ lines) verified via TypeDoc plugin (B.5.1)
  - **Performance validated**: 1000+ artifacts tree traversal in ~1.5s, filtering in ~90ms with warm cache (B.4.4)
  - **1056-line README** with architecture diagrams, API reference, 4 real-world examples, and migration guide (B.5.2)

## 0.4.0

### Minor Changes

- [#110](https://github.com/kodebaseai/kodebase/pull/110) [`2f61c86`](https://github.com/kodebaseai/kodebase/commit/2f61c860b0159ab403ed34d273e00db481f4f148) Thanks [@migcarva](https://github.com/migcarva)! - Comprehensive documentation coverage for @kodebase/artifacts package:

  - **JSDoc Coverage (B.5.1)**: 100% coverage (418+ lines) with TypeDoc validation on all 8 services, 15+ cross-references
  - **API Documentation (B.5.2)**: 1056-line README with architecture diagrams, API reference for all services, 4 real-world usage examples, error handling patterns, performance benchmarks, and migration guide

  Package is now fully documented and ready for CLI integration (Initiative C).

## 0.3.1

### Patch Changes

- [#106](https://github.com/kodebaseai/kodebase/pull/106) [`2081df1`](https://github.com/kodebaseai/kodebase/commit/2081df15ee3dd394ddc63e2850be3bee1fe74423) Thanks [@migcarva](https://github.com/migcarva)! - Complete B.4 Testing & Integration milestone: comprehensive test infrastructure with 330 tests, 96.21% coverage, real-world validation against A.9.1 fixtures, and performance benchmarks ensuring 1000+ artifact scalability

## 0.3.0

### Minor Changes

- [#100](https://github.com/kodebaseai/kodebase/pull/100) [`8b2bfc6`](https://github.com/kodebaseai/kodebase/commit/8b2bfc6448e7ebff5c4bc86c86b08c96d771bec4) Thanks [@migcarva](https://github.com/migcarva)! - Complete B.3 - Query & Tree Operations milestone

  **Tree Traversal Operations (B.3.1)**

  - Implemented QueryService with 4 tree traversal methods (getTree, getChildren, getAncestors, getSiblings)
  - Added lazy loading with two-level caching (path cache ID→filepath + artifact cache ID→TAnyArtifact)
  - Created ArtifactWithId interface wrapping TAnyArtifact with id field for consistent tree operations
  - Implemented virtual root node (**root**) for consistent ArtifactTreeNode type in getTree()
  - Achieved 93% test coverage (35 tests) with performance validation: 1100 artifacts in 1.56s

  **Dependency Graph Operations (B.3.2)**

  - Implemented DependencyGraphService with 7 methods (4 core + 3 validators)
  - Added BFS with path tracking for circular dependency detection (detects cycles that simple visited sets miss)
  - Implemented sibling-only constraint enforcement and graceful handling of missing dependencies
  - Integrated with core validators (detectCircularDependencies, detectCrossLevelDependencies, validateRelationshipConsistency)
  - Achieved 96.9% test coverage (34 tests) with performance: 150 artifact chain resolved in <100ms

  **Query & Filter Operations (B.3.3)**

  - Added 4 basic filter methods (findByState, findByType, findByAssignee, findByPriority) + complex query (findArtifacts)
  - Implemented state derivation from last event in metadata.events array
  - Added type inference from ID structure (1 segment = initiative, 2 = milestone, 3 = issue)
  - Implemented priority sorting with numeric weight mapping (low=1, medium=2, high=3, critical=4)
  - Achieved 96% test coverage (28 tests) with performance: filters 1000+ artifacts in <200ms

  **Readiness Validation (B.3.4)**

  - Implemented ReadinessService with 4 methods for comprehensive readiness validation
  - Added two-stage validation: siblings first, then full ancestor chain if READY event exists
  - Implemented structured BlockingReason diagnostics for each ancestor in chain
  - Validated entire ancestor chain (Initiative→Milestone→Issue), not just immediate parent
  - Achieved 96% test coverage (22 tests) with performance: checks 100+ artifacts in <100ms

  **Package Status**
  ✅ All 330 tests passing with 96.21% overall coverage
  ✅ All 4 deliverables (B.3.1-B.3.4) completed with 93%+ individual coverage
  ✅ ESM-only configuration maintained with zero circular dependencies
  ✅ Full integration with @kodebase/core validators and state machine
  ✅ Performance exceeds requirements across all services (<1s for 1000+ artifact operations)
  ✅ Ready for B.4 CLI integration enabling tree queries, dependency analysis, and readiness checks

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

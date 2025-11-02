# @kodebase/artifacts – MVP Spec

**Status**: Draft
**Created**: 2025-11-02
**Audience**: CLI developers, extension developers, integration builders
**Dependencies**: `@kodebase/core@1.0.0`

---

## 1. Purpose

Provide high-level artifact operations for creating, updating, validating, and querying artifacts. This package sits between `@kodebase/core` (low-level engine) and `@kodebase/cli` (user-facing commands), offering a batteries-included API for artifact workflows.

**Key Goals**:
- Simplify artifact creation with context-aware scaffolding
- Provide unified validation (schema + readiness + state machine)
- Enable artifact queries and tree traversal
- Support batch operations for efficiency
- Maintain type safety and detailed error reporting

**What this enables**:
- CLI commands: `add`, `validate`, `start`, `complete`, `status`
- VSCode extension: tree view, diagnostics, syntax highlighting
- Future tools: web dashboard, CI integrations, analytics

---

## 2. Command Naming: `add` vs `create`

**Decision**: Use `kodebase add` for adding artifacts to the hierarchy.

**Rationale**:
- **Intuitive**: "Add a milestone to A.1" matches developer mental model
- **Context-aware**: Implies extending existing structure (parent context)
- **Conversational**: Natural phrasing ("let me add an issue")
- **Concise**: Less typing for frequent operations
- **Clear hierarchy**: "Add" emphasizes tree structure over abstract "creation"

**Command patterns**:
```bash
# Add issue to current context (detected from directory)
kodebase add "implement user login"

# Add issue to specific milestone
kodebase add A.1 "implement user login"

# Add milestone to initiative
kodebase add A "authentication phase"

# Add initiative (root level)
kodebase add "core package v1"

# Interactive wizard
kodebase add --interactive
```

**Reserved usage**: The verb `create` is reserved for:
- `kodebase create project` - Initialize new Kodebase project (one-time setup)
- `kodebase create template` - Create reusable templates (future feature)

---

## 3. Workflow Flags: Explicit Checkpoints for AI Reliability

**Decision**: Use explicit command flags (`--continue`, `--submit`, `--abort`) for workflow control instead of implicit behavior or separate commands.

**Context**: Kodebase is designed primarily for AI agent execution with human oversight. AI agents are prone to hallucinations, derailments, and context loss. The system must enforce explicit validation checkpoints to ensure reliable, auditable workflows.

**Rationale**:

### For AI Agents (Primary Design Target)

**✅ Flags provide mandatory validation checkpoints**:
```bash
# Agent must explicitly decide to submit after validation
kodebase add "milestone work"
# ... agent validates locally
kodebase add --submit  # ✅ Explicit validation + PR creation

# vs. dangerous auto-submit
kodebase add "milestone work"  # 🚫 Auto-creates PR without validation gate
```

**✅ Session management across interruptions**:
```bash
# Agent working across multiple conversation turns
kodebase add "milestone 1"
# ... (agent paused, resumed later)
kodebase add --continue "milestone 2"  # ✅ Explicit continuation
kodebase add --submit

# vs. ambiguous implicit behavior
kodebase add "milestone 1"
kodebase add "milestone 2"  # 🚫 New session or continue? Unclear intent
```

**✅ Clean error recovery**:
```bash
# Agent realizes mistake mid-workflow
kodebase add "wrong scope"
kodebase add --abort  # ✅ Clean rollback (delete artifacts + branch)

# vs. manual cleanup (error-prone)
kodebase add "wrong scope"
# 🚫 Agent must manually delete files, reset git state
```

**✅ Explicit state transitions**:
```bash
# Complete work and submit for review
kodebase start A.1.3
# ... implement feature
kodebase start --submit  # ✅ Validate + create PR + transition to in_review

# vs. separate command (more surface area)
kodebase start A.1.3
# ... implement feature
kodebase submit-work  # 🚫 New command to learn, test, maintain
```

**✅ Audit trail clarity**:
```bash
# Command history shows exact intent
$ history | grep kodebase
kodebase add A.1 "auth phase"
kodebase add --continue "add password reset"
kodebase add --submit

# Each flag = explicit decision point logged
```

### Alignment with Constitutional AI Principles

From [AGENTIC_CONSTITUTION.mdc](.kodebase/docs/AGENTIC_CONSTITUTION.mdc):

| Principle | How Flags Support It |
|-----------|---------------------|
| **Explicit over implicit** | `--submit` makes validation explicit, not automatic |
| **Validation before submission** | `--submit` flag enforces validation checkpoint |
| **Clean rollback paths** | `--abort` provides single-command recovery |
| **Idempotent operations** | Flags enable resuming (e.g., `--continue`) without corruption |
| **Audit trail** | Flags in command history = explicit intent logged |

### For Human Developers (Secondary)

**⚠️ Flags add cognitive load** but provide:
- **Power user efficiency**: Learn once, use frequently
- **Clear intent**: `--submit` is self-documenting
- **Flexible workflows**: Can pause/resume with `--continue`
- **Error recovery**: `--abort` safer than manual cleanup

**Mitigations for human UX**:
1. **Interactive prompts** when flags omitted:
   ```bash
   $ kodebase add "implement auth"
   ✓ Created A.1.3 in draft state

   What next?
     1. Add another artifact (kodebase add --continue)
     2. Submit for review (kodebase add --submit)
     3. Abort session (kodebase add --abort)
     4. Exit (save session for later)
   ```

2. **Smart shortcuts** for common cases:
   ```bash
   # Quick single-artifact workflow
   kodebase add "fix typo" --quick
   # Internally: add → validate → submit (all validated)
   ```

3. **Aliases** for frequent operations:
   ```bash
   alias ka="kodebase add"
   alias kas="kodebase add --submit"
   alias ks="kodebase start"
   alias kss="kodebase start --submit"
   ```

### Alternatives Considered

**❌ Alternative 1: Separate commands**
```bash
kodebase add "work"
kodebase submit-add
```
- **Rejected**: More commands = larger API surface, more testing, less clear intent

**❌ Alternative 2: Automatic submit on validation success**
```bash
kodebase add "work"  # Auto-validates and submits if clean
```
- **Rejected**: Removes validation checkpoint, no way to pause/review before submit

**❌ Alternative 3: Interactive mode only**
```bash
kodebase add --wizard  # Always interactive
```
- **Rejected**: Blocks AI agents (can't handle interactive prompts), slower for power users

### Flag Catalog

| Command | Flags | Purpose |
|---------|-------|---------|
| `kodebase add` | `--continue` | Resume last add session on existing branch |
| | `--submit` | Validate artifacts, create PR, transition to ready/blocked |
| | `--abort` | Delete artifacts and abandon add session |
| | `--interactive` | Launch wizard for guided creation |
| `kodebase start` | `--submit` | After work complete: validate, create PR, transition to in_review |
| `kodebase complete` | `--force` | Bypass non-critical warnings |
| | `--dry-run` | Show what would change without writing |
| `kodebase cancel` | `--reason "text"` | Add cancellation reason to event metadata |
| | `--force` | Bypass warnings (e.g., open dependencies) |
| | `--dry-run` | Preview changes without writing |
| `kodebase validate` | `--fix` | Apply automatic safe fixes |
| | `--strict` | Exit 1 if any violations remain (CI mode) |
| `kodebase status` | `--json` | Machine-readable output |
| | `--check-parent` | Exit 2 if ancestor blocked/cancelled |
| | `--all` | List all artifacts with optional filters |

### Implementation Notes

The `@kodebase/artifacts` package provides the underlying operations; the CLI layer implements flag parsing and workflow orchestration:

```typescript
// Example: ArtifactService supports atomic operations
class ArtifactService {
  createArtifact(artifact: Artifact, slug: string): Promise<{ filePath: string }>
  // CLI orchestrates: create → validate → submit based on flags
}

// CLI layer (Initiative C)
async function handleAddCommand(args: AddArgs) {
  if (args.submit) {
    // Orchestrate: create → validate → PR
    const result = await artifactService.createArtifact(...)
    const validation = await validationService.validateArtifact(...)
    if (validation.valid) {
      await gitService.createPR(...)  // CLI responsibility
    }
  }
}
```

### Success Criteria

- ✅ Flags documented in CLI help text with examples
- ✅ Interactive prompts guide users when flags omitted
- ✅ Agent scripts reliably use flags for checkpoints
- ✅ Audit logs show clear intent via flag usage
- ✅ Error recovery works in <3 commands (`--abort` + retry)

**Key Principle**: *Complexity that enforces reliability is good complexity.*

---

## 4. Architecture

```
┌─────────────────────────────────────────┐
│ @kodebase/cli, @kodebase/vscode        │
│ (User-facing tools)                     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│ @kodebase/artifacts                     │
│ - ArtifactService (CRUD operations)     │
│ - ValidationService (unified checks)    │
│ - QueryService (tree traversal)         │
│ - ContextService (detect level)         │
│ - ScaffoldService (create templates)    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│ @kodebase/core                          │
│ (Parser, validator, state machine,      │
│  cascade engine, loader, file service)  │
└─────────────────────────────────────────┘
```

**Separation of Concerns**:
- **Core**: Pure functions, validation rules, data structures
- **Artifacts**: Orchestration, workflows, convenience APIs
- **CLI/Extension**: User interaction, Git operations, hooks

---

## 5. Non-Goals (MVP)

- No Git operations (CLI responsibility)
- No network/API calls (future cloud sync)
- No AI/intelligence features (premium-only)
- No multi-repository operations
- No migration/refactoring tools
- No metrics/analytics collection

---

## 6. Module Structure

### 6.1 Services

#### `services/artifact-service`
**Purpose**: CRUD operations for artifacts

**API**:
```typescript
class ArtifactService {
  constructor(baseDir?: string)

  // Read operations
  getArtifact(id: string): Promise<Artifact>
  getArtifactByPath(path: string): Promise<Artifact>
  artifactExists(id: string): Promise<boolean>

  // Write operations
  createArtifact(artifact: Artifact, slug: string): Promise<{ filePath: string }>
  updateArtifact(id: string, updates: Partial<Artifact>): Promise<void>

  // Event operations
  appendEvent(id: string, event: TArtifactEvent): Promise<void>
  getLatestEvent(id: string): Promise<TArtifactEvent>
  getEventHistory(id: string): Promise<TArtifactEvent[]>

  // Metadata operations
  updateMetadata(id: string, metadata: Partial<ArtifactMetadata>): Promise<void>
}
```

**Key behaviors**:
- Validates artifacts before write (schema + readiness)
- Preserves YAML formatting during updates
- Throws descriptive errors with artifact context
- Uses `@kodebase/core` loader and file service internally

---

#### `services/validation-service`
**Purpose**: Unified validation orchestrating core validators

**API**:
```typescript
type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

type ValidationError = {
  code: string
  message: string
  field?: string
  artifactId?: string
  fixable?: boolean
}

class ValidationService {
  constructor(baseDir?: string)

  // Single artifact validation
  validateArtifact(id: string): Promise<ValidationResult>
  validateArtifactFromPath(path: string): Promise<ValidationResult>

  // Batch validation
  validateAll(filter?: { type?: ArtifactType; status?: string }): Promise<Map<string, ValidationResult>>

  // Specific checks
  checkSchema(id: string): Promise<ValidationResult>
  checkReadiness(id: string): Promise<ValidationResult>
  checkStateMachine(id: string): Promise<ValidationResult>
  checkDependencies(id: string): Promise<ValidationResult>

  // Fix operations (safe only)
  autoFix(id: string, options?: { dryRun?: boolean }): Promise<{ fixed: string[]; skipped: string[] }>
}
```

**Validation pipeline**:
1. **Schema validation**: Zod schemas from core
2. **Readiness validation**: Dependency rules, sibling constraints
3. **State machine validation**: Transition legality, chronology
4. **Cross-artifact validation**: Circular dependencies, cross-level checks

**Error codes**:
- `SCHEMA_INVALID`: Zod validation failure
- `DEPS_CROSS_LEVEL`: Cross-level dependency
- `DEPS_CIRCULAR`: Circular dependency detected
- `DEPS_INVALID_SIBLING`: Non-sibling dependency
- `STATE_ILLEGAL_TRANSITION`: Invalid state transition
- `STATE_CHRONOLOGY`: Event order violation
- `EVENT_MISSING_TRIGGER`: Required trigger missing
- `DRAFT_ON_MAIN`: Draft artifact on main branch

---

#### `services/query-service`
**Purpose**: Tree traversal and artifact queries

**API**:
```typescript
type ArtifactTree = {
  artifact: Artifact
  children: ArtifactTree[]
  parent?: Artifact
}

type QueryFilter = {
  type?: ArtifactType
  state?: string[]
  priority?: string[]
  assignee?: string
  tags?: string[]
}

class QueryService {
  constructor(baseDir?: string)

  // Tree operations
  getTree(rootId?: string): Promise<ArtifactTree>
  getChildren(id: string): Promise<Artifact[]>
  getParent(id: string): Promise<Artifact | null>
  getSiblings(id: string): Promise<Artifact[]>

  // Dependency graph
  getDependencies(id: string): Promise<Artifact[]>
  getBlockedBy(id: string): Promise<Artifact[]>
  getBlocking(id: string): Promise<Artifact[]>

  // Query operations
  findArtifacts(filter: QueryFilter): Promise<Artifact[]>
  findByState(state: string): Promise<Artifact[]>
  findByAssignee(assignee: string): Promise<Artifact[]>

  // Path operations
  getArtifactPath(id: string): Promise<Artifact[]> // [root, ..., artifact]
  getDepth(id: string): Promise<number>

  // Statistics
  getStats(): Promise<{
    total: number
    byType: Record<ArtifactType, number>
    byState: Record<string, number>
  }>
}
```

**Performance considerations**:
- Lazy loading for large trees
- Caching for repeated queries within same operation
- O(siblings) for dependency checks
- O(depth) for parent traversal

---

#### `services/context-service`
**Purpose**: Detect and manage artifact context

**API**:
```typescript
type ContextInfo = {
  level: 'root' | 'initiative' | 'milestone' | 'issue'
  currentId?: string
  parentId?: string
  ancestorIds: string[]
  branchName?: string
}

class ContextService {
  constructor(baseDir?: string)

  // Context detection
  detectContext(targetPath?: string): Promise<ContextInfo>
  detectFromBranch(branchName: string): Promise<ContextInfo>
  detectFromPath(filePath: string): Promise<ContextInfo>

  // Context validation
  isValidContext(targetPath?: string): Promise<boolean>
  requireContext(level: 'initiative' | 'milestone' | 'issue'): Promise<ContextInfo>

  // Artifact layout
  ensureLayout(): Promise<void> // Create .kodebase/artifacts if missing
  isKodebaseProject(): Promise<boolean>
}
```

**Context detection rules**:
- **Root**: `.kodebase/artifacts/` exists, no artifact files in path
- **Initiative**: Inside `A.<slug>/` directory with `A.yml`
- **Milestone**: Inside `A.1.<slug>/` directory with `A.1.yml`
- **Issue**: Currently editing `A.1.1.<slug>.yml`

**Branch name parsing**:
- Work branches: `A.1.3` → issue context
- Add branches: `add/A.1` → milestone context
- Complete branches: `complete/A` → initiative context

---

#### `services/scaffold-service`
**Purpose**: Create artifact templates with sensible defaults

**API**:
```typescript
type ScaffoldOptions = {
  id?: string // Auto-allocate if not provided
  slug: string
  title: string
  actor: string
  priority?: string
  estimation?: string
  assignee?: string
  blocked_by?: string[]
}

type InitiativeScaffoldOptions = ScaffoldOptions & {
  vision: string
  in_scope: string[]
  out_of_scope: string[]
  success_criteria: string[]
}

type MilestoneScaffoldOptions = ScaffoldOptions & {
  summary: string
  deliverables: string[]
  validation?: string[]
}

type IssueScaffoldOptions = ScaffoldOptions & {
  summary: string
  acceptance_criteria: string[]
}

class ScaffoldService {
  constructor(baseDir?: string)

  // Scaffold operations
  scaffoldInitiative(options: InitiativeScaffoldOptions): Promise<{ artifact: Initiative; filePath: string }>
  scaffoldMilestone(options: MilestoneScaffoldOptions, parentId: string): Promise<{ artifact: Milestone; filePath: string }>
  scaffoldIssue(options: IssueScaffoldOptions, parentId: string): Promise<{ artifact: Issue; filePath: string }>

  // ID allocation
  allocateNextId(parentId: string | null, type: ArtifactType): Promise<string>

  // Template operations
  getTemplate(type: ArtifactType): Artifact // Empty template for type
  validateScaffoldOptions(options: ScaffoldOptions, type: ArtifactType): ValidationResult
}
```

**Scaffolding behavior**:
- Auto-allocates next available ID if not provided
- Creates `draft` event with `artifact_created` trigger
- Sets `schema_version: "0.0.1"`
- Validates options before creating artifact
- Creates parent directories if needed
- Returns both artifact object and file path

**ID allocation strategy**:
- Initiatives: Find highest letter ID (A, B, ..., Z, AA, AB, ...)
- Milestones: Find highest numeric ID under parent (A.1, A.2, ...)
- Issues: Find highest numeric ID under parent (A.1.1, A.1.2, ...)

---

### 6.2 Utilities

#### `utils/artifact-helpers`
```typescript
// ID operations
export function parseArtifactId(id: string): { type: ArtifactType; parentId?: string; number?: number }
export function getParentId(id: string): string | null
export function isValidId(id: string): boolean

// State operations
export function getCurrentState(artifact: Artifact): string
export function isTerminalState(state: string): boolean
export function canTransitionTo(artifact: Artifact, targetState: string): boolean

// Event operations
export function sortEventsByTimestamp(events: TArtifactEvent[]): TArtifactEvent[]
export function getEventsByTrigger(artifact: Artifact, trigger: string): TArtifactEvent[]
export function getLatestEventByType(artifact: Artifact, eventType: string): TArtifactEvent | undefined

// Dependency operations
export function getAllDependencies(artifact: Artifact): string[]
export function hasDependencies(artifact: Artifact): boolean
export function isBlocked(artifact: Artifact): boolean
```

#### `utils/error-formatter`
```typescript
export class ArtifactError extends Error {
  constructor(
    message: string,
    public code: string,
    public artifactId?: string,
    public field?: string,
    public fixable?: boolean
  )
}

export function formatValidationErrors(errors: ValidationError[]): string
export function formatSchemaError(error: ZodError, artifactId?: string): ValidationError[]
export function createUserFriendlyError(error: unknown, context?: string): ArtifactError
```

---

## 7. Public API Surface

**Exports** (from `index.ts`):
```typescript
// Services
export { ArtifactService } from './services/artifact-service'
export { ValidationService } from './services/validation-service'
export { QueryService } from './services/query-service'
export { ContextService } from './services/context-service'
export { ScaffoldService } from './services/scaffold-service'

// Types
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ArtifactTree,
  QueryFilter,
  ContextInfo,
  ScaffoldOptions,
  InitiativeScaffoldOptions,
  MilestoneScaffoldOptions,
  IssueScaffoldOptions,
}

// Utilities
export * from './utils/artifact-helpers'
export { ArtifactError, formatValidationErrors } from './utils/error-formatter'

// Re-export core types for convenience
export type { Artifact, Initiative, Milestone, Issue, TArtifactEvent, ArtifactType } from '@kodebase/core'
```

---

## 8. Flow Mapping (CLI Commands → Implementation)

### 8.1 `kodebase add`
```
1. ContextService.detectContext() → determine level
2. ScaffoldService.allocateNextId() → generate ID
3. ScaffoldService.scaffold{Initiative|Milestone|Issue}() → create artifact
4. ValidationService.validateArtifact() → check validity
5. ArtifactService.createArtifact() → write to disk
```

### 8.2 `kodebase validate`
```
1. QueryService.findArtifacts() → get artifacts to validate
2. ValidationService.validateAll() → run all checks
3. If --fix: ValidationService.autoFix() → apply safe fixes
4. Output errors/warnings to CLI
```

### 8.3 `kodebase start`
```
1. ContextService.detectFromBranch() → parse branch name
2. ArtifactService.getArtifact() → load artifact
3. QueryService.getParent() → check parent state
4. ArtifactService.appendEvent() → add in_progress event
5. CLI handles git branch creation
```

### 8.4 `kodebase complete`
```
1. ContextService.detectContext() → identify artifact
2. ArtifactService.getArtifact() → load artifact
3. ArtifactService.updateMetadata() → add completion content
4. ValidationService.validateArtifact() → ensure valid
5. CLI creates PR with completion info
```

### 8.5 `kodebase status`
```
1. QueryService.getTree() → load full tree
2. QueryService.getStats() → aggregate stats
3. QueryService.findByState() → filter artifacts
4. Format and display in CLI
```

---

## 9. Error Handling

**Error categories**:
1. **Validation errors**: Schema, readiness, state machine violations
2. **File system errors**: Missing files, permission denied, corrupt YAML
3. **Logic errors**: Invalid IDs, circular dependencies, illegal operations
4. **Context errors**: Not in Kodebase project, wrong directory level

**Error formatting**:
- Include artifact ID when applicable
- Show file path for file system errors
- Provide field name for schema errors
- Mark fixable errors with `fixable: true`
- Suggest next steps when possible

**Example error output**:
```
Error: Invalid dependency in artifact A.1.2
Code: DEPS_CROSS_LEVEL
Field: metadata.relationships.blocked_by
Issue: Cannot depend on A.2 (milestone) from A.1.2 (issue)
Fix: Remove A.2 from blocked_by list, or add A.1.X sibling dependency
```

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Each service independently mocked
- All utility functions tested
- Error formatting verified
- Edge cases covered

### 10.2 Integration Tests
- Use `@kodebase/core` fixtures from A.9.1
- Test full workflows (create → validate → update)
- Test error conditions (invalid deps, bad state transitions)
- Test batch operations with large artifact trees

### 10.3 Performance Tests
- Validate 1000+ artifacts in <1 second
- Query operations scale linearly with siblings
- Tree traversal handles deep nesting (10+ levels)

### 10.4 Fixtures
Reuse fixtures from `@kodebase/core`:
- `packages/core/test/fixtures/artifacts-tree/`
- Includes A, A.1, A.1.1...A.1.n with various states and dependencies

---

## 11. Packaging

**Package details**:
```json
{
  "name": "@kodebase/artifacts",
  "version": "0.1.0",
  "description": "High-level artifact operations for Kodebase",
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "@kodebase/core": "^1.0.0"
  }
}
```

**Build requirements**:
- Node >= 22
- TypeScript 5.x
- ESM output only
- Tree-shakable exports

**Development dependencies**:
- Vitest for testing
- Biome for linting/formatting
- @kodebase/typescript-config for TSConfig

---

## 12. Migration from Legacy

**Legacy packages to sunset**:
- `@kodebase/artifact-parser` → use `@kodebase/core` parser
- `@kodebase/artifact-validator` → use `ValidationService`
- `@kodebase/artifact-utils` → use `@kodebase/artifacts` helpers

**Migration path**:
1. Publish `@kodebase/artifacts@0.1.0`
2. Update CLI to use new package
3. Deprecate legacy packages
4. Remove legacy after 1 stable release

---

## 13. Acceptance Criteria

**Must have** (blocking MVP):
- ✅ All 5 services implemented and tested
- ✅ Unified validation pipeline (schema + readiness + state)
- ✅ Context detection from directory and branch name
- ✅ Scaffolding with auto-allocated IDs
- ✅ Query operations for tree traversal
- ✅ Comprehensive error formatting
- ✅ Integration tests using core fixtures
- ✅ 90%+ test coverage
- ✅ JSDoc documentation on all public APIs
- ✅ CLI package can implement all commands using this API

**Nice to have** (post-MVP):
- Caching layer for repeated queries
- Batch update operations
- Event streaming for real-time updates
- Performance profiling tools

---

## 14. Dependencies on Other Initiatives

**Blocks**:
- Initiative C: CLI Package (needs this API)
- Initiative D: VSCode Extension (needs tree queries)

**Blocked by**:
- ✅ Initiative A: Core Package v1 (done)

**Related**:
- Context scripts evolution (future: Context API will use this package)

---

## 15. Timeline Estimate

**Effort**: M-L (48-80 hours)

**Breakdown**:
- Service layer implementation: 24h
- Validation orchestration: 12h
- Query and tree operations: 12h
- Testing and fixtures: 16h
- Documentation: 8h
- Integration with CLI (Initiative C): 8h

**Critical path**:
1. ArtifactService + ValidationService (foundation)
2. ContextService + ScaffoldService (creation flow)
3. QueryService (status/tree operations)
4. Integration tests
5. CLI integration

---

## 16. Success Metrics

**Quality**:
- 90%+ test coverage
- 0 critical bugs in first release
- All integration tests passing
- Type safety with no `any` escapes

**Performance**:
- Validate 1000 artifacts in <1s
- Query operations O(siblings)
- Tree traversal O(depth)

**Developer Experience**:
- 95%+ JSDoc coverage
- Clear error messages
- Simple, predictable APIs
- CLI implementation uses only this package (no direct core imports)

---

## 17. Related Documents

- [Core Package Spec](../package-core/core-package-spec.md)
- [Artifacts Specification](../artifacts/README.md)
- [Event System Architecture](../event-system-architecture/overview.md)
- [Product Vision](.kodebase/docs/strategy/PRODUCT-VISION.md)

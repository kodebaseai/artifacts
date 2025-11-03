# Code Quality & Artifact Integrity System – Spec

**Status**: Draft (Planning Phase)
**Created**: 2025-11-03
**Audience**: Core developers, AI agents, quality assurance
**Dependencies**: `@kodebase/core@1.0.0`, `@kodebase/artifacts@0.1.0`

---

## 1. Purpose

Provide automated detection and reporting of code quality issues and artifact inconsistencies in AI-generated codebases. This system addresses two critical failure modes observed in AI-assisted development:

1. **Dead Code Accumulation**: AI agents generate defensive, future-optimized code that never gets used
2. **Artifact Contradictions**: Requirements specified across multiple artifacts conflict with each other

**Key Goals**:
- Detect unused exports, over-abstractions, and orphaned code
- Identify contradictions between artifact requirements
- Map code back to originating artifacts for accountability
- Provide actionable remediation suggestions
- Integrate into validation pipeline and CI/CD

**What this enables**:
- Pre-merge quality gates in pull requests
- Periodic codebase health reports
- Artifact consistency validation before implementation
- Audit trail for code generation decisions

---

## 2. Problem Statement

### 2.1 Dead Code Problem

**Observed behavior**: AI agents optimize for extensibility and future needs, resulting in:
- Unused utility functions "just in case"
- Single-implementation interfaces for "future flexibility"
- Generic types that are only instantiated once
- Helper modules imported only by test files
- Premature abstractions that add complexity without value

**Current gap**: Standard tools (`ts-prune`, `madge`) detect unused exports but don't:
- Explain *why* code is dead (premature optimization vs. refactoring artifact)
- Link dead code to the artifact/task that created it
- Distinguish between "not yet used" and "will never be used"
- Detect over-engineering patterns (single-impl interfaces, unused generics)

**Impact**:
- Increased cognitive load when navigating codebase
- False confidence in "complete" implementations
- Maintenance burden for code that provides no value
- Slower test runs from unnecessary coverage

### 2.2 Artifact Contradiction Problem

**Observed behavior**: Requirements evolve across multiple artifacts, resulting in:
- Same entity (function, class, state) specified differently
- Conflicting acceptance criteria between dependent artifacts
- State machine transitions that violate earlier constraints
- Performance requirements that contradict completeness goals

**Current gap**: No validation that:
- Requirements across artifacts are logically consistent
- Acceptance criteria don't contradict each other
- Cross-artifact constraints are feasible together
- Implementation choices satisfy all artifact requirements

**Impact**:
- Implementation fails acceptance criteria due to contradictions
- Wasted effort implementing impossible requirements
- Inconsistent behavior across related features
- Manual reconciliation of conflicting specs

---

## 3. Non-Goals

**What this system will NOT do**:
- ❌ Catch logical bugs in implementations (use tests)
- ❌ Validate business logic correctness (use domain review)
- ❌ Measure code complexity/maintainability (use existing tools)
- ❌ Detect security vulnerabilities (use dedicated scanners)
- ❌ Use AI to verify AI-generated code (no LLM validation loops)
- ❌ Enforce coding style/formatting (use Biome/ESLint)
- ❌ Replace human code review

**What this system WILL do**:
- ✅ Detect structural code quality issues (dead code, over-engineering)
- ✅ Validate artifact requirement consistency (deterministic checks)
- ✅ Map code to originating artifacts (git blame → artifact tracking)
- ✅ Provide actionable remediation suggestions
- ✅ Run deterministically in CI/CD pipelines

---

## 4. Architecture

```
┌─────────────────────────────────────────────────┐
│ @kodebase/cli (quality, integrity commands)    │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ @kodebase/quality (new package)                 │
│ - DeadCodeAnalyzer (static analysis)            │
│ - ArtifactIntegrityChecker (consistency)        │
│ - CodeArtifactMapper (git blame → artifact)     │
│ - QualityReporter (aggregated reports)          │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│                                                  │
▼                                                  ▼
┌────────────────────────┐    ┌──────────────────────────┐
│ Static Analysis Tools  │    │ @kodebase/artifacts      │
│ - ts-prune             │    │ - ArtifactService        │
│ - madge                │    │ - QueryService           │
│ - TypeScript API       │    │ - ValidationService      │
└────────────────────────┘    └──────────────────────────┘
```

---

## 5. Module Structure

### 5.1 Dead Code Analysis

#### `analyzers/dead-code-analyzer`

**Purpose**: Detect unused, orphaned, and over-engineered code

**API**:
```typescript
type DeadCodeIssue = {
  type: 'unused-export' | 'single-impl-interface' | 'unused-generic'
       | 'orphaned-file' | 'test-only-import' | 'unreachable-code'
  location: {
    file: string
    line?: number
    symbol: string
  }
  severity: 'error' | 'warning' | 'info'
  reason: string
  originArtifact?: string // Artifact that introduced this code
  suggestion: string
}

type DeadCodeReport = {
  issues: DeadCodeIssue[]
  summary: {
    totalIssues: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
  }
  filesAnalyzed: number
  timestamp: string
}

class DeadCodeAnalyzer {
  constructor(options?: {
    rootDir?: string
    excludePatterns?: string[]
    includeSeverity?: Array<'error' | 'warning' | 'info'>
  })

  // Analysis operations
  analyze(): Promise<DeadCodeReport>
  analyzeFile(filePath: string): Promise<DeadCodeIssue[]>

  // Specific checks
  findUnusedExports(): Promise<DeadCodeIssue[]>
  findSingleImplInterfaces(): Promise<DeadCodeIssue[]>
  findUnusedGenerics(): Promise<DeadCodeIssue[]>
  findOrphanedFiles(): Promise<DeadCodeIssue[]>
  findTestOnlyImports(): Promise<DeadCodeIssue[]>

  // Remediation
  getSuggestions(issue: DeadCodeIssue): string[]
  canAutoFix(issue: DeadCodeIssue): boolean
}
```

**Detection strategies**:

1. **Unused Exports** (leverage `ts-prune`):
   - Run `ts-prune` and parse output
   - Cross-reference with test file imports
   - Flag as `test-only-import` if only tests use it
   - Map to artifact via git blame

2. **Single-Implementation Interfaces**:
   - Use TypeScript Compiler API to find interfaces
   - Count implementations per interface
   - Flag interfaces with exactly 1 implementation
   - Suggest: inline interface or mark with `@future-extension` JSDoc

3. **Unused Generic Type Parameters**:
   - Parse type parameters on functions/classes/interfaces
   - Check if parameter is used in constraints, return type, or body
   - Flag generics that are always called with same concrete type
   - Suggest: replace generic with concrete type

4. **Orphaned Files**:
   - Use `madge` to build dependency graph
   - Find files with no incoming edges (except from tests)
   - Exclude entry points (index.ts, bin files)
   - Map to artifact via git blame

5. **Test-Only Imports**:
   - Build import graph with TypeScript API
   - Track which modules are imported only by `.test.ts` files
   - Flag production code only used in tests
   - Suggest: move to test utilities or delete if unused

**Integration with existing tools**:
```typescript
// Internal implementation sketch
class DeadCodeAnalyzer {
  private async runTsPrune(): Promise<string[]> {
    const result = await exec('npx ts-prune --json')
    return JSON.parse(result.stdout)
  }

  private async buildDependencyGraph(): Promise<DependencyGraph> {
    const config = await madge('src/', { tsConfig: 'tsconfig.json' })
    return config.obj()
  }

  private async analyzeWithCompilerAPI(filePath: string): Promise<Analysis> {
    const program = ts.createProgram([filePath], compilerOptions)
    const checker = program.getTypeChecker()
    // ... analysis logic
  }
}
```

---

### 5.2 Artifact Integrity Checking

#### `analyzers/artifact-integrity-checker`

**Purpose**: Detect contradictions and inconsistencies across artifacts

**API**:
```typescript
type ContradictionType =
  | 'signature-conflict'      // Same function defined differently
  | 'behavior-conflict'       // Same entity with conflicting behavior
  | 'state-conflict'          // State machine contradictions
  | 'constraint-conflict'     // Mutually exclusive constraints
  | 'dependency-conflict'     // Circular or conflicting dependencies

type Contradiction = {
  type: ContradictionType
  entity: string // Function name, class name, state name, etc.
  artifacts: string[] // IDs of conflicting artifacts
  conflict: {
    artifact1: { id: string; says: string; location: string }
    artifact2: { id: string; says: string; location: string }
  }
  severity: 'error' | 'warning' | 'tradeoff'
  explanation: string
  resolutionSuggestions: string[]
}

type IntegrityReport = {
  contradictions: Contradiction[]
  summary: {
    totalContradictions: number
    byType: Record<ContradictionType, number>
    bySeverity: Record<string, number>
  }
  artifactsAnalyzed: number
  timestamp: string
}

class ArtifactIntegrityChecker {
  constructor(options?: {
    baseDir?: string
    strictMode?: boolean // Error on tradeoffs, not just conflicts
  })

  // Main analysis
  check(): Promise<IntegrityReport>
  checkArtifact(artifactId: string): Promise<Contradiction[]>
  checkArtifacts(artifactIds: string[]): Promise<Contradiction[]>

  // Specific checks
  checkSignatures(): Promise<Contradiction[]>
  checkStateMachine(): Promise<Contradiction[]>
  checkConstraints(): Promise<Contradiction[]>
  checkDependencies(): Promise<Contradiction[]>

  // Entity index operations
  buildEntityIndex(): Promise<EntityIndex>
  findEntityMentions(entity: string): Promise<Array<{ artifactId: string; context: string }>>
}
```

**Detection strategies**:

1. **Signature Conflicts** (Deterministic):
   - Parse all acceptance_criteria fields in artifacts
   - Extract function/method signatures using regex patterns:
     - `functionName(args) -> returnType`
     - `functionName throws ErrorType`
     - `functionName returns null/undefined/object`
   - Build entity map: `{ "getUserById": [{ artifact: "A.1.1", signature: "..." }] }`
   - Flag entities with different signatures across artifacts

2. **Behavior Conflicts** (Deterministic):
   - Parse acceptance criteria for behavior assertions:
     - "returns null when X"
     - "throws error when Y"
     - "validates Z before saving"
   - Extract entities and their behaviors
   - Flag same entity with contradictory behaviors

3. **State Machine Conflicts** (Deterministic):
   - Parse all `constraints` and `business_rules` fields
   - Extract state transition rules: `READY -> IN_PROGRESS`, `COMPLETED -> ARCHIVED`
   - Build state graph per artifact type (Initiative, Milestone, Issue)
   - Check for:
     - Contradictory transitions (A→B allowed vs. A→B forbidden)
     - Unreachable states (no path from initial state)
     - Terminal state violations (COMPLETED marked non-terminal)

4. **Constraint Conflicts** (Keyword-based):
   - Parse `constraints` and `performance` fields
   - Extract measurable requirements:
     - Performance: `<100ms`, `<1s`, `O(n)`, `O(log n)`
     - Completeness: "validate all X", "check entire Y chain"
     - Coverage: "100% test coverage", "all edge cases"
   - Flag contradictions:
     - "validate entire ancestor chain" + "performance <100ms" → warning (tradeoff)
     - "throw error on failure" + "return null on failure" → error (contradiction)

5. **Dependency Conflicts** (Deterministic):
   - Extract `blocked_by` from all artifacts
   - Build dependency graph
   - Check for:
     - Circular dependencies: A blocks B blocks C blocks A
     - Cross-level dependencies (already caught by core validation, but double-check)
     - Dependency on cancelled/archived artifacts

**Implementation approach**:
```typescript
class ArtifactIntegrityChecker {
  private async buildEntityIndex(): Promise<EntityIndex> {
    const artifacts = await this.queryService.findArtifacts({})
    const index = new Map<string, EntityMention[]>()

    for (const artifact of artifacts) {
      // Parse acceptance_criteria
      for (const criterion of artifact.acceptance_criteria ?? []) {
        const entities = this.extractEntities(criterion)
        for (const entity of entities) {
          if (!index.has(entity.name)) {
            index.set(entity.name, [])
          }
          index.get(entity.name)!.push({
            artifactId: artifact.id,
            context: criterion,
            type: entity.type, // 'function' | 'class' | 'state' | 'variable'
            signature: entity.signature,
          })
        }
      }
    }

    return index
  }

  private extractEntities(text: string): Entity[] {
    const patterns = [
      // Function signatures
      /(\w+)\(([^)]*)\)\s*(?:->|returns?|throws?)\s*(\w+)/gi,
      // State transitions
      /(\w+)\s+(?:transitions?|moves?)\s+to\s+(\w+)/gi,
      // Null/undefined checks
      /(\w+)\s+(?:returns?|is)\s+(null|undefined)/gi,
    ]

    // Extract and normalize entities
    // ...
  }

  private findSignatureConflicts(index: EntityIndex): Contradiction[] {
    const contradictions: Contradiction[] = []

    for (const [entityName, mentions] of index) {
      if (mentions.length < 2) continue

      // Group by signature
      const signatureGroups = this.groupBySignature(mentions)

      if (signatureGroups.size > 1) {
        // Multiple different signatures for same entity
        const [sig1, mentions1] = Array.from(signatureGroups)[0]
        const [sig2, mentions2] = Array.from(signatureGroups)[1]

        contradictions.push({
          type: 'signature-conflict',
          entity: entityName,
          artifacts: [mentions1[0].artifactId, mentions2[0].artifactId],
          conflict: {
            artifact1: {
              id: mentions1[0].artifactId,
              says: sig1,
              location: mentions1[0].context,
            },
            artifact2: {
              id: mentions2[0].artifactId,
              says: sig2,
              location: mentions2[0].context,
            },
          },
          severity: 'error',
          explanation: `Entity "${entityName}" has conflicting signatures across artifacts`,
          resolutionSuggestions: [
            'Update one artifact to match the other',
            'Create separate functions with distinct names',
            'Add version/overload information to signatures',
          ],
        })
      }
    }

    return contradictions
  }
}
```

---

### 5.3 Code-Artifact Mapping

#### `mappers/code-artifact-mapper`

**Purpose**: Link code to originating artifacts via git history

**API**:
```typescript
type CodeOrigin = {
  file: string
  line?: number
  symbol?: string
  artifactId?: string
  commit: {
    hash: string
    message: string
    author: string
    timestamp: string
  }
  confidence: 'high' | 'medium' | 'low'
}

class CodeArtifactMapper {
  constructor(options?: {
    rootDir?: string
    branchPattern?: RegExp // Default: /^[A-Z]\.\d+(\.\d+)?$/
  })

  // Mapping operations
  getOrigin(file: string, line?: number): Promise<CodeOrigin>
  getOrigins(files: string[]): Promise<Map<string, CodeOrigin>>

  // Artifact extraction
  extractArtifactFromCommit(commitHash: string): Promise<string | null>
  extractArtifactFromBranch(branchName: string): Promise<string | null>

  // Bulk operations
  mapDeadCodeToArtifacts(issues: DeadCodeIssue[]): Promise<DeadCodeIssue[]>
}
```

**Mapping strategy**:

1. **Git Blame Analysis**:
   - Run `git blame -L<line> <file>` to get commit hash
   - Extract commit message and branch name from history
   - Parse artifact ID from:
     - Branch name: `A.1.3` → artifact A.1.3
     - Commit message: Match patterns like `A.1.3:`, `[A.1.3]`, `A.1.3 -`
   - Set confidence:
     - `high`: Branch name matches artifact pattern
     - `medium`: Commit message contains artifact ID
     - `low`: No artifact ID found (fallback to commit author)

2. **Integration with Dead Code Analysis**:
   ```typescript
   async mapDeadCodeToArtifacts(issues: DeadCodeIssue[]): Promise<DeadCodeIssue[]> {
     const enrichedIssues = await Promise.all(
       issues.map(async (issue) => {
         const origin = await this.getOrigin(issue.location.file, issue.location.line)
         return {
           ...issue,
           originArtifact: origin.artifactId,
           addedBy: origin.commit.author,
           addedAt: origin.commit.timestamp,
           confidence: origin.confidence,
         }
       })
     )
     return enrichedIssues
   }
   ```

---

### 5.4 Quality Reporting

#### `reporters/quality-reporter`

**Purpose**: Aggregate and format quality reports

**API**:
```typescript
type QualityReport = {
  timestamp: string
  summary: {
    deadCodeIssues: number
    contradictions: number
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
  }
  deadCode: DeadCodeReport
  integrity: IntegrityReport
  recommendations: string[]
}

type ReportFormat = 'markdown' | 'json' | 'html' | 'terminal'

class QualityReporter {
  constructor(options?: {
    analyzer: DeadCodeAnalyzer
    checker: ArtifactIntegrityChecker
    mapper: CodeArtifactMapper
  })

  // Report generation
  generateReport(): Promise<QualityReport>
  formatReport(report: QualityReport, format: ReportFormat): string

  // CI/CD integration
  checkThresholds(report: QualityReport, thresholds: Thresholds): {
    passed: boolean
    failures: string[]
  }

  // Diff reporting (compare with baseline)
  generateDiffReport(baseline: QualityReport, current: QualityReport): DiffReport
}

type Thresholds = {
  maxDeadCodeIssues?: number
  maxContradictions?: number
  maxErrorSeverity?: number
  allowedIssueTypes?: string[]
}
```

**Report formats**:

1. **Terminal** (default for CLI):
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Code Quality & Integrity Report
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📊 Summary
   ├─ Dead Code Issues: 12 (3 errors, 9 warnings)
   ├─ Contradictions: 2 (2 errors, 0 warnings)
   └─ Overall Health: Fair

   ❌ Dead Code (12 issues)

   1. Unused export: formatUserName
      Location: src/utils/user-helpers.ts:45
      Artifact: A.2.3 (added by @claude)
      Suggestion: Remove export or add usage

   2. Single-impl interface: IUserRepository
      Location: src/repositories/user-repo.ts:12
      Artifact: A.3.1 (added by @claude)
      Suggestion: Inline interface into UserRepository class

   ...

   ⚠️  Contradictions (2 issues)

   1. Signature conflict: getUserById
      Artifacts: A.1.2, A.3.4
      A.1.2 says: getUserById(id: string) -> User | null
      A.3.4 says: getUserById(id: string) throws NotFoundError
      Resolution: Standardize error handling approach

   ...

   💡 Recommendations
   - Review A.2.3 for unnecessary utility functions
   - Reconcile getUserById error handling in A.1.2 and A.3.4
   - Consider removing single-impl interfaces for simplicity
   ```

2. **JSON** (for programmatic use):
   ```json
   {
     "timestamp": "2025-11-03T10:30:00Z",
     "summary": { ... },
     "deadCode": { "issues": [...] },
     "integrity": { "contradictions": [...] },
     "recommendations": [...]
   }
   ```

3. **Markdown** (for PR comments):
   ```markdown
   ## Code Quality & Integrity Report

   **Summary**: Found 12 dead code issues and 2 contradictions

   ### Dead Code Issues

   | Type | Location | Artifact | Severity |
   |------|----------|----------|----------|
   | Unused export | src/utils/user-helpers.ts:45 | A.2.3 | Error |
   | ... | ... | ... | ... |

   ### Contradictions

   ...
   ```

---

## 6. CLI Integration

### 6.1 New Commands

```bash
# Run full quality analysis
kodebase quality check

# Only dead code analysis
kodebase quality check --dead-code

# Only artifact integrity
kodebase quality check --integrity

# Output formats
kodebase quality check --format json
kodebase quality check --format markdown > report.md

# CI mode (exit 1 if issues found)
kodebase quality check --strict

# With thresholds
kodebase quality check --max-issues 10 --max-contradictions 0

# Map dead code to artifacts
kodebase quality check --show-origins

# Generate baseline for future comparisons
kodebase quality baseline --save .kodebase/quality-baseline.json

# Compare with baseline
kodebase quality check --compare .kodebase/quality-baseline.json
```

### 6.2 Integration Points

**Pre-merge hook** (optional):
```bash
# In .kodebase/hooks/pre-merge.sh
kodebase quality check --strict --max-contradictions 0
```

**CI/CD pipeline**:
```yaml
# .github/workflows/quality.yml
- name: Check code quality
  run: pnpm kodebase quality check --format json --output quality-report.json

- name: Comment on PR
  uses: actions/github-script@v6
  with:
    script: |
      const report = require('./quality-report.json')
      // Post formatted report as PR comment
```

**Pre-implementation check**:
```bash
# Before starting work on A.3.4
kodebase quality check --integrity --artifact A.3.4

# Check if A.3.4 contradicts existing artifacts
kodebase quality check --integrity --artifacts A.3.4,A.1.2,A.2.1
```

---

## 7. Implementation Plan

### Phase 1: Dead Code Detection (MVP)
**Effort**: 16-24 hours

**Deliverables**:
- `DeadCodeAnalyzer` with unused export detection (ts-prune integration)
- `CodeArtifactMapper` for git blame analysis
- Basic CLI: `kodebase quality check --dead-code`
- Terminal report format
- Tests with sample dead code

**Acceptance Criteria**:
- Detects all unused exports from ts-prune
- Maps 80%+ of dead code to originating artifacts
- Terminal output is clear and actionable
- 85%+ test coverage

### Phase 2: Over-Engineering Detection
**Effort**: 12-16 hours

**Deliverables**:
- Single-implementation interface detection
- Unused generic detection
- Orphaned file detection (madge integration)
- Test-only import detection
- Enhanced reports with suggestions

**Acceptance Criteria**:
- Detects all patterns in test fixtures
- Provides actionable suggestions
- 90%+ test coverage

### Phase 3: Artifact Integrity (Foundation)
**Effort**: 16-20 hours

**Deliverables**:
- `ArtifactIntegrityChecker` with entity index
- Signature conflict detection
- Behavior conflict detection
- Basic CLI: `kodebase quality check --integrity`
- JSON output format

**Acceptance Criteria**:
- Detects signature conflicts in test artifacts
- Detects behavior contradictions
- 85%+ test coverage
- Handles 100+ artifacts efficiently

### Phase 4: Advanced Integrity Checks
**Effort**: 12-16 hours

**Deliverables**:
- State machine conflict detection
- Constraint conflict detection (tradeoffs)
- Dependency conflict detection
- Markdown report format for PRs

**Acceptance Criteria**:
- Detects all contradiction types
- Distinguishes errors from tradeoffs
- 90%+ test coverage

### Phase 5: CI/CD Integration & Baselines
**Effort**: 8-12 hours

**Deliverables**:
- Threshold checking for CI
- Baseline generation and comparison
- HTML report format
- GitHub Action example
- Documentation

**Acceptance Criteria**:
- CI integration works in test repo
- Baseline comparison shows diffs
- Documentation covers all use cases

**Total Effort**: 64-88 hours

---

## 8. Testing Strategy

### 8.1 Unit Tests

**DeadCodeAnalyzer**:
- Mock `ts-prune` output
- Test pattern detection (single-impl, unused generics)
- Test severity assignment
- Test suggestion generation

**ArtifactIntegrityChecker**:
- Test entity extraction from acceptance criteria
- Test signature conflict detection
- Test state machine validation
- Test constraint parsing

**CodeArtifactMapper**:
- Mock git blame output
- Test artifact ID extraction from branches/commits
- Test confidence scoring

### 8.2 Integration Tests

**End-to-end scenarios**:
- Run full analysis on test codebase with known issues
- Verify all expected issues are detected
- Verify false positive rate is <5%
- Test with real artifact tree from fixtures

**Performance tests**:
- Analyze 1000+ files in <10 seconds
- Check 100+ artifacts for contradictions in <5 seconds
- Memory usage stays under 500MB for large repos

### 8.3 Test Fixtures

Create dedicated fixtures:
```
test/fixtures/dead-code/
├── unused-export.ts           # Unused exported function
├── single-impl-interface.ts   # Interface with one impl
├── unused-generic.ts          # Generic only used with one type
├── orphaned-file.ts           # File with no imports
└── test-only-import.ts        # Only imported by tests

test/fixtures/contradictions/
├── A.1.yml                    # getUserById returns null
├── A.2.yml                    # getUserById throws error
├── A.3.yml                    # State: READY -> IN_PROGRESS
└── A.4.yml                    # State: IN_PROGRESS -> READY (conflict)
```

---

## 9. Success Metrics

**Effectiveness**:
- Detects 90%+ of manually identified dead code
- Detects 95%+ of known artifact contradictions
- False positive rate <10%
- 80%+ of issues mapped to originating artifacts

**Performance**:
- Full analysis on Kodebase codebase (<500 files) in <5 seconds
- Scales to 2000+ files in <30 seconds
- Memory usage <500MB for large repos

**Developer Experience**:
- Reports are actionable (clear suggestions)
- CLI is intuitive (follows existing patterns)
- CI integration is <5 lines of config
- 90%+ of developers find reports useful (survey)

---

## 10. Open Questions

1. **Severity Thresholds**: How to determine error vs. warning for dead code?
   - Proposal: Unused exports = error, single-impl interface = warning

2. **Auto-fix**: Should we implement automatic dead code removal?
   - Risk: Removing code that's about to be used
   - Proposal: Phase 6 (post-MVP), with explicit `--fix` flag and confirmation

3. **Contradiction Resolution**: Who decides how to resolve contradictions?
   - Proposal: Tool only reports, humans decide resolution strategy

4. **Integration with artifacts package**: Should this be part of `@kodebase/artifacts` or separate `@kodebase/quality`?
   - Proposal: Separate package, optional dependency for CLI

5. **LLM usage**: Should we use LLM for semantic contradiction detection?
   - Proposal: Phase 6 exploration, only if deterministic checks prove insufficient
   - Must be opt-in, not required for core functionality

---

## 11. Future Enhancements (Post-MVP)

- **Auto-fix support**: Safe automated removal of dead code
- **Semantic analysis**: Use LLM for nuanced contradiction detection (opt-in)
- **Visual reports**: Web dashboard for quality trends over time
- **IDE integration**: Real-time dead code highlighting in VSCode
- **Custom rules**: Allow projects to define custom patterns to detect
- **Artifact recommendation engine**: Suggest artifact structure improvements
- **Code generation auditing**: Track which artifacts generated which code

---

## 12. Acceptance Criteria (MVP)

**Must have**:
- ✅ Dead code detection (unused exports, single-impl, orphaned files)
- ✅ Artifact integrity checking (signature, behavior, state conflicts)
- ✅ Code-to-artifact mapping (git blame integration)
- ✅ CLI commands: `kodebase quality check` with filters
- ✅ Report formats: terminal, JSON, markdown
- ✅ CI/CD integration (thresholds, exit codes)
- ✅ 85%+ test coverage
- ✅ Documentation with examples

**Nice to have** (can defer):
- Baseline comparison
- HTML report format
- Auto-fix support
- VSCode extension integration

---

## 13. Dependencies

**Blocks**:
- Nothing (orthogonal to existing work)

**Blocked by**:
- `@kodebase/artifacts@0.1.0` (for integrity checking)

**Related**:
- `@kodebase/cli` (will add new commands)
- CI/CD pipelines (will integrate quality gates)

---

## 14. Related Documents

- [Artifacts Package Spec](../package-artifacts/artifacts-package-spec.md)
- [Core Package Spec](../package-core/core-package-spec.md)
- [Agentic Constitution](.kodebase/docs/AGENTIC_CONSTITUTION.mdc)
- [Product Vision](.kodebase/docs/strategy/PRODUCT-VISION.md)

# @kodebase/core – MVP Spec

Status: Draft
Audience: Core engineers, CLI maintainers, tooling integrators

## 1. Purpose
- Provide the engine and pure functions for artifacts, events, readiness, and cascades.
- Power two MVP flows:
  - New project bootstrap (empty repo → minimal artifacts scaffold  validation).
  - Ongoing projects adding work (add milestones/issues with validation and events).
- Remain UI-/Git-agnostic; CLI/hooks handle user interaction and Git operations.

References:
- Event system overview: .kodebase/docs/specs/event-system-architecture/overview.md
- Normative rules: .kodebase/docs/specs/event-system-architecture/the-event-system.md
- CLI contract: .kodebase/docs/specs/event-system-architecture/the-cli-overhaul.md

## 2. Non‑Goals (MVP)
- No correlation or event IDs; chronological order is authoritative.
- No cross-level dependencies or fan-out writes to children.
- Exclude query API, metrics, batch/cleanup/factory, advanced analyzers.
- No Git operations; no network/provider specifics.

## 3. Data Model

### 3.1 Artifact IDs and Layout
- Artifact ID format
  - Initiative: `A`
  - Milestone: `A.1`
  - Issue: `A.1.1`
- Filesystem layout
  - `.kodebase/artifacts/A.<initiative-slug>/A.yml`
  - `.kodebase/artifacts/A.<initiative-slug>/A.1.<milestone-slug>/A.1.yml`
  - `.kodebase/artifacts/A.<initiative-slug>/A.1.<milestone-slug>/A.1.1.<issue-slug>.yml`
- ID extraction from filename (slug-tolerant)
  - Regex: `^([A-Z](?:\.\d+)*)(?:\..+)?\.yml$` → group 1 is the ID.

Scalability note: The hierarchical layout naturally partitions artifacts by initiative and milestone. The loader performs recursive globbing under `.kodebase/artifacts/` and operates in O(siblings) per check. This handles thousands of artifacts without additional sharding. If needed, subfolder sharding strategies can be introduced in a future spec without breaking the ID model.

### 3.2 Event Record (immutable, append-only)
- Fields
  - `event` (required)
  - `timestamp` (required; ISO-8601 UTC)
  - `actor` (required; `Name (email)` or `agent.TYPE.SESSION@tenant.kodebase.ai`)
  - `trigger` (required; string; see below)
  - `metadata?` (object)
- Triggers used by MVP
  - `artifact_created`, `dependencies_met`, `has_dependencies`, `branch_created`, `pr_ready`, `pr_merged`, `manual_cancel`, `dependency_completed`, `children_started`, `children_completed`, `parent_completed`, `parent_archived`.

### 3.3 State Machine (per artifact type)
- States: `draft`, `ready`, `blocked`, `in_progress`, `in_review`, `completed`, `cancelled`, `archived`.
- Enforce legal transitions and chronological order; first event must be `draft`.
- Draft state is permitted only on feature branches; PRs must contain `ready` or `blocked` as the terminal creation-state before merge; presence of `draft` on `main` is a validation failure.

### 3.4 Dependency Rules
- Sibling-only constraint with same-parent requirement:
  - Initiative depends only on initiatives.
  - Milestone depends only on milestones within the same initiative.
  - Issue depends only on issues within the same milestone.

## 4. Rules and Invariants
- No persistent downward propagation: ancestor `blocked`/`cancelled`/`archived` is computed at runtime; children do not store mirror events.
- Five flows only: creation, progress cascade, completion cascade, dependency resolution, cancel. Archival is a result of completion/cancel cascades (not a standalone flow).
- Idempotent read/write operations; deterministic outputs given the same inputs.
- Validation is strict: schemas and readiness rules enforce sibling-only deps and minimal content.

## 5. Module Structure (MVP)

### 5.1 Data and Validation
- `data/types`
  - Constants and types for states, triggers, priorities, estimation sizes.
- `data/schemas`
  - `artifactMetadataSchema`, `initiativeSchema`, `milestoneSchema`, `issueSchema` (Zod).
- `data/parser`
  - `ArtifactParser` – YAML → typed artifacts; throws formatted validation errors.
- `data/validator`
  - `ArtifactValidator` – type detection and validation; error formatter utilities.

### 5.2 Rules and Flows
- `validation/readiness-validator`
  - Readiness checks per type; sibling-only dep enforcement; cycle detection; cross-level and same-parent validation.
- `automation/validation/state-machine`
  - Transition legality and chronological checks.
- `automation/events/builder`
  - Event builder requiring explicit `trigger` (no fallback).
- `automation/cascade/engine`
  - Upward cascades only: first child `in_progress` → parent `in_progress`; all children `completed` → parent `in_review`.

### 5.3 Discovery and IO
- `loading/artifact-loader`
  - Discover artifact file paths; ID extraction; type filters; slug-tolerant parsing.
- `services/artifact-file-service`
  - YAML read/write with stable formatting.

### 5.4 Utilities
- `utils/actor` and `utils/timestamp` helpers; optional YAML formatting helpers.

### 5.5 Wizard Support Helpers (UI-agnostic)
- layout
  - `ensureArtifactsLayout(baseDir): Promise<void>`
  - `resolveArtifactPaths({ id, slug, baseDir }): { filePath, dirPath }`
- ids
  - `detectContextLevel(targetPath|cwd): 'initiative'|'milestone'|'issue'`
  - `allocateNextId(parentId, type, loader): Promise<string>`
- scaffolder
  - `scaffoldInitiative({ id, title, vision, scope, success_criteria, actor }): Initiative`
  - `scaffoldMilestone({ id, summary, deliverables, validation, actor }): Milestone`
  - `scaffoldIssue({ id, summary, acceptance_criteria, actor }): Issue`
  - Each scaffold includes a `draft` event with `artifact_created` trigger.
- runtime-gating
  - `isAncestorBlockedOrCancelled(artifactId, loader): Promise<{ blocked: boolean; reason?: string }>`
  - Read-only; used by CLI `--check-parent`.

Detailed wizard UX/flows are specified separately; core only provides enabling helpers.

## 6. Public API Surface

### 6.1 Types
- `TArtifactEvent`, `TEventTrigger`, `ArtifactType`, schema-inferred types (`Initiative`, `Milestone`, `Issue`).

### 6.2 Parsing/Validation
- `new ArtifactParser().parseInitiative|Milestone|Issue(yaml: string)`
- `new ArtifactValidator().validate(data: unknown): Artifact`

### 6.3 Readiness and Constraints
- `new ReadinessValidator().validateIssue|Milestone|InitiativeReadiness(artifact, id, allArtifacts?)`
- `detectCircularDependencies(artifactsMap)`
- `detectCrossLevelRelationships(artifactsMap)` (enforces same-parent)

### 6.4 State Machine
- `canTransition(type, from, to)`, `getValidTransitions(type, state)`

### 6.5 Events
- `createEvent({ event, timestamp?, actor, trigger, metadata? })`
- `createDraftEvent(actor, timestamp?)`, `createReadyEvent(actor, timestamp?)`

### 6.6 Cascades
- `new CascadeEngine().shouldCascadeToParent(children, parentState?)`
- `new CascadeEngine().generateCascadeEvent(newState, triggerEvent, cascadeType)`

### 6.7 Discovery/IO
- `new ArtifactLoader(baseDir?).loadAllArtifactPaths()`
- `getArtifactIdFromPath(path)`, `loadArtifactsByType(type)`
- `new ArtifactFileService().readArtifact(path)`, `writeArtifact(path, data)`

### 6.8 Wizard Support (new)
- `ensureArtifactsLayout(baseDir)`
- `resolveArtifactPaths({ id, slug, baseDir })`
- `detectContextLevel(targetPath|cwd)`
- `allocateNextId(parentId, type, loader)`
- `scaffoldInitiative|Milestone|Issue(...)`
- `isAncestorBlockedOrCancelled(artifactId, loader)`

## 7. Flow Mapping (Feature → Implementation)

### 7.1 New repo bootstrap
- Create layout: `ensureArtifactsLayout`
- Minimal set A, A.1, A.1.1: `allocateNextId`, `scaffold*`, `ArtifactFileService.writeArtifact`
- Initial validation: `ArtifactValidator`, `ReadinessValidator`, then write `ready` or `blocked` with details

### 7.2 Ongoing projects adding work
- Context detection: `detectContextLevel`
- ID allocation: `allocateNextId`
- Scaffolding: `scaffold*`  `draft` event
- Scaffolding: `scaffold*` + `draft` event
- Submit PR: CLI handles Git; core validates and determines `ready`/`blocked`
- Start issue: hook → CLI emits `in_progress` via `createEvent({ trigger: branch_created })`
- Cascades: `shouldCascadeToParent` informs parent transitions; parent events are recorded by the relevant flow

## 8. Behavior Contracts
- Sibling-only dependencies with same-parent constraint:
  - Issue `A.1.Y` depends only on `A.1.*`.
  - Milestone `A.X` depends only on `A.*` (same initiative).
  - Initiative `A` depends only on other initiatives.
- Chronology enforced; first event must be `draft`.
- Event builder requires `trigger`; no default/fallback.
- Parent state is computed; not persisted on children.

## 9. Error Handling
- Parser/validator throw detailed error messages via error-formatter.
- Readiness errors/warnings include codes, fields, and `fixable` flags only for safe formatting operations.
- IO errors include path context; messages are user-readable.

## 10. Performance Targets
- Dependency checks O(siblings); cascades O(tree-depth).
- Validation on ≤1k artifacts targets ≤100 ms per state-change.

## 11. Integration Points (CLI)
- `kodebase setup` → `ensureArtifactsLayout`
- `kodebase create` → detect level, allocate IDs, scaffold, write, `validate`, compute `ready`/`blocked`
- `kodebase start` → hook emits `in_progress` event via builder; `isAncestorBlockedOrCancelled` used to gate
- `kodebase status --check-parent` → `isAncestorBlockedOrCancelled`
- `kodebase validate --fix` → schema/readiness; safe formatting fixes only

## 12. Testing Strategy
- Unit tests: schemas, parser, validator, state-machine, builder, cascade, helpers.
- Integration: sample artifact trees covering five flows; golden YAML fixtures.
- ID/slug regex tests; sibling-only dependency enforcement; cycle detection.
- Hooks/Git flows tested in the CLI package (not in core).

## 13. Packaging
- Package name: `@kodebase/core`
- Tooling: Node >= 22; TypeScript; Biome formatting/linting.
- Exports map to top-level modules; tree-shakable.
- Keep legacy/core as reference-only; do not publish.

## 14. Deferred Items
- Query API, metrics, event cleanup/batch, completion analyzer, migration tooling.

## 15. Acceptance Criteria
- Parses and validates the defined layout with slug filenames; IDs extracted correctly.
- Readiness: sibling-only deps enforced; invalid cross-level and cross-parent deps rejected.
- Event writing: builder enforces `trigger`; chronological/state checks hold.
- Cascades: first child `in_progress` → parent `in_progress`; all children `completed` → parent `in_review` (recommendations available).
- Wizard support: can scaffold minimal A, A.1, A.1.1; allocate sequential IDs; compute `ready`/`blocked` on submit.
- CLI consumers can implement `create`, `start`, `status --check-parent`, `validate --fix` using this API.

# @kodebase/core – Initiative Planning

Status: Draft
Owner: Core Team
Links: core-package-spec.md

## Initiative
- Title: Core Package v1 (Engine for Artifacts, Validation, Cascades)
- Goal: Ship a minimal, robust @kodebase/core that powers the MVP flows: new repo bootstrap and adding work in ongoing projects.
- Non‑Goals: Query API, metrics, batch/cleanup, completion analyzer, full migration tooling, detailed wizard UX (separate initiative).
- Success Criteria:
  - Validates and parses v1 artifacts (slugged filenames) at scale.
  - Enforces sibling‑only dependencies and legal state transitions.
  - Provides upward cascade recommendations (child → parent).
  - Exposes wizard‑enabling helpers (layout, IDs, scaffolding, gating).
  - Consumed cleanly by CLI for create/start/status/validate.

## Scoring Rubric
For priority and estimation bands, see: `.kodebase/docs/specs/artifacts/README.md`.

## Milestones and Proposed Issues

### M1 – Core Types and Schemas
Deliverables: v1 constants, triggers, event/actor/relationships/metadata schemas, artifact schemas.
Acceptance: Schemas validate examples; event record aligns with spec; triggers include parent_completed/parent_archived/manual_cancel.
Issues:
- Define constants and triggers for v1 (states, priorities, estimation, triggers incl. parent_completed, parent_archived, manual_cancel).
- Implement actor schema (human + agent patterns) and eventMetadataSchema (required trigger, ISO timestamp).
- Implement relationships and artifactMetadata schemas (no fan‑out fields).
- Implement initiative/milestone/issue schemas; flexible acceptance_criteria structure.
- Add schema tests and golden fixtures.

### M2 – Parser and Validator
Deliverables: YAML → typed parser; artifact validator with type detection and formatted errors.
Acceptance: Clear errors on invalid YAML; correct type detection; error-formatter messages are actionable.
Issues:
- Implement ArtifactParser (parseYaml, parseInitiative/Milestone/Issue) with Zod error formatting.
- Implement ArtifactValidator (validate by detection; typed validateX methods).
- Implement error formatter with path tips; unit tests for common failures.

### M3 – Readiness and Constraints
Deliverables: Readiness engine per type; sibling‑only + same‑parent constraints; cycle and cross‑level checks.
Acceptance: Invalid deps rejected with clear codes; cycle detection and cross‑level errors covered by tests.
Issues:
- Implement sibling‑only dependency rules (initiative↔initiative, milestone↔sibling milestone, issue↔sibling issue).
- Enforce same‑parent constraints for milestones/issues using ID prefix comparison.
- Implement cycle detection over relationships.blocked_by.
- Implement cross‑level detection (and same‑parent enforcement) with tests and fixtures.

### M4 – State Machine and Events
Deliverables: Transition legality per type; chronology checks; event builder with required trigger.
Acceptance: Invalid transitions rejected; first event must be draft; builder refuses missing trigger; tests green.
Issues:
- Implement canTransition/getValidTransitions; validateEventOrder for chronology.
- Require explicit trigger in EventBuilder; add createDraftEvent/createReadyEvent helpers.
- Unit tests for valid/invalid sequences per type.

### M5 – Cascade Engine (Upward Only)
Deliverables: Parent in_progress on first child start; parent in_review when all children complete; cascade event factory.
Acceptance: Deterministic recommendations from child states; tested on small trees.
Issues:
- Implement shouldCascadeToParent(children, parentState?).
- Implement generateCascadeEvent(newState, triggerEvent, cascadeType), including parent_completed/parent_archived triggers where relevant.
- Tests for issue→milestone and milestone→initiative scenarios.

### M6 – Loader and File IO
Deliverables: Slug‑tolerant ID extraction; recursive discovery; stable YAML write.
Acceptance: Correct ID extraction for `A.yml`, `A.1.yml`, `A.1.1.<slug>.yml`; handles thousands via recursion; tests.
Issues:
- Update ID extraction regex to `^([A-Z](?:\.\d+)*)(?:\..+)?\.yml$`.
- Implement loadAllArtifactPaths, loadArtifactsByType, getArtifactIdFromPath with slug support.
- Implement ArtifactFileService read/write with stable formatting; unit tests.

### M7 – Wizard Support Helpers (Enablers)
Deliverables: Layout, ID allocation, scaffolding, runtime gating.
Acceptance: CLI can call helpers to scaffold A/A.1/A.1.1 and compute ready/blocked; gating prevents start when ancestors block/cancel.
Issues:
- implement ensureArtifactsLayout(baseDir) and resolveArtifactPaths({ id, slug, baseDir }).
- implement detectContextLevel(targetPath|cwd) and allocateNextId(parentId, type, loader).
- implement scaffoldInitiative/Milestone/Issue with initial draft event (artifact_created).
- implement isAncestorBlockedOrCancelled(artifactId, loader) for `--check-parent`.
- Unit tests and small example flows.

### M8 – Public API, Docs, Packaging
Deliverables: Public exports, README/module docs, spec alignment, tree‑shakable build.
Acceptance: CLI consumes stable surface; docs match exports; types emit cleanly.
Issues:
- Curate index.ts exports; remove non‑MVP surfaces (IDs/correlation, batch/cleanup, metrics, query).
- Update README and core-package-spec crosslinks.
- Smoke tests for ESM exports; d.ts sanity.

### M9 – Testing and Fixtures
Deliverables: Golden fixtures, integration tests across flows; example artifact trees.
Acceptance: Run `pnpm test` at repo root; all suites pass; coverage on core modules.
Issues:
- Create sample artifacts tree (A, A.1, A.1.1…A.1.n with deps) for tests.
- Integration tests for create→validate, start→cascade, complete→cascade.
- Add CI tasks via existing turbo pipeline.

## Sequencing and Gates
- Gate 1: M1+M2 green → schemas+parser+validator stable.
- Gate 2: M3+M4 green → rules and transitions stable.
- Gate 3: M5+M6 green → cascades and discovery stable.
- Gate 4: M7+M8+M9 green → CLI integration-ready.

## Risks and Mitigations
- Scope creep on wizard: Keep helpers minimal; UX deferred.
- Sharding/scale: Defer; loader recursion and O(siblings) checks suffice for MVP.
- Backward compatibility: No v2 compatibility; provide migration later.

## Operational Notes
- Use Changesets for any code change; add changesets per milestone deliverable.
- Use Biome for format/lint and Vitest for tests; ensure jsdom/node env overrides where needed.
- Remote cache via Turborepo; authenticate to share cache.

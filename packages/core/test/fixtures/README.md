## Fixture Library

This directory contains the golden fixtures used by the parser and validator test suites.

- YAML files capture canonical artifact payloads (valid and invalid).
- JSON files record the expected data structures or error payloads produced by the parser/validator.

### Layout

```
artifacts/
  initiative.valid.yaml          # Valid initiative input
  initiative.valid.json          # Parsed output snapshot
  issue.invalid.missing-...yaml  # Invalid example
  issue.invalid...error.json     # Expected error payload
dependencies/
  valid-siblings.json            # Graph of sibling-only dependencies
  invalid-cross-level.json       # Graph illustrating cross-level violations
loader-tree/
  A.cascade-initiative/          # Initiative folder with slug
    A.yml                        # Initiative artifact
    A.1.development-phase/       # Milestone folder with slug
      A.1.yml                    # Milestone artifact
      A.1.1.backend-api.yml      # Issue (in_progress, blocked by A.1.2)
      A.1.2.database-schema.yml  # Issue (completed, blocks A.1.1)
      A.1.3.frontend-integration.yml  # Issue (ready, blocked by A.1.1, blocks A.1.4)
      A.1.4.end-to-end-tests.yml # Issue (blocked, blocked by A.1.3)
    A.2.operations-phase/        # Independent milestone (parallel work)
      A.2.yml                    # Milestone artifact
      A.2.1.documentation.yml    # Issue (in_progress, no dependencies)
      A.2.2.deployment.yml       # Issue (ready, no dependencies)
  B.loader-enhancements/         # Second initiative
    B.yml                        # Initiative artifact
    B.1.loader-enhancements/     # Milestone folder
      B.1.yml                    # Milestone artifact (in_review)
      B.1.1.maintenance.yml      # Issue (in_review)
```

### Fixture Structure Conventions

The `loader-tree` mimics the real artifact folder structure:
- Initiative folders: `{ID}.{slug}/` (e.g., `A.cascade-initiative/`)
- Initiative artifacts: `{ID}.yml` (e.g., `A.yml`)
- Milestone folders: `{ID}.{slug}/` (e.g., `A.1.development-phase/`)
- Milestone artifacts: `{ID}.yml` (e.g., `A.1.yml`)
- Issue artifacts: `{ID}.{slug}.yml` (e.g., `A.1.1.backend-api.yml`)

### Dependency Patterns in loader-tree

The `loader-tree` fixtures demonstrate various dependency scenarios with realistic lifecycle events:

**Dependency Chain (A.1.X):**
- A.1.2 (completed) → A.1.1 (in_progress) → A.1.3 (blocked) → A.1.4 (blocked)
- A.1.2: draft → ready → in_progress → in_review → completed
- A.1.1: draft → blocked (with metadata.blocking_dependencies) → ready (via dependency_completed) → in_progress
- A.1.3: draft → blocked (with metadata.blocking_dependencies, still blocked by in_progress A.1.1)
- A.1.4: draft → blocked (with metadata.blocking_dependencies, blocked by blocked A.1.3)
- Demonstrates proper `has_dependencies` trigger and metadata.blocking_dependencies tracking

**Independent Set (A.2.X):**
- A.2.1 (in_progress) and A.2.2 (ready) have no dependencies between them
- Can be worked on in parallel
- Tests milestone boundary separation
- Milestone state (in_progress) matches children states

**Milestone State Consistency:**
- A.1 milestone is in_progress (has children in various states)
- A.2 milestone is in_progress (child A.2.1 started)
- B.1 milestone is in_review (child B.1.1 in_review)
- Milestones transition when children transition

**Cross-Initiative Independence:**
- A.1 and A.2 are independent milestones under initiative A
- No cross-milestone dependencies (enforces sibling-only rule)
- B initiative is completely independent from A

### Event System Compliance

All fixtures follow the event system spec (see `.kodebase/docs/specs/event-system-architecture/the-event-system.md`):

**Correct Triggers:**
- `artifact_created` - draft state creation by human
- `dependencies_met` - ready state (no blockers) by CLI
- `has_dependencies` - blocked state by CLI
- `dependency_completed` - unblocking via cascade
- `branch_created` - in_progress state by git hook
- `pr_ready` - in_review state by CLI
- `pr_merged` - completed state by CI/automation
- `children_started` - parent cascade (first child started)
- `children_completed` - parent cascade (all children done)

**Proper Actor Attribution:**
- Human: `Miguel Carvalho (m@kodebase.ai)`
- CLI: `Kodebase CLI (cli@v1.0.0)`
- Git Hook: `Git Hook (hook@post-checkout)`
- Automation: `GitHub Action (action@pr-merge)`
- Cascade: `System Cascade (cascade@completion)`

**Blocked Event Metadata:**
All `blocked` events include `metadata.blocking_dependencies`:
```yaml
metadata:
  blocking_dependencies:
    - artifact_id: A.1.2
      resolved: true
      resolved_at: "2025-10-21T16:45:00Z"
```

**Completion Details:**
Completed artifacts include completion fields per artifact spec:
- Issues: `implementation_notes` with `result` (required), optional `tags`, `challenges`, `insights`
- Milestones: `delivery_summary` with `outcome`, `delivered`, `next` (required), optional `deviations`, `risks`
- Initiatives: `impact_summary` with `outcome`, `benefits`, `next` (required), optional `evidence`

Example (A.1.2 completed issue):
```yaml
implementation_notes:
  result: "Schema implemented with normalized tables, composite indexes, and migration scripts"
  challenges:
    - challenge: "Query performance degradation with large datasets"
      solution: "Added composite indexes on frequently queried column combinations"
  insights:
    - "Using partial indexes for status columns reduced index size by 40%"
  tags: [database, postgresql, migrations, indexing, schema-design]
```

### Updating fixtures

1. Modify the YAML (and refresh the JSON snapshot if the parsed shape changes).
2. Run `pnpm --filter @kodebase/core test` to ensure the new fixtures are exercised.
3. Commit both YAML and JSON updates so goldens stay in sync with the parser/validator behaviour.

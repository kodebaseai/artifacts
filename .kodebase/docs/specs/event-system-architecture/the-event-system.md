# Event System Specification – v3

> **Status:** Draft
> **Audience:** Core engineers, CLI maintainers, tooling integrators

---

## 1. Scope & Non-Goals
### 1.1 Scope
* Define **states**, **events**, **flows**, and **constraints** governing artifact lifecycles.
* Specify triggers and actor attribution patterns.
* Establish non-functional requirements (performance, debuggability, auditability).

### 1.2 Out of Scope
* TypeScript implementation details.
* Storage engine internals (file vs DB).
* UI/CLI command semantics (see `the-cli-overhaul.md`).

---

## 2. Artifact Hierarchy & Dependency Rules
The path encodes both the **artifact ID** and a human-readable slug:

1. **Initiative** ⟶ folder `.kodebase/artifacts/A.<initiative-slug>/`
2. **Milestone**  ⟶ folder `.kodebase/artifacts/A.<initiative-slug>/A.1.<milestone-slug>/`
3. **Issue**      ⟶ file   `.kodebase/artifacts/A.<initiative-slug>/A.1.<milestone-slug>/A.1.1.<issue-slug>.yml`

Example using real data:
```
.kodebase/artifacts/
  A.methodology-foundation/
    A.yml (initiative artifact - no internal title; folder slug is descriptive)
    A.1.complete-methodology-documentation/
      A.1.yml (milestone artifact – no internal title; folder slug is descriptive)
      A.1.1.create-agentic-documentation-suite.yml   # issue artifact (includes title in filename)
```

**Dependency Constraint:**
```
initiative  ⇄  initiative      (root level)
milestone   ⇄  sibling milestone (same initiative)
issue       ⇄  sibling issue     (same milestone)
```
No cross-level dependencies; prevents cycles by design.

---

## 3. State Machine
|---------------|---------------------------------------------------|
| Key           | Description                                       |
|---------------|---------------------------------------------------|
| `draft`       | Planning phase – allowed only on feature branches |
| `ready`       | Ready to start work                               |
| `blocked`     | Waiting on sibling dependencies                   |
| `in_progress` | Active development                                |
| `in_review`   | Under human review                                |
| `completed`   | Work done – terminal                              |
| `cancelled`   | Abandoned – terminal for issues, may re-draft     |
| `archived`    | Historical, immutable                             |
|---------------|---------------------------------------------------|

**Inheritance:** `blocked`, `cancelled`, `archived` propagate *down* automatically; children don’t store extra events.

---

## 4. Event Record Schema
Field        | Req | Example                         | Notes
------------ | --- | ------------------------------- | -------------------------------
`event`      | ✅  | `in_progress`                   | One of the state keywords above
`timestamp`  | ✅  | `2025-08-01T10:00:00Z`          | ISO-8601 UTC
`actor`      | ✅  | `Git Hook (hook@post-checkout)` | `Name (identifier)`
`trigger`    | ⬜  | `branch_created`                | Explains *why*
`metadata`   | ⬜  | `{ pr: 95 }`                    | Free-form JSON/YAML

No IDs, no correlation graphs – chronological order alone is authoritative.

---

## 5. Lifecycle Flows

| # | Flow | Initiating Command / Event | Key Rules (concise) | Resulting Events |
|---|------|----------------------------|--------------------|------------------|
| 1 | **Creation** | `kodebase create` (+ `--submit` on merge) | • All new artifacts start as `draft`.<br>• Wizard enforces sibling-only dependencies & minimum content.<br>• Validation runs only on newly created files.<br>• When merged to `main`, each artifact ends in **`ready`** or **`blocked`** based on declared dependencies. | `draft` → `ready` or `blocked` |
| 2 | **Progress Cascade** | `kodebase start` | • Only Issues can be started.<br>• Issue must be `ready`; parent Milestone/Initiative must be `ready` or `in_progress`.<br>• *First* Issue started in a Milestone flips the Milestone to `in_progress` (same for Milestone → Initiative). | `in_progress` on child, then on first-time parent(s) via `children_started` trigger |
| 3 | **Completion Cascade** | `kodebase start --submit` (Issue PR merged) | • Issue PR merge adds `completed` on Issue.<br>• If it’s the last Issue of a Milestone, Milestone moves to `in_review`.<br>• If that Milestone is the last of its Initiative, Initiative moves to `in_review`. | `completed` (Issue) → `in_review` (Milestone / Initiative) via `children_completed` |
| 4 | **Dependency Resolution** | Merge of blocking Issue PR | • `blocked` events live *only* on the dependent Issue and list siblings in `metadata.blocking_dependencies`.<br>• On completion of a blocker, its dependents update that list (`resolved: true`, `resolved_at`).<br>• When all entries resolved, dependent receives a new `ready` event. | metadata update on `blocked` event; optional new `ready` event |
| 5 | **Cancel** | `kodebase cancel` | • CLI shows dependency impact report.<br>• Cancelling Milestone cascades `cancelled` to all its Issues; cancelling Initiative cascades to Milestones & Issues.<br>• User decides whether dependents move to `ready` or `cancelled`. | `cancelled` events; possible follow-up `ready` events on dependents |


---

## 6. Trigger Catalogue
Type | Trigger | Emitted By | Typical Flow
---- | -------- | ---------- | ------------
Manual | `artifact_created` | `create` command | Creation
Manual | `dependencies_met` | `create --submit` | Creation (ready without blockers)
Manual | `has_dependencies` | `create --submit` | Creation (blocked by siblings)
Manual | `branch_created` | Git post-checkout hook / `start` | Progress
Manual | `pr_ready` | `start --submit` | Completion (Issue → PR ready)
Manual | `pr_merged` | merge hook | Completion (Issue PR merge)
Manual | `manual_cancel` | `cancel` command | Cancel
Cascade | `children_started` | Event engine | Progress cascade (first child started → parent in_progress)
Cascade | `children_completed` | Event engine | Completion cascade (all children done → parent review/completion)
Cascade | `dependency_completed` | Event engine | Dependency resolution (blocker done)
Cascade | `parent_completed` | Event engine | Downstream archival/cascade
Cascade | `parent_archived` | Event engine | Downstream archival/cascade
Validation | `constraint_violation` | `validate` command | Validation flow

*Only listed triggers are valid; legacy v2 triggers are removed.*

## 7. Actor Attribution
Pattern | Example | Type
------- | ------- | ----
Human | `Jane Smith (jane@example.com)` | human
AI Agent | `Claude (agent.claude.session123@acme.kodebase.ai)` | ai_agent
CLI | `Kodebase CLI (cli@v1.0.0)` | automation
Git Hook | `Git Hook (hook@post-checkout)` | automation
CI Runner | `CI Runner (ci.github@job-42)` | automation
Cascade Engine | `System Cascade (cascade@completion)` | automation

Every event’s `actor` field **must** follow these patterns.

---

## 8. Constraints & Invariants
1. Events are immutable once appended; **only `metadata` may be updated** (e.g., marking `resolved_at`).
2. Events must be strictly chronological within each artifact file.
3. State transitions must follow the table in §3.
4. Parent cannot reach `completed` if any child is not `completed` or `cancelled`.
5. A child cannot start unless it is `ready` *and* parent is `ready` (first child) or `in_progress`.
6. `blocked` events may reference **only** IDs listed in `metadata.relationships.blocked_by` and those IDs must be siblings.
7. No artifact may depend on a non-sibling (validated at creation and by `validate`).

---

## 9. Performance / Complexity Targets
* Dependency check: O(siblings)
* Cascade bubble: O(tree-depth)
* Target: ≤100 ms per state-change for projects up to 1 000 artifacts.

---

## 10. Illustrative Examples
The snippets below show a **single Issue** moving through every state from `draft` to `archived`. Each event keeps only the five canonical fields.

```yaml
# creation branch → add-D.2.7
metadata:
  id: D.2.7
  relationships:
    blocked_by: []
    blocks: []
  events:
    - event: draft # event create with `kodebase create`
      timestamp: "2025-08-01T09:00:00Z"
      actor: "Jane Smith (jane@example.com)"
      trigger: artifact_created
    - event: ready # validated & merged to main via `kodebase create --submit`
      timestamp: "2025-08-01T09:10:00Z"
      actor: "Kodebase CLI (cli@v1.2.0)"
      trigger: dependencies_met
   - event: in_progress # `kodebase start`
      timestamp: "2025-08-01T09:30:00Z"
      actor: "Git Hook (hook@post-checkout)"
      trigger: branch_created
   - event: in_review # validated and PR created via `kodebase start --submit`
      timestamp: "2025-08-02T14:00:00Z"
      actor: "Kodebase CLI (cli@v1.2.0)"
      trigger: pr_ready
   - event: completed # PR merged -> post-merge hook
      timestamp: "2025-08-03T10:15:00Z"
      actor: "GitHub Action (action@pr-merge)"
      trigger: pr_merged
```

```yaml
# creation branch → add-D.2.7
metadata:
  id: D.2.7
  relationships:
    blocked_by: []
    blocks: []
  events:
    - event: draft # event create with `kodebase create`
      timestamp: "2025-08-01T09:00:00Z"
      actor: "Jane Smith (jane@example.com)"
      trigger: artifact_created
    - event: blocked # validated & merged to main via `kodebase create --submit`
      timestamp: "2025-08-01T09:05:00Z"
      actor: "Kodebase CLI (cli@v1.2.0)"
      trigger: has_dependencies
      metadata:
         blocking_dependencies:
            - { artifact_id: "D.2.5", resolved: true, resolved_at: "2025-08-03T10:15:00Z" }
            - { artifact_id: "D.2.6", resolved: false }
   - event: cancelled # `kodebase cancel`, of from parent milestone/initiative cancelation flow
      timestamp: "2025-09-03T10:45:00Z"
      actor: "Bob PM (bob@example.com)"
      trigger: manual_cancel
      metadata:
         reason: "Scope cut – feature no longer needed"
   - event: archived # parent Milestone completes months later → archive cascade
      timestamp: "2026-01-15T00:00:00Z"
      actor: "System Cascade (cascade@initiative-archival)"
      trigger: parent_completed
```
---

## 11. Migration Considerations (informative)
* A one-off script converts v2 YAML to the v3 schema (drops correlation IDs, renames fields, validates state chronology).
* Sibling-only dependency violations are listed and must be resolved manually or via `kodebase validate --fix`.
* Existing branch names remain valid; hooks will re-emit events in v3 format on the next action.

---

## 12. Open Issues / Future Work
* Webhook mapping for non-Git providers (Bitbucket, Azure DevOps).
* Automated merge-queue integration to enforce parent completion.

*(End of normative content)*

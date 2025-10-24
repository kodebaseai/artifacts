# Event System Architecture v3 – Planning

> Living document for organising the v3 proposal before we freeze the final specification documents.

---

## 1 Purpose of this planning file
1. Capture everything we **must** clarify before drafting the formal specs.
2. Track unresolved questions / decisions.
3. Hold the working outline for each spec document.
4. Provide a single checklist that gates spec completion.

---

## 2 Objectives
- **Reduce complexity** of the current event system by enforcing hierarchical-only dependencies.
- **Split the spec** into two independent concerns:
  1. **The Event System** (behaviour & rules).
  2. **The CLI Interface** (how humans/automation interact with the system).
- **Stay requirements-level** – no implementation internals in the public spec.

---

## 3 Deliverables
| Doc | Purpose |
|-----|---------|
| `overview.md` | Intro & context – what problem we solve, why the change, high-level approach. |
| `the-event-system.md` | Normative definition of states, events, flows, constraints, triggers, actors, & non-functional requirements. |
| `the-cli-overhaul.md` | Command-level contract: flags, side-effects, hook integration, success criteria. |

Optional (internal):
* Implementation design / reference code lives **outside** these three public specs.

---

## 4 High-level Outline (draft)

### 4.1 `overview.md`
1. Problem Statement & Motivation
2. Goals, Non-Goals, Success Metrics
3. Guiding Principles (hierarchical constraint, inheritance > cascades, git-first automation, etc.)
4. Summary of Changes (from v2 → v3)
5. Document Map (where to find details)

### 4.2 `the-event-system.md`
1. Scope & Terminology
2. Artifact Hierarchy & Dependency Rules
3. State Machine (8 states) + inheritance rationale
4. Event Record (5-field schema)
5. Five Essential Flows (creation, progress cascade, completion cascade, dependency-resolution, cancel)
   • For each: purpose, pre-conditions, post-conditions, invariants
6. Trigger Catalogue (manual, cascade, validation)
7. Actor Attribution Patterns
8. Constraints & Invariants (chronology, legality, idempotency, etc.)
9. Performance / Complexity expectations (qualitative, not benchmarks)
10. Migration Requirements (inputs to migration plan)
11. Open Issues / TBD

### 4.3 `the-cli-overhaul.md`
1. Scope & Responsibilities
2. Design Principles (CLI as thin contract layer, git-hook driven, idempotent commands)
3. Command Catalogue (overview table)
   • `create`, `start`, `status`, `complete`, `cancel`, `validate`, `setup`, `tutorial`
4. Command Specifications
   • Arguments & flags
   • Preconditions / validations
   • Side-effects (events emitted, files touched, git ops)
   • Exit codes & expected output
5. Git Integration & Hooks (branch naming, post-checkout, PR workflows)
6. Usage Examples & UX guidelines
7. Non-Goals / Out of Scope (implementation, UI wizard details, etc.)
8. Open Questions / TBD

---

## 5 Historical Questions (resolved)
1. Do we require any backwards compatibility for existing v2 event fields? **Assumed NO**, confirm.
  A: We don't need compatibility
2. Minimum viable set of CLI commands for first release? (`create`, `status`, `complete`, `validate`?)
  A: We are not creating those from scratch. We should look at the current implementation and adapt it to support the new proposal
3. How do we expose *parent blocking* vs *own stored* state in CLI outputs?
    **Final decision:** We *do not* calculate or surface an automatic "effective" state.
  Rules:
  a. Only *direct* sibling blocking events are written to disk (e.g. Milestone `A.1` blocks `A.2` → `blocked` event lives **only** in `A.2`).
  b. Parent/ancestor blocking states are *not* mirrored into children.  Developers (human or agentic) must inspect the hierarchy to understand why a child cannot start.
  c. Tooling support:
    • `kodebase start <id>` and `get-issue-context.sh` will look up the parent chain and abort / warn if any ancestor is blocked or cancelled.
    • `kodebase status` will show the stored state only, but provide an option `--check-parent` that performs the same lookup and prints a warning banner if a parent is blocking.
  d: Benefits:
    • Zero fan-out file edits when a parent changes state.
    • Keeps event logs minimal.
    • Visibility handled by lightweight runtime checks instead of persistent data.
Open work: define exact warning text & non-zero exit codes for `kodebase start` when parent is blocking.
4. Migration sequencing – will we ship CLI v3 before or together with engine v3?
  A (plan): The **spec** itself is delivered first (as part of Initiative `I.pr-based-artifact-lifecycle`). Implementation tickets (milestones & issues) will be created *after* spec lock. Engine v3 and CLI v3 will ship **together** because the CLI relies on the new event schema.
5. Are we keeping `draft` state only on feature branches (never on `main`)? Confirm behavioural rule.
  A: YES!
6. Actor attribution for CI systems other than GitHub/GitLab? Provide generic pattern.
  A (draft pattern):
  • **Human** – `Name (email)`
  • **AI Agent** – `Model-Name (agent.<model>.<session>@<tenant>.kodebase.ai)`
  • **CLI** – `Kodebase CLI (cli@vX.Y.Z)`
  • **Git Hook** – `Git Hook (hook@<hook-name>)`
  • **CI Runner** – `CI Runner (ci.<provider>@<job-id>)`
  • **Cascade Engine** – `System Cascade (cascade@<type>)`
  We can extend this table in `the-event-system.md` under “Actor Attribution Patterns”.

---

## 6 Checklist – *all complete*
- [x] Agree on open questions above
- [x] Finalise outlines (sections + headings)
- [x] Flesh out `overview.md` initial draft
- [x] Draft `the-event-system.md` (normative)
- [x] Draft `the-cli-overhaul.md` (command contracts)
- [x] Review pass for completeness & redundancy
- [x] Stakeholder approval
- [x] **Spec set v3 locked**

---

## 7 Next Steps
1. Bootstrap Initiative **I.artifact-lifecycle-system-v3**.
2. Break into Milestones:
   • M1 – Event Engine & schema migration
   • M2 – CLI adaptations (commands & hooks)
   • M3 – Validation/auto-fix tooling
   • M4 – Roll-out & docs
3. Generate Issue skeletons from each Milestone.
4. Kick off M1 spike branch.

# Kodebase Event System – v3 Overview

> “Less surface, more certainty.”
> A hierarchy-first model that replaces the flexible-but-fragile v2 graph.

---

## 1 Why v3?
**Problem**: Arbitrary dependency graph
**Impact**: Hard-to-debug correlation chains, cycles, and global traversals.

**Problem**: Large event objects (`event_id`, `parent_event_id`, …)
**Impact**: Bloated YAML; tooling burden

**Problem**: Nine cascade flows
**Impact**: Complex race conditions; slow O(n²) checks.

---

## 2 Key Design Changes
1. **Hierarchy Constraint** – Dependencies only between peers at the same level:
   Initiative ⇄ Initiative, Milestone ⇄ sibling Milestone, Issue ⇄ sibling Issue.
2. **State Inheritance, not Fan-out** – Parent `blocked` / `cancelled` states are calculated at runtime. Files never change when an ancestor flips state.
3. **Slim Event Record** – `event, timestamp, actor, trigger, metadata` (no IDs, no graphs).
4. **Five Essential Flows** – Creation · Progress Cascade · Completion Cascade · Dependency Resolution · Cancel. Nothing more.
5. **Git-First Automation** – Branch name == Artifact ID. Post-checkout hook emits `in_progress`; PR merge emits `completed` and cascades.

---

## 3 What Ships in v3

**In Scope**
Schema & lifecycle rules
CLI contract (`create`, `start`, `status`, `complete`, `validate`, `setup`, `tutorial`)
Git hook reference impl
Migration script v2 → v3

**Out of Scope**
Cross-initiative graphs
UI mock-ups, implementation code
Merge-queue, non-Git providers
Production rollout playbook

---

## 4 Artifact Layout (stable)
```
.kodebase/artifacts/
  A.methodology-foundation/                 # Initiative folder (slug = title)
    A.yml                                   # Initiative YAML
    A.1.complete-methodology-documentation/ # Milestone folder
      A.1.yml                               # Milestone YAML
      A.1.1.create-agentic-documentation-suite.yml
```
IDs never change; slugs are for humans.

---

## 5 Success Metrics
Metric                         | Target
------------------------------ | ----------------------------------------------------
Avg. event payload size        | ↓ 70 %
Dependency validation          | O(siblings) (was O(n²))
Cascade processing (≤5 levels) | ≤ 100 ms
Developer survey               | ≥ 80 % say “it’s obvious why an artifact is blocked”.

---

## 6 Reading Map
Doc                   | Purpose
--------------------- | ------------------------------------------------------
`the-event-system.md` | Normative rules: states, events, flows, constraints.
`the-cli-overhaul.md` | Command contract & flag semantics.
`planning.md`         | Work-in-progress tracker (to be removed at spec lock).

---

*(End of overview)*

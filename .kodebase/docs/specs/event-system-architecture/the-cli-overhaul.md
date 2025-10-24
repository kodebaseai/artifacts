# CLI Overhaul – Contract for Event System v3

> **Status:** Draft

---

## 1. Scope
* Define **public surface** of the Kodebase CLI as it relates to the new event engine.
* Specify required git-hook integration points.
* UX & automation guidelines; implementation detail is out-of-scope.

---

## 2. Guiding Principles
1. *Single–responsibility commands* (Unix philosophy).
2. *Idempotent* – rerunning a command in the same context never corrupts state.
3. *Git-first workflow* – branch & PR lifecycle drive most state changes automatically.
4. *Human-readable output* with optional `--json` for machines.

---

## 3. Command Catalogue

### 3.1 Current Commands Catalogue

| Command | Current Purpose | Planned Action in v3 |
|---------|-----------------|----------------------|
| `kodebase create` | One-shot or wizard to generate Initiative / Milestone / Issue (`draft`) | **Keep** – update to output v3 event schema; auto-sets `draft` events only. |
| `kodebase ready` | Promote `draft` artifact to `ready` | **Deprecate** – functionality folded into `create` wizard or replaced by auto-validation. Edge-case flag may remain. |
| `kodebase start` | Validate `ready` artifact & create/checkout branch → hook flips to `in_progress` | **Keep** – add parent-blocking check; emit warning/abort if ancestor blocked/cancelled. |
| `kodebase pr` | Create / update GitHub draft PR & mark `--ready` | **Deprecate** – PR creation/updating moves to `create --submit` and `start --submit`; logic kept internal to hooks. |
| `kodebase status` | Pretty/JSON display of artifact metadata, timeline, relationships | **Keep** – add `--check-parent` flag to surface ancestor blocking. |
| `kodebase list` | Recursive filtered listing of artifacts | **Re-evaluate** – may merge into enhanced `status` with `--all`/filter flags; keep stub for now. |
| `kodebase setup` | First-run wizard (git identity, shell completion) | **Keep** – unchanged. |
| `kodebase tutorial` | Interactive onboarding sandbox | **Keep** – unchanged. |

### 3.2 Target Command Catalogue (v3)
| Command             | Purpose (incl. key flags)                                                                           | Primary State Effect |
| ------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- |
| `kodebase create`   | Wizard/one-shot add artifacts.  Flags: `--continue`, `--submit` (validate & open PR for new artifacts), `--abort`. | `(new) → draft → ready/blocked` |
| `kodebase start`    | Begin work on a *ready* Issue. Flags: `--submit` (validate & open PR for review after push).        | `ready → in_progress` |
| `kodebase status`   | Show artifact(s) info. Flags: `--json`, `--check-parent`, `--all`, filters; replaces standalone `list`. | *read-only* |
| `kodebase complete` | Trigger completion flow for Milestone/Initiative (intelligence report, celebration).                | `in_review → completed / archived` |
| `kodebase cancel`   | Cancel an active artifact (Issue, Milestone, or Initiative). Flags: `--reason`, `--force`, `--dry-run`. | `<state> → cancelled / archived` |
| `kodebase validate` | Run constraint checks, optionally `--fix`.                                                          | *read-only / writes fixes* |
| `kodebase setup`    | First-run configuration wizard.                                                                     | n/a |
| `kodebase tutorial` | Interactive sandbox onboarding.                                                                     | n/a |

`ready` command is deprecated (folded into `create`). Existing `pr` command is internal to hooks; users call `--submit` flags instead.

---

## 4. Command Specifications (normative)

### 4.1 `create`
* **Synopsis:** `kodebase create [<parent-id>] [--continue|--submit|--abort]`
* **Flags:**
  * `--continue` – resume existing add-* branch session.
  * `--submit` – finalise artifacts, ensure ready/blocked, open draft PR.
  * `--abort` – delete artifacts & branch.
* **Preconditions:**
  * Must run on a clean working tree.
  * Parent context: If `<parent-id>` is omitted, a **new Initiative** is created. If provided, the parent artifact (Initiative or Milestone) must exist and be in `ready` state.
* **Side-effects:**
  * Creates or resumes an `add-<slug>` working branch (wizard session).
  * Interactive wizard prompts for minimal fields (title/slug, optional description).
  * **When parent is a Milestone** → generates a new Issue `X.Y.Z` where `Z = max(sibling-issues)+1`.
  * **When parent is an Initiative** → generates a new Milestone `X.Y+1` **and** its first Issue `X.Y+1.1`.
  * After each artifact, wizard asks whether to create another; `--continue` re-opens this loop on the same branch.
  * All new artifacts start in `draft` state; dependency lists are empty.
  * Nothing is pushed unless `--submit` is provided (validates & opens draft PR).
* **Exit codes:** 0 success, 1 validation error, 2 aborted.

---

### 4.2 `start`
* **Synopsis:** `kodebase start <artifact-id> [--submit]`
* **Flags:**
  * `--submit` – after committing & pushing, validate branch, open/refresh PR, mark Issue `in_review`.
* **Preconditions:**
  * Artifact exists, type **Issue**, latest state `ready`.
  * No ancestor Milestone/Initiative is `blocked` or `cancelled`.
  * `metadata.relationships.blocked_by` list is empty **or** all listed artifacts are in `completed`/`cancelled`.
* **Side-effects:**
  * Creates & checks out feature branch named `<artifact-id>`.
  * Emits `in_progress` event via post-checkout hook.
  * With `--submit`: pushes branch, creates/updates PR (draft by default), emits `in_review`.
* **Exit codes:** 0 success, 1 validation error, 2 git error.

---

### 4.3 `status`
* **Synopsis:** `kodebase status <artifact-id|--all> [--json] [--check-parent] [filters]`
* **Flags:**
  * `--json` – raw JSON output.
  * `--all` – list all artifacts (supersedes old `list` command). Optional filters: `--type`, `--status`, `--assignee`.
  * `--check-parent` – warn & non-zero exit if any ancestor is `blocked`/`cancelled`.
* **Preconditions:** none (read-only).
* **Side-effects:** none.
* **Exit codes:** 0 success, 1 artifact not found, 2 parent blocked (with `--check-parent`).

---

### 4.4 `complete`
* **Synopsis:** `kodebase complete <artifact-id> [--force] [--dry-run]`
* **Flags:**
  * `--force` – bypass non-critical warnings (e.g., missing celebration checklist).
  * `--dry-run` – print what would change without writing files.
* **Preconditions:**
  * Artifact type **Milestone** or **Initiative**, current state `in_review`.
* **Side-effects:**
  * Runs intelligence/quality report pipeline.
  * Emits `completed` (or `archived` for Initiative) event and triggers cascades.
* **Exit codes:** 0 success, 1 validation error, 2 aborted.

---

### 4.5 `cancel`
* **Synopsis:** `kodebase cancel <artifact-id> [--reason <text>] [--force] [--dry-run]`
* **Flags:**
  * `--reason` – free-text explanation stored in event metadata.
  * `--force` – bypass warnings (e.g., open dependencies).
  * `--dry-run` – show planned changes without writing.
* **Preconditions:**
  * Artifact is not already `completed` or `cancelled`.
* **Side-effects:**
  * Emits `cancelled` event; triggers cascades to unblock siblings.
  * For Initiative: subsequent `archived` event when all children closed.
* **Exit codes:** 0 success, 1 validation error, 2 aborted.

---

### 4.6 `validate`
* **Synopsis:** `kodebase validate <artifact-id|--all> [--fix] [--strict]`
* **Flags:**
  * `--fix` – apply automatic fixes where safe.
  * `--strict` – exit 1 if any violation remains (CI mode).
* **Preconditions:** none.
* **Side-effects:**
  * Optionally writes fixes; no state transitions.
* **Exit codes:** 0 clean (or fixed), 1 violations (strict), 2 fix failed.

---

## 5. Git Hook Integration
Hook | When | CLI invocation | Resulting Event
---- | ---- | -------------- | ---------------
`post-checkout` | new branch is created | `kodebase start <branch>` | `in_progress` event
`post-merge` | PR merged into `main` | `kodebase complete <artifact>` | `completed` event + cascades

Webhooks (CI) should call `status`/`validate` for PR gates.

---

## 6. UX Examples
```bash
# Create new artifacts via wizard
$ kodebase create --wizard
$ kodebase create --submit      # validates & opens draft PR with new YAML

# Start work on Issue A.1.3
$ git checkout -b A.1.3         # post-checkout hook → in_progress

# Finish work and open PR for review
$ git commit -am "A.1.3: feat: add filter module"
$ git push -u origin A.1.3
$ kodebase start --submit       # validates, updates Issue → in_review, PR ready

# Merge PR – post-merge hook emits completed and cascades to milestone/initiative

# Complete Milestone after review & celebration
$ kodebase complete A.1         # emits completed on milestone, triggers intel report
```

---

## 7. Non-Goals
* The CLI does **not** expose internal Event Engine APIs.
* No UI wizard mock-ups here (reserved for design docs).

---



*(End of contract)*

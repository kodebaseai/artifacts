# Kodebase Events – Post‑Merge Automation Outline (v1)

Status: Draft
Audience: Infra/automation maintainers

## Goals
- Append events based on triggers automatically — developers never edit events manually.
- Keep developer workflow unchanged (branch → PR → merge) and respect protected branches.
- Ensure idempotent, auditable writes to `.kodebase/artifacts/**/*.yml`.

## Common Patterns
- Trigger source: `pull_request` with `types: [closed]` and `merged == true`.
- Default mode: direct commit to `main` by the bot (`contents: write`).
- Fallback (if org policy blocks bot writes): open an automation PR and auto‑merge when green.
- Idempotency: re‑read file, ensure event not already present, ensure non‑decreasing timestamps.
- Validation: run `pnpm kodebase:validate --strict` (or `pnpm turbo run validate`) on the changes.
- Scope: Only touch `.kodebase/artifacts/**` and only append events + minimal metadata.

## Workflow A — Creation PRs → ready/blocked
- Event: Add‑session branches `add/**` merged into `main`.
- Action: For each newly added artifact (draft‑only in PR):
  - Compute readiness via core validator (dependencies_met vs has_dependencies).
  - Append `ready` or `blocked` to the artifact on `main`.
  - Commit metadata:
    - actor: `Automation (hook@post-merge)`
    - trigger: `dependencies_met` or `has_dependencies`
    - timestamp: merge time
- Implementation outline (GitHub Actions YAML sketch):
  ```yaml
  name: Kodebase – Creation Events
  on:
    pull_request:
      types: [closed]
  jobs:
    creation:
      if: >-
        github.event.pull_request.merged == true &&
        startsWith(github.event.pull_request.head.ref, 'add/')
      permissions:
        contents: write
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with:
            fetch-depth: 0
        - name: Detect added artifacts
          run: node scripts/kodebase/find-new-artifacts.js "$GITHUB_EVENT_PATH"
        - name: Append ready/blocked
          run: node scripts/kodebase/append-ready-blocked.js
        - name: Validate
          run: pnpm run validate --strict
        - name: Commit (or open PR)
          run: node scripts/kodebase/commit-or-pr.js
  ```

## Workflow B — Issue PRs → completed + parent in_review cascade
- Event: Work branches named exactly `<issue-id>` merged into `main` (e.g., `A.2.7`).
- Action:
  - Append `completed` to the Issue.
  - If all active sibling issues are completed: append `in_review` to the parent Milestone.
  - If that was the last Milestone: append `in_review` to the Initiative.
  - Commit metadata:
    - actor: `Automation (hook@post-merge)`
    - trigger: `pr_merged` for issue completion; `children_completed` for cascades
- Implementation outline (YAML sketch):
  ```yaml
  name: Kodebase – Issue Completion
  on:
    pull_request:
      types: [closed]
  jobs:
    complete-issue:
      if: >-
        github.event.pull_request.merged == true &&
        startsWith(github.event.pull_request.head.ref, 'A.')
      permissions:
        contents: write
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with: { fetch-depth: 0 }
        - name: Resolve issue id from branch
          run: node scripts/kodebase/resolve-issue-id.js "$GITHUB_HEAD_REF"
        - name: Append completed and cascades
          run: node scripts/kodebase/append-completed-and-cascades.js
        - name: Validate
          run: pnpm run validate --strict
        - name: Commit (or open PR)
          run: node scripts/kodebase/commit-or-pr.js
  ```
  Note: Use a strict regex for issue‑id detection (e.g., `^[A-Z](?:\.\d+){2,}$`).

## Workflow C — Completion PRs → completed (Milestone/Initiative)
- Event: Completion branches `complete/**` merged into `main`.
- Action: Append `completed` to the target artifact. Keep completion content authored in the PR.
  - actor: `Automation (hook@post-merge)`
  - trigger: `pr_merged`
- Implementation outline (YAML sketch):
  ```yaml
  name: Kodebase – Artifact Completion
  on:
    pull_request:
      types: [closed]
  jobs:
    complete-artifact:
      if: >-
        github.event.pull_request.merged == true &&
        startsWith(github.event.pull_request.head.ref, 'complete/')
      permissions:
        contents: write
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with: { fetch-depth: 0 }
        - name: Resolve artifact id
          run: node scripts/kodebase/resolve-artifact-id.js "$GITHUB_HEAD_REF"
        - name: Append completed
          run: node scripts/kodebase/append-artifact-completed.js
        - name: Validate
          run: pnpm run validate --strict
        - name: Commit (or open PR)
          run: node scripts/kodebase/commit-or-pr.js
  ```

## Guardrails
- Concurrency: Use a mutex (GitHub environment or artifact‑based lock) or re‑read then retry on conflicts.
- Idempotency: Skip appending if the same event (by type+timestamp range) already exists.
- Chronology: Ensure timestamps are ≥ last event timestamp; default to PR merged_at.
- Scope: Refuse to run if changed files include non‑artifact paths (defense‑in‑depth).
- Audit: Commit messages reference PR/sha, e.g., `automation(events): PR #123 → completed: A.2.7; cascade in_review: A.2`.

## Future Enhancements
- Move from direct commit to automation PRs if org policy prohibits bot writes to `main`.
- Surface bot comments on PRs summarizing the planned events on merge.
- Aggregate metrics from derived PR signals (time in progress/review) without persisting branch‑side events.

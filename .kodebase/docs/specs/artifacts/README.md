# Artifacts Specification – Authoring and Conventions (v1)

Status: Draft
Audience: Contributors authoring Initiative, Milestone, and Issue artifacts

## Layout and IDs
- ID format
  - Initiative: `A`
  - Milestone: `A.1`
  - Issue: `A.1.1`
- Filesystem layout
  - `.kodebase/artifacts/A.<initiative-slug>/A.yml`
  - `.kodebase/artifacts/A.<initiative-slug>/A.1.<milestone-slug>/A.1.yml`
  - `.kodebase/artifacts/A.<initiative-slug>/A.1.<milestone-slug>/A.1.1.<issue-slug>.yml`
- IDs never change; slugs are human‑readable.

## Relationship Lists (flow style)
- Use flow style for relationship arrays to keep diffs tidy and consistent.
  - `blocks: [A.1.2, A.1.3]`
  - `blocked_by: [A.1.1]`
- Empty lists use `[]`.
- Do not quote IDs unless necessary — `A.1.2` is safe unquoted.

## Event Basics
- Event record fields: `event`, `timestamp` (ISO‑8601 UTC), `actor`, `trigger`, optional `metadata`.
- First event is always `draft`. `draft` must never land on `main` — PRs must contain `ready` or `blocked` before merge.
- Triggers commonly used: `artifact_created`, `dependencies_met`, `has_dependencies`, `branch_created`, `pr_ready`, `pr_merged`, `dependency_completed`, `children_started`, `children_completed`, `parent_completed`, `parent_archived`, `manual_cancel`.

### In‑Review Event Metadata
- For `in_review` events, capture the Pull Request number in metadata.
  - Required: `pr_number` (integer)
  - Optional: `pr_branch` (string), `pr_head_sha` (string)
- Do not store the PR URL; it can be derived as `https://github.com/<owner>/<repo>/pull/<pr_number>`.
- Example:
  
  - event: in_review
    timestamp: 2025-10-28T20:15:00Z
    actor: Miguel Carvalho (m@kodebase.ai)
    trigger: pr_ready
    metadata:
      pr_number: 16
      # pr_branch: A.1.2
      # pr_head_sha: 7b30b2e8ef6746d8e1a565d170d3c8f14624ece4

## Estimation and Priority Rubric
- Priority
  - critical: blocks MVP release
  - high: required for MVP but not an immediate gate today
  - medium: quality‑of‑life or next‑phase enabler
  - low: nice‑to‑have
- Estimation (active work)
  - Issues
    - XS: ≤ 1h; S: ≤ 2h; M: ≤ 8h; L: ≤ 16h; XL: > 16h
  - Milestones
    - XS: ≤ 8h; S: ≤ 24h; M: ≤ 64h; L: ≤ 128h; XL: > 128h
  - Initiatives
    - XS: ≤ 24h; S: ≤ 72h; M: ≤ 120h; L: ≤ 208h; XL: > 208h

## Branch Naming (authoring)
- Create sessions (adding artifacts via wizard):
  - Add a new Initiative: `add/<initiative-id>` (e.g., `add/A`).
  - Add issues for a Milestone: `add/<milestone-id>` (e.g., `add/A.1`) — create at least `A.1.1` in this session.
  - Add multiple Milestones (sequential): `add/<initiative-id>.<start>-<end>` (e.g., `add/A.1-4`) — create milestones A.1..A.4 with at least one issue in each.
  - Add a single Issue on a Milestone: `add/<issue-id>` (e.g., `add/A.1.5`).
- Work branches for implementing an Issue: exactly the artifact ID (e.g., `A.1.3`).
- Completion branches (human-authored completion info): `complete/<artifact-id>`
  - Examples: `complete/A.2` to complete Milestone A.2; `complete/A` to complete Initiative A.

## Developer Cheatsheet
- Your day-to-day flow stays the same: branch → PR → merge.
- Branch names
  - Work on an Issue: `<issue-id>` (e.g., `A.2.7`).
  - Add artifacts: `add/<context-id>` (e.g., `add/A.1`). Include only draft events in new YAML.
  - Complete Milestone/Initiative: `complete/<artifact-id>` (e.g., `complete/A.2`). Put completion content in the PR; no events.
- What you commit
  - Code as usual. Artifact YAML only when creating (`add/…`) or completing (`complete/…`).
  - Never edit events manually — automation appends them on merge based on triggers.
- What happens on merge (automation)
  - add/* PR merged: appends `ready` or `blocked` to new artifacts on `main`.
  - Issue PR merged (branch `<issue-id>`): appends `completed` to the Issue; cascades `in_review` to parents if all children complete.
  - complete/* PR merged: appends `completed` to the Milestone/Initiative.
- Changesets (only when packages change)
  - On `complete/<artifact-id>` PRs that affect packages, run: `pnpm changeset add` and commit the generated file.
  - CI will version/publish during the release workflow.

## Schema Version
- Use `schema_version: "0.0.1"` for the initial schema.
- Version will bump via changesets when core schema changes.

## Completion Fields
- Keep lifecycle events and completion content separate. Do not place summaries inside events.
- Use concise, labeled fields at the root of the artifact for scanability and light parsing.

- Issues → `implementation_notes`
  - Goal: developer handoff and future reuse.
  - Shape:
    - `result`: one line of what shipped
    - `challenges`: optional list of `{ challenge, solution }`
    - `insights`: optional list of short lessons/gotchas
    - `tags`: optional list of keywords/links (domains, tech, files, PRs)
  - Example:
    
    implementation_notes:
      result: "Actor/Event schemas added; strict UTC timestamps"
      challenges:
        - challenge: "Avoid unsafe casts in tests"
          solution: "Use unknown with zod.safeParse"
      insights:
        - "Limit agent types to system|cascade to reduce surface area"
      tags: [core, validation, zod, timestamps, schemas.ts, PR-16]

- Milestones/Initiatives → `impact_summary`
  - Goal: stakeholder-facing progress and value.
  - Shape:
    - `Outcome`: one line business/roadmap impact
    - `Benefits`: short list (2–4 items)
    - `Scope`: list of touched areas with a short change note each
    - `Next`: one line on what this enables next
  - Example:
    
    impact_summary:
      Outcome: "Core v1 types stabilized for downstream packages"
      Benefits: ["consistent validation", "faster onboarding", "fewer regressions"]
      Scope:
        - packages/core: "constants + schemas + tests"
        - ci: "added core tests to pipeline"
      Next: "relationships + metadata schemas (A.1.3)"

Notes
- Keep entries brief; avoid prose paragraphs. Link to PRs for details.
- These fields live at the root of the artifact YAML, not inside `events` or `content`.

## References
- Event system overview: .kodebase/docs/specs/event-system-architecture/overview.md
- CLI contract: .kodebase/docs/specs/event-system-architecture/the-cli-overhaul.md
- Core package spec: .kodebase/docs/specs/package-core/core-package-spec.md

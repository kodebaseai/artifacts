# @kodebase/core

Core validation primitives for the Kodebase monorepo. This package exposes the
canonical constants, registries, schemas, and helpers that power every other
Kodebase artifact workflow.

## What lives here?

- `src/constants.ts` &mdash; lifecycle events, triggers, priorities, and other
  enumerations shared across services.
- `src/schemas/registries` &mdash; modular Zod registries for metadata, shared
  helpers, and artifact-specific content.
- `src/schemas/schemas.ts` &mdash; composed Initiative, Milestone, and Issue
  schemas built on top of the registries.
- `src/parser` &mdash; parser implementation plus unit and fixture tests that
  validate real-world YAML inputs against golden outputs.
- `src/validator` &mdash; validation orchestration, error formatting, and the
  associated fixture-backed tests.
- `src/state` &mdash; state machine utilities (`canTransition`, `getValidTransitions`,
  and `StateTransitionError`) for artifact lifecycle transitions.
- `src/test-utils` &mdash; shared helpers (for example, fixture loaders) used
  across the parser and validator suites.

## Running the tests

```bash
pnpm --filter @kodebase/core test
```

Vitest is configured with Istanbul coverage. Running the command above prints a
coverage table (and writes `packages/coverage.json`) to ensure the core surface
remains fully exercised.

## When to depend on @kodebase/core

- Validating artifact documents (Initiatives, Milestones, Issues) before they
  are persisted or published.
- Parsing `.yml` artifacts into typed data structures that downstream tools can
  consume safely.
- Auto-detecting artifact types and validating them with readable error
  messages.
- Importing canonical constants for UI dropdowns or automation triggers.
- Generating UI metadata by reading the registry entries registered with `z`
  and the local `artifactRegistry`.

If you need to extend schemas, prefer composing new registries rather than
modifying the exported ones directly. Open an issue or proposal before breaking
changes that affect downstream packages.

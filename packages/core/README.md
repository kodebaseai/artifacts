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
- `src/parser/artifact-parser.ts` &mdash; YAML helpers that turn artifact
  documents into typed objects with human-friendly validation errors.
- `src/schemas/schemas.fixtures.ts` &mdash; golden fixtures used by the test
  suite for end-to-end validation.

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
- Importing canonical constants for UI dropdowns or automation triggers.
- Generating UI metadata by reading the registry entries registered with `z`
  and the local `artifactRegistry`.

If you need to extend schemas, prefer composing new registries rather than
modifying the exported ones directly. Open an issue or proposal before breaking
changes that affect downstream packages.

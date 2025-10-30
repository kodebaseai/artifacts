# Schemas module

This directory hosts the registry-driven schema system that underpins the core
artifact definitions.

## Layout

- `registries/` &mdash; granular Zod registries for metadata, shared helpers,
  and artifact-specific content fields. Each registry registers itself with the
  shared `artifactRegistry` and exposes rich metadata for downstream tooling.
- `schemas.ts` &mdash; composes Initiative, Milestone, and Issue schemas from the
  registries, handling registry registrations and exported types.
- `schemas.fixtures.ts` &mdash; golden fixtures for valid/invalid artifacts used
  by the accompanying test suite.
- `schemas.compose.test.ts` &mdash; integration tests that exercise composed
  schemas, defaults, and required sections.

## Developing new schema pieces

1. Add or update a registry inside `registries/`.
2. Write or update unit tests alongside the registry to cover valid and invalid
   cases.
3. If the change affects composed artifacts, update `schemas.ts` and expand the
   compose tests to lock behaviour.
4. Refresh fixtures when structures change so downstream consumers keep working
   against realistic data.

Run the package test suite after any change to verify coverage:

```bash
pnpm --filter @kodebase/core test
```

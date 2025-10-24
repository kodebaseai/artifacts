# Kodebase Monorepo

This is the Kodebase monorepo. It uses pnpm, Turborepo, Biome, and Changesets. Agents and developers should follow the Kodebase Agent Constitution and Methodology for day‑to‑day work.

**Start Here**
- Read `.kodebase/docs/README.md` for the agent/developer onboarding.
- Review `AGENTS.md`, `AGENTIC_CONSTITUTION.mdc`, and `AGENTIC_KODEBASE_METHODOLOGY.mdc` for principles and workflow.

**Quick Start**
- `pnpm install` to install dependencies.
- `pnpm dlx turbo login` to enable Vercel Remote Caching (recommended).
- `pnpm exec turbo link` to link the repo to the cache project.
- `pnpm check` to run Biome lint + format checks.
- `pnpm dev` to start development across apps, or `pnpm exec turbo dev --filter=<pkg>` for a specific app.

**Core Commands**
- `pnpm dev` runs `turbo run dev` across the workspace.
- `pnpm build` runs `turbo run build`.
- `pnpm check` runs Biome checks (lint + format) read‑only.
- `pnpm check:fix` applies automatic fixes.
- `pnpm test` runs workspace tests via Turborepo.

**Changesets (Versioning & Changelogs)**
- Add a changeset for user‑visible changes: `pnpm changeset add`.
- Version during release: `pnpm changeset version`.
- Publish public packages: `pnpm changeset publish`.

**Commit Pattern**
- Prefix commits with the Issue ID when applicable: `A.1.5: feat: Implement email validation`.
- Conventional type is recommended but flexible; clarity over rigidity.

**Remote Caching**
- Authenticate: `pnpm dlx turbo login`.
- Link cache: `pnpm exec turbo link`.
- Unlink if needed: `npx turbo unlink`.

**Quality & Tooling**
- Lint: `pnpm lint` or `pnpm lint:fix`.
- Format: `pnpm format` or `pnpm format:fix`.
- Types: `pnpm check-types` (delegates to package tasks via Turborepo).

**Repo Structure (High Level)**
- `apps/*` application code (e.g., Next.js apps).
- `packages/*` shared libraries and configs.
- `.kodebase/*` artifacts, docs, and process assets.
- `turbo.json` task pipelines and caching config.
- `biome.json` lint/format configuration.

**Working Method (Essentials)**
- Scope work to the active issue’s acceptance criteria; keep it simple and local‑first unless requirements state otherwise.
- If requirements are unclear, ask for clarification before coding.
- Use the shared glossary (`.kodebase/docs/GLOSSARY.md`) for consistent terminology.
- If a change adds notable complexity, record an ADR per the Constitution.

**Monorepo + Public Mirrors**
- Public packages are published to npm and mirrored to public repos.
- Private apps/utilities keep `"private": true` and are never published.
- Versioning and changelogs are managed centrally via Changesets.

For deeper guidance, see `.kodebase/docs/README.md` and `AGENTS.md`.

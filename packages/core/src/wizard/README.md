# Wizard Support Helpers

UI-agnostic helpers for bootstrapping artifacts and managing the `.kodebase/artifacts` layout.

- `artifact-context.ts` – `detectContextLevel` determines what type of child artifact to create
  based on parent ID (initiative → milestone, milestone → issue), and `allocateNextId` scans
  siblings to find the next available numeric ID, handling sparse ranges and multi-digit segments.

- `artifact-layout.ts` – `ensureArtifactsLayout` creates the artifacts directory structure
  idempotently, and `resolveArtifactPaths` resolves canonical directory and file paths for
  any artifact ID with optional slug support. For issues, automatically looks up the parent
  milestone directory using the loader stack.

- `artifact-scaffolder.ts` (from `../builder/`) – `scaffoldInitiative`, `scaffoldMilestone`,
  and `scaffoldIssue` create in-memory artifacts with minimal input, initial draft event,
  and full schema validation. Composes with `allocateNextId` and `resolveArtifactPaths` for
  complete wizard workflow.

- `artifact-gating.ts` – `isAncestorBlockedOrCancelled` checks if any parent artifact in the
  ancestor chain is currently blocked or cancelled. Returns a boolean flag and reason string
  for runtime gating decisions. Used by CLI commands (e.g., `kodebase work --check-parent`)
  to enforce the implicit rule that parent state gates child operations. Read-only helper
  that complements sibling blocking (handled by cascade engine).

These utilities power the `kodebase add` command wizard and can be used by IDE extensions
or other tooling that needs to create artifacts programmatically.

---
"@kodebase/core": minor
---

Complete wizard support helpers milestone (A.7)

Add comprehensive wizard helper API for artifact creation and management:

- Layout and path resolution (ensureArtifactsLayout, resolveArtifactPaths)
- Context detection and ID allocation (detectContextLevel, allocateNextId)
- Artifact scaffolding (scaffoldInitiative, scaffoldMilestone, scaffoldIssue)
- Runtime gating helper (isAncestorBlockedOrCancelled)
- Integration tests validating end-to-end workflows

All helpers use options object pattern for better DX and include defensive handling for edge cases.

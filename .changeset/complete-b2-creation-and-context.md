---
"@kodebase/artifacts": minor
---

Complete B.2 - Creation & Context milestone

**Context Detection Service (B.2.1)**
- Implemented ContextService with 7 methods for full context detection
- Added detectContext() for inferring artifact level and parent from directory paths
- Added detectFromBranch() for parsing artifact IDs from git branch names (add/*, artifact-id, complete/*)
- Added project validation utilities (isKodebaseProject, ensureLayout, requireContext)
- Achieved 96.7% test coverage (113 tests) using memfs for fast isolated testing

**ID Allocation Logic (B.2.2)**
- Implemented IdAllocationService with stateless filesystem-based ID allocation
- Added allocateNextInitiativeId() using base-26 conversion (A→Z→AA→ZZ like Excel columns)
- Added allocateNextMilestoneId() and allocateNextIssueId() for numeric sequential IDs
- Implemented gap-avoiding chronological increment strategy to preserve ID chronology
- Achieved 97.32% test coverage (29 tests) with performance <100ms for 100+ artifacts

**Artifact Templates (B.2.3)**
- Created generateSlug() utility handling Unicode, emoji, and special characters
- Re-exported scaffold functions (scaffoldInitiative, scaffoldMilestone, scaffoldIssue) from @kodebase/core
- Achieved 100% test coverage (44 tests) for slug generation edge cases

**Scaffolding Service (B.2.4)**
- Implemented ScaffoldingService as orchestration layer combining ID allocation, slug generation, and scaffold functions
- Added git-based actor detection (getGitActor) with fallback for non-git environments
- Created unified API (scaffoldInitiative, scaffoldMilestone, scaffoldIssue) for artifact creation workflows
- Achieved 100% test coverage (20 tests) with memfs-based integration testing

**Package Status**
✅ All 206 tests passing with 97.5% overall coverage
✅ All 4 deliverables (B.2.1-B.2.4) completed with 95%+ individual coverage
✅ ESM-only configuration maintained with zero circular dependencies
✅ Full spec compliance for context-aware artifact creation
✅ Ready for B.3 CLI integration enabling `kodebase add` commands

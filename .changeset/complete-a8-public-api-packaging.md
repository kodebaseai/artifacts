---
"@kodebase/core": minor
---

Complete A.8 - Public API, Docs, and Packaging milestone

**API Surface Curation (A.8.1)**
- Cleaned up index.ts exports removing internal utilities
- Consolidated public API into 12 module groups
- Increased documentation coverage from ~25% to ~95%

**Documentation and Cross-linking (A.8.2)**
- Added comprehensive JSDoc for all public functions across 11 modules
- Added Error Formatting section to README.md
- Maintained 333 tests at 97% coverage

**ESM Build and Smoke Tests (A.8.3)**
- Implemented TypeScript compilation to dist/ with proper build infrastructure
- Created comprehensive smoke tests validating ESM imports (12 module groups) and type completeness
- Added package validation tools (publint, @arethetypeswrong/cli)
- Integrated smoke tests into CI pipeline
- Fixed Zod v4 type declaration bugs with skipLibCheck workaround
- Exported missing types (TArtifactMetadata, TEvent)
- Added prepack validation to prevent publishing issues

**Package Status**
✅ All 333 unit tests passing
✅ All ESM import smoke tests passing
✅ Type completeness validation passing
✅ Package validation (publint) passing
✅ Ready for npm publishing with proper dist/ artifacts, type declarations, and source maps

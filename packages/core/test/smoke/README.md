# @kodebase/core Smoke Tests

Minimal consumer tests that verify the package can be imported and used without bundler hacks.

## Purpose

These tests validate the **acceptance criteria** for A.8.3:

1. ✅ Minimal consumer project can import from @kodebase/core without bundler hacks
2. ✅ d.ts files contain the public API types; no missing/any typings
3. ✅ CI runs smoke tests as part of the core build pipeline

## Test Structure

### esm-import.test.ts
Tests all public exports are importable:
- ✅ Parser functions (parseInitiative, parseMilestone, parseIssue, parseYaml)
- ✅ Validator functions (validateArtifact, validateInitiative, validateMilestone, validateIssue)
- ✅ Schemas (InitiativeSchema, MilestoneSchema, IssueSchema)
- ✅ Constants and enums (CArtifact, CArtifactEvent, CPriority, CEstimationSize)
- ✅ State machine (canTransition, getValidTransitions, assertTransition)
- ✅ Event builders (createDraftEvent, createReadyEvent, etc.)
- ✅ Loading utilities (readArtifact, writeArtifact, loadAllArtifactPaths)
- ✅ Cascade engine (CascadeEngine)
- ✅ Wizard helpers (ensureArtifactsLayout, resolveArtifactPaths, etc.)
- ✅ Builder/scaffolder (scaffoldInitiative, scaffoldMilestone, scaffoldIssue)
- ✅ Error formatter (formatZodIssue, formatZodError, formatParseIssues)
- ✅ Dependency validator (detectCircularDependencies, etc.)
- ✅ No default export (ESM best practice)

### type-completeness.test.ts
Validates TypeScript type declarations:
- ✅ Type inference works correctly
- ✅ Schemas export proper Zod types
- ✅ Enum types are properly exported
- ✅ Complex types have no implicit 'any'
- ✅ Function signatures preserve types
- ✅ State machine preserves types
- ✅ Deep property access is typed
- ✅ Type guards work correctly

## Running Tests

### Prerequisites
The parent package must be built first:
```bash
cd /Users/migcarva/Code/kodebase-org/kodebase/packages/core
pnpm build
```

### Install Dependencies
```bash
cd test/smoke
pnpm install
```

### Run Tests
```bash
pnpm test
```

This runs:
1. **ESM import test**: Executes `esm-import.test.ts` with tsx
2. **Type check**: Validates `type-completeness.test.ts` compiles with strict mode

## What Gets Tested

### Module Resolution
- ESM imports resolve correctly to `dist/` compiled output
- No webpack/rollup/vite configuration needed
- Named imports work (tree-shaking ready)
- No default export (ESM best practice)

### Type System
- All public types are exported
- No implicit `any` types
- Type inference works correctly
- Complex discriminated unions preserve types
- Generic functions maintain type parameters

### Package Structure
- `package.json` exports point to correct files
- TypeScript declarations (`.d.ts`) are complete
- Source maps (`.d.ts.map`) are generated
- Build artifacts exclude test files

## CI Integration

These tests run in the core package's CI pipeline:
1. Build package (`pnpm build`)
2. Install smoke test dependencies
3. Run ESM import tests
4. Run type completeness checks

If any test fails, the CI build fails and merges are blocked.

## Troubleshooting

### "Cannot find module '@kodebase/core'"
**Cause**: Parent package not built
**Solution**: Run `cd ../.. && pnpm build` first

### "Module not found: dist/index.js"
**Cause**: Build output missing
**Solution**: Verify `tsconfig.json` has `"noEmit": false`

### "Type 'any' is not assignable"
**Cause**: Type declarations incomplete
**Solution**: Check `src/index.ts` exports all public types

### Import resolution errors
**Cause**: package.json exports misconfigured
**Solution**: Verify `exports.types` and `exports.import` paths match dist output

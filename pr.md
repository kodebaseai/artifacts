## 🎯 Description

Implements the A.5 cascade engine features:

- `CascadeEngine.shouldCascadeToParent` evaluates child states and recommends parent transitions with deterministic reasons while keeping child histories untouched.
- `CascadeEngine.generateCascadeEvent` produces canonical cascade events with system actor, explicit triggers, and trigger metadata, including archival trigger mapping.
- `CascadeEngine.resolveDependencyCompletion` updates blocking metadata on dependency completion and emits ready events when all blockers clear.

## 📋 Changes

- core(cascade): add `generateCascadeEvent` with trigger mapping and structured metadata (+ system cascade actor).
- core(cascade): add dependency resolution helper updating blocking metadata and emitting ready recommendations.
- core(cascade): extend tests covering issue→milestone and milestone→initiative flows, child immutability, archival trigger mapping, and dependency resolution.
- core(state): allow `dependency_completed` as a valid trigger for ready events.
- artifacts: update A.5.1–A.5.4 notes/ownership for the new cascade helpers.

## 🧪 Testing

- [x] `pnpm --filter @kodebase/core test -- --run`

## 📦 Package Changes

- [x] `@kodebase/core`
- [ ] `@kodebase/cli`
- [ ] `@kodebase/ui`
- [ ] `docs`
- [ ] `web`

## 🔄 Changesets

<!-- If this PR includes package changes, you must include a changeset -->

- [ ] I have added a changeset for my changes (`pnpm changeset add`)
- [ ] I have committed the changeset file

## 🔗 Related Artifacts

- `.kodebase/artifacts/A.core-package-v1/A.5.cascade-engine-upward-only/A.5.1.should-cascade-to-parent.yml`
- `.kodebase/artifacts/A.core-package-v1/A.5.cascade-engine-upward-only/A.5.2.generate-cascade-event.yml`
- `.kodebase/artifacts/A.core-package-v1/A.5.cascade-engine-upward-only/A.5.3.cascade-tests-issue-milestone-initiative.yml`
- `.kodebase/artifacts/A.core-package-v1/A.5.cascade-engine-upward-only/A.5.4.no-child-writes-and-archival-mapping.yml`

## ✅ Checklist

- [x] My code follows the project's style guidelines
- [x] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [x] My changes generate no new warnings
- [x] I have added tests that prove my feature works
- [x] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

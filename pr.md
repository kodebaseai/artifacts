## 🎯 Description

Implements the A.5 cascade engine features:

- `CascadeEngine.shouldCascadeToParent` evaluates child states and recommends parent transitions with deterministic reasons.
- `CascadeEngine.generateCascadeEvent` produces canonical cascade events with system actor, explicit triggers, and trigger metadata.

## 📋 Changes

- core(cascade): add `generateCascadeEvent` with trigger mapping and structured metadata (+ system cascade actor).
- core(cascade): update `shouldCascadeToParent` tests and new coverage for the event factory.
- core(state): allow `dependency_completed` as a valid trigger for ready events.
- artifacts: assign A.5.2 to the current agent.

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

## ✅ Checklist

- [x] My code follows the project's style guidelines
- [x] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [x] My changes generate no new warnings
- [x] I have added tests that prove my feature works
- [x] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## 🎯 Description

Implements A.4.3 — Event builder requires explicit trigger and adds guardrails.

- `createEvent` now requires an explicit `trigger` (no fallback) and validates
  the event↔trigger pairing using `EVENT_TRIGGER_BY_EVENT` + `assertEventTrigger`.
- Convenience creators added for common flows (draft, ready, blocked,
  in_progress, in_review, completed, cancelled, archived).
- `createBlockedEvent` normalizes `metadata.blocking_dependencies` and validates
  ISO `resolved_at` when provided.
- Tests cover required-trigger behavior, helper outputs, and mapping guard.

## 📋 Changes

- core(state): add `EVENT_TRIGGER_BY_EVENT` and `assertEventTrigger`
- core(state): implement `createEvent` with explicit trigger requirement
- core(state): add helpers `createDraftEvent|createReadyEvent|createBlockedEvent|
  createInProgressEvent|createInReviewEvent|createCompletedEvent|createCancelledEvent|createArchivedEvent`
- core(tests): unit tests for builder + trigger mapping + metadata normalization
- core(docs): mention builder in `packages/core/README.md`

## 🧪 Testing

- [x] All tests pass (`pnpm --filter @kodebase/core test -- --run`)
- [ ] Manual testing completed
- [x] No breaking changes

## 📦 Package Changes

- [ ] `@kodebase/cli` - Changes to CLI package
- [x] `@kodebase/core` - Changes to Core package
- [ ] `@kodebase/ui` - Changes to UI package
- [ ] `docs` - Changes to documentation site
- [ ] `web` - Changes to web application

## 🔄 Changesets

<!-- If this PR includes package changes, you must include a changeset -->

- [ ] I have added a changeset for my changes (`pnpm changeset add`)
- [ ] I have committed the changeset file

## 📸 Screenshots

<!-- If applicable, add screenshots to help explain your changes -->

## 🔗 Related Issues

- Artifact: `.kodebase/artifacts/A.core-package-v1/A.4.state-machine-and-events/A.4.3.event-builder-requires-trigger-and-helpers.yml`

## ✅ Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## 🚀 Deployment Notes

<!-- Any special deployment considerations -->

## 📝 Additional Notes

<!-- Any additional information that reviewers should know -->

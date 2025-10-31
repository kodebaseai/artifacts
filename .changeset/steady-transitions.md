---
"@kodebase/core": minor
---

Add lifecycle state utilities and chronology validation in @kodebase/core:

- State machine: `canTransition`, `getValidTransitions`, and `StateTransitionError` with tests and docs. (A.4.1)
- Event ordering: `validateEventOrder` and `EventOrderError` enforcing first `draft` and non-decreasing timestamps, with tests. (A.4.2)

# @kodebase/core

## 0.1.0

### Minor Changes

- Initial release of @kodebase/core

  This is the foundational TypeScript package for the Kodebase methodology, providing:

  - **Core Types & Schemas**: Comprehensive TypeScript types and JSON schemas for Initiatives, Milestones, and Issues
  - **Artifact Management**: Parser and validator for YAML artifacts with full schema validation
  - **Event System**: Event builders, identity generation (event_id, correlation_id, parent_event_id), and state machine validation
  - **Cascade Engine**: Automated state propagation across artifact hierarchies
  - **Utilities**: Timestamp formatting, actor formatting, and other helper functions
  - **Analytics**: Metrics calculation for artifacts and team performance

  This release enables the development of the Kodebase CLI and other tooling that depends on these core utilities.

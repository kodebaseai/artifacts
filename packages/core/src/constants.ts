/**
 * Core constants and enums for the Kodebase artifact system.
 *
 * This module defines all fundamental constants used across the package:
 * - Artifact lifecycle states and event triggers
 * - Priority levels and estimation sizes
 * - Artifact types and ID patterns
 * - Actor format validation (human and agent)
 *
 * @module constants
 */

/**
 * Artifact lifecycle states representing the current status of an artifact.
 *
 * Artifacts transition through these states via events. The state machine
 * enforces valid transitions (e.g., draft → ready → in_progress).
 *
 * @example
 * ```ts
 * import { CArtifactEvent } from "@kodebase/core";
 *
 * const newEvent = {
 *   event: CArtifactEvent.DRAFT,
 *   timestamp: "2025-10-28T10:00:00Z",
 *   actor: "Alice (alice@example.com)",
 *   trigger: "artifact_created"
 * };
 * ```
 *
 * @see {@link TArtifactEvent}
 */
export const CArtifactEvent = {
  /** Initial state when artifact is created */
  DRAFT: "draft",
  /** Artifact is ready to be worked on (all dependencies met) */
  READY: "ready",
  /** Artifact is blocked by dependencies or prerequisites */
  BLOCKED: "blocked",
  /** Artifact has been cancelled and won't be completed */
  CANCELLED: "cancelled",
  /** Work is actively in progress */
  IN_PROGRESS: "in_progress",
  /** Work is complete and awaiting review */
  IN_REVIEW: "in_review",
  /** Work is finished and verified */
  COMPLETED: "completed",
  /** Artifact is archived for historical reference */
  ARCHIVED: "archived",
} as const;

/**
 * Union type of all valid artifact lifecycle states.
 */
export type TArtifactEvent =
  (typeof CArtifactEvent)[keyof typeof CArtifactEvent];

/**
 * Event triggers that cause artifact state transitions.
 *
 * Triggers represent the reason for a state change. They can be manual
 * (user actions), automatic (cascade engine), or external (CI/CD systems).
 *
 * @example
 * ```ts
 * import { CEventTrigger, CArtifactEvent } from "@kodebase/core";
 *
 * // Manual trigger when user creates branch
 * const event = {
 *   event: CArtifactEvent.IN_PROGRESS,
 *   trigger: CEventTrigger.BRANCH_CREATED,
 *   actor: "Bob (bob@example.com)",
 *   timestamp: "2025-10-28T14:30:00Z"
 * };
 *
 * // Automatic trigger from cascade engine
 * const cascadeEvent = {
 *   event: CArtifactEvent.READY,
 *   trigger: CEventTrigger.DEPENDENCIES_MET,
 *   actor: "agent.cascade",
 *   timestamp: "2025-10-28T15:00:00Z"
 * };
 * ```
 *
 * @see {@link TEventTrigger}
 */
export const CEventTrigger = {
  /** Artifact was just created */
  ARTIFACT_CREATED: "artifact_created",
  /** All blocking dependencies are now complete */
  DEPENDENCIES_MET: "dependencies_met",
  /** Artifact has blocking dependencies */
  HAS_DEPENDENCIES: "has_dependencies",
  /** Development branch was created */
  BRANCH_CREATED: "branch_created",
  /** Pull request is ready for review */
  PR_READY: "pr_ready",
  /** Pull request was merged */
  PR_MERGED: "pr_merged",
  /** A blocking dependency completed */
  DEPENDENCY_COMPLETED: "dependency_completed",
  /** Child artifacts started work */
  CHILDREN_STARTED: "children_started",
  /** All child artifacts completed */
  CHILDREN_COMPLETED: "children_completed",
  /** Parent artifact completed */
  PARENT_COMPLETED: "parent_completed",
  /** Parent artifact archived */
  PARENT_ARCHIVED: "parent_archived",
  /** Manually cancelled by user */
  MANUAL_CANCEL: "manual_cancel",
} as const;

/**
 * Union type of all valid event triggers.
 */
export type TEventTrigger = (typeof CEventTrigger)[keyof typeof CEventTrigger];

/**
 * Priority levels for artifacts indicating urgency and importance.
 *
 * @example
 * ```ts
 * import { CPriority } from "@kodebase/core";
 *
 * const criticalBug = {
 *   metadata: {
 *     title: "Fix auth bypass",
 *     priority: CPriority.CRITICAL,
 *     // ...
 *   }
 * };
 * ```
 *
 * @see {@link TPriority}
 */
export const CPriority = {
  /** Low priority - can be deferred */
  LOW: "low",
  /** Medium priority - normal work item */
  MEDIUM: "medium",
  /** High priority - should be addressed soon */
  HIGH: "high",
  /** Critical priority - requires immediate attention */
  CRITICAL: "critical",
} as const;

/**
 * Union type of all valid priority levels.
 */
export type TPriority = (typeof CPriority)[keyof typeof CPriority];

/**
 * T-shirt sized effort estimates for artifacts.
 *
 * These provide rough sizing without requiring precise hour estimates.
 * Actual time mappings are team-dependent (e.g., XS = 1-2 hours, S = 2-4 hours).
 *
 * @example
 * ```ts
 * import { CEstimationSize } from "@kodebase/core";
 *
 * const quickFix = {
 *   metadata: {
 *     title: "Update docs",
 *     estimation: CEstimationSize.XS,
 *     // ...
 *   }
 * };
 * ```
 *
 * @see {@link TEstimationSize}
 */
export const CEstimationSize = {
  /** Extra small - trivial change */
  XS: "XS",
  /** Small - quick fix or minor feature */
  S: "S",
  /** Medium - standard work item */
  M: "M",
  /** Large - substantial feature or refactor */
  L: "L",
  /** Extra large - major initiative or epic */
  XL: "XL",
} as const;

/**
 * Union type of all valid estimation sizes.
 */
export type TEstimationSize =
  (typeof CEstimationSize)[keyof typeof CEstimationSize];

/**
 * The three artifact types in the Kodebase hierarchy.
 *
 * Artifacts form a three-level hierarchy:
 * - Initiatives (A, B, C...) - highest level strategic goals
 * - Milestones (A.1, A.2, B.1...) - mid-level deliverables
 * - Issues (A.1.1, A.1.2...) - lowest level tasks
 *
 * @example
 * ```ts
 * import { CArtifact } from "@kodebase/core";
 *
 * function getArtifactLevel(id: string): string {
 *   const parts = id.split(".");
 *   if (parts.length === 1) return CArtifact.INITIATIVE;
 *   if (parts.length === 2) return CArtifact.MILESTONE;
 *   return CArtifact.ISSUE;
 * }
 * ```
 *
 * @see {@link TArtifactType}
 */
export const CArtifact = {
  /** Top-level strategic initiative (e.g., A, B, AA) */
  INITIATIVE: "initiative",
  /** Mid-level milestone under an initiative (e.g., A.1, B.2) */
  MILESTONE: "milestone",
  /** Bottom-level issue/task under a milestone (e.g., A.1.1, B.2.3) */
  ISSUE: "issue",
} as const;

/**
 * Union type of all valid artifact types.
 */
export type TArtifactType = (typeof CArtifact)[keyof typeof CArtifact];

/**
 * Array of all artifact lifecycle states for iteration.
 *
 * @example
 * ```ts
 * import { ARTIFACT_EVENTS } from "@kodebase/core";
 * ARTIFACT_EVENTS.forEach(state => console.log(state));
 * ```
 */
export const ARTIFACT_EVENTS = Object.values(CArtifactEvent);

/**
 * Array of all event triggers for iteration.
 */
export const EVENT_TRIGGERS = Object.values(CEventTrigger);

/**
 * Array of all priority levels for iteration.
 */
export const PRIORITIES = Object.values(CPriority);

/**
 * Array of all estimation sizes for iteration.
 */
export const ESTIMATION_SIZES = Object.values(CEstimationSize);

/**
 * Array of all artifact types for iteration.
 */
export const ARTIFACT_TYPES = Object.values(CArtifact);

/**
 * Regular expression for validating human actor format.
 *
 * Human actors must be in the format: "Full Name (email@domain.tld)"
 *
 * @example
 * ```ts
 * import { HUMAN_ACTOR_REGEX } from "@kodebase/core";
 *
 * const valid = "Alice Smith (alice@example.com)";
 * const invalid = "alice@example.com"; // missing name
 *
 * console.log(HUMAN_ACTOR_REGEX.test(valid)); // true
 * console.log(HUMAN_ACTOR_REGEX.test(invalid)); // false
 * ```
 */
export const HUMAN_ACTOR_REGEX =
  /^[^()]+\s\([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\)$/i;

/**
 * Valid AI agent types for the Kodebase system.
 *
 * Currently supports:
 * - `system` - System automation (e.g., layout initialization)
 * - `cascade` - Cascade engine for dependency propagation
 *
 * @see {@link SIMPLE_AGENT_REGEX}
 */
export const AGENT_TYPES = ["system", "cascade"] as const;

/**
 * Regular expression for validating AI agent actor format.
 *
 * Agent actors must be in the format: "agent.<type>" or "agent.<type>@<tenant>"
 * where type is one of {@link AGENT_TYPES}.
 *
 * @example
 * ```ts
 * import { SIMPLE_AGENT_REGEX } from "@kodebase/core";
 *
 * const systemAgent = "agent.system";
 * const cascadeWithTenant = "agent.cascade@acme-corp";
 * const invalid = "agent.unknown";
 *
 * console.log(SIMPLE_AGENT_REGEX.test(systemAgent)); // true
 * console.log(SIMPLE_AGENT_REGEX.test(cascadeWithTenant)); // true
 * console.log(SIMPLE_AGENT_REGEX.test(invalid)); // false
 * ```
 */
export const SIMPLE_AGENT_REGEX = new RegExp(
  `^agent\\.(?:${AGENT_TYPES.join("|")})(?:@[a-z0-9-]+)?$`,
  "i",
);

/**
 * Regular expression for validating initiative IDs.
 *
 * Initiative IDs use base-26 style letter sequences: A, B, ..., Z, AA, AB, ..., ZZ, AAA, ...
 * These are the top-level identifiers in the artifact hierarchy.
 *
 * @example
 * ```ts
 * import { INITIATIVE_ID_REGEX } from "@kodebase/core";
 *
 * console.log(INITIATIVE_ID_REGEX.test("A")); // true
 * console.log(INITIATIVE_ID_REGEX.test("AA")); // true
 * console.log(INITIATIVE_ID_REGEX.test("A.1")); // false (milestone)
 * console.log(INITIATIVE_ID_REGEX.test("123")); // false (numbers not allowed)
 * ```
 *
 * @see {@link MILESTONE_ID_REGEX}, {@link ISSUE_ID_REGEX}
 */
export const INITIATIVE_ID_REGEX = /^[A-Z]+$/;

/**
 * Regular expression for validating milestone IDs.
 *
 * Milestone IDs follow the format: {InitiativeID}.{Number} (e.g., A.1, B.2, AA.3)
 * These are mid-level identifiers under initiatives.
 *
 * @example
 * ```ts
 * import { MILESTONE_ID_REGEX } from "@kodebase/core";
 *
 * console.log(MILESTONE_ID_REGEX.test("A.1")); // true
 * console.log(MILESTONE_ID_REGEX.test("AA.42")); // true
 * console.log(MILESTONE_ID_REGEX.test("A")); // false (initiative)
 * console.log(MILESTONE_ID_REGEX.test("A.1.1")); // false (issue)
 * ```
 *
 * @see {@link INITIATIVE_ID_REGEX}, {@link ISSUE_ID_REGEX}
 */
export const MILESTONE_ID_REGEX = /^[A-Z]+\.\d+$/;

/**
 * Regular expression for validating issue IDs.
 *
 * Issue IDs follow the format: {InitiativeID}.{MilestoneNumber}.{IssueNumber}
 * (e.g., A.1.1, B.2.3, AA.1.5). These are the lowest-level task identifiers.
 *
 * @example
 * ```ts
 * import { ISSUE_ID_REGEX } from "@kodebase/core";
 *
 * console.log(ISSUE_ID_REGEX.test("A.1.1")); // true
 * console.log(ISSUE_ID_REGEX.test("AA.2.42")); // true
 * console.log(ISSUE_ID_REGEX.test("A.1")); // false (milestone)
 * console.log(ISSUE_ID_REGEX.test("A")); // false (initiative)
 * ```
 *
 * @see {@link INITIATIVE_ID_REGEX}, {@link MILESTONE_ID_REGEX}
 */
export const ISSUE_ID_REGEX = /^[A-Z]+\.\d+\.\d+$/;

/**
 * Regular expression for validating strict ISO-8601 UTC timestamps.
 *
 * Matches timestamps in the format: YYYY-MM-DDTHH:MM:SSZ (no milliseconds).
 * All artifact event timestamps must use this format.
 *
 * @example
 * ```ts
 * import { ISO_UTC_REGEX } from "@kodebase/core";
 *
 * const valid = "2025-10-28T19:37:00Z";
 * const withMs = "2025-10-28T19:37:00.123Z"; // not allowed
 * const noZ = "2025-10-28T19:37:00"; // not allowed
 *
 * console.log(ISO_UTC_REGEX.test(valid)); // true
 * console.log(ISO_UTC_REGEX.test(withMs)); // false
 * console.log(ISO_UTC_REGEX.test(noZ)); // false
 * ```
 */
export const ISO_UTC_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)Z$/;

/**
 * Core constants and enums for Kodebase v1
 * - States, priorities, estimation sizes, artifact types
 * - Event triggers including parent_* and manual_cancel
 */

// Artifact lifecycle events (states)
export const CArtifactEvent = {
  DRAFT: "draft",
  READY: "ready",
  BLOCKED: "blocked",
  CANCELLED: "cancelled",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;
export type TArtifactEvent =
  (typeof CArtifactEvent)[keyof typeof CArtifactEvent];

// Event triggers (v1)
export const CEventTrigger = {
  ARTIFACT_CREATED: "artifact_created",
  DEPENDENCIES_MET: "dependencies_met",
  HAS_DEPENDENCIES: "has_dependencies",
  BRANCH_CREATED: "branch_created",
  PR_READY: "pr_ready",
  PR_MERGED: "pr_merged",
  DEPENDENCY_COMPLETED: "dependency_completed",
  CHILDREN_STARTED: "children_started",
  CHILDREN_COMPLETED: "children_completed",
  PARENT_COMPLETED: "parent_completed",
  PARENT_ARCHIVED: "parent_archived",
  MANUAL_CANCEL: "manual_cancel",
} as const;
export type TEventTrigger = (typeof CEventTrigger)[keyof typeof CEventTrigger];

// Priority levels
export const CPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;
export type TPriority = (typeof CPriority)[keyof typeof CPriority];

// Estimation sizes (t-shirt)
export const CEstimationSize = {
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
} as const;
export type TEstimationSize =
  (typeof CEstimationSize)[keyof typeof CEstimationSize];

// Artifact types
export const CArtifact = {
  INITIATIVE: "initiative",
  MILESTONE: "milestone",
  ISSUE: "issue",
} as const;
export type TArtifactType = (typeof CArtifact)[keyof typeof CArtifact];

// Convenience arrays
export const ARTIFACT_EVENTS = Object.values(CArtifactEvent);
export const EVENT_TRIGGERS = Object.values(CEventTrigger);
export const PRIORITIES = Object.values(CPriority);
export const ESTIMATION_SIZES = Object.values(CEstimationSize);
export const ARTIFACT_TYPES = Object.values(CArtifact);

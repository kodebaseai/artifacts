/**
 * Core constants and enums for Kodebase artifacts
 * @description The constants and enums for the Kodebase artifacts.
 * We use the C prefix to indicate that it's a constant.
 * @property KODEBASE_DIR - The directory of the Kodebase folder
 * @property KODEBASE_VERSION - The version of the Kodebase folder
 * @property SCHEMA_VERSION - The version of the schema
 * @property SUPPORTED_SCHEMA_VERSIONS - The supported schema versions
 * @property ARTIFACT_FILE_EXT - The extension of the artifact file
 * @property CKodebaseDomain - The constants for the Kodebase domains
 */

// Constants
export const KODEBASE_DIR = '.kodebase' as const;
export const KODEBASE_VERSION = '0.1.0' as const;
export const SCHEMA_VERSION = '0.2.0' as const;
export const SUPPORTED_SCHEMA_VERSIONS = ['0.1.0', '0.2.0'] as const;
export const ARTIFACT_FILE_EXT = '.yml' as const;

/**
 * Kodebase domains
 * @description The domains of the Kodebase folder.
 * @property INITIATIVES - The directory for initiatives
 * @property MILESTONES - The directory for milestones
 * @property ISSUES - The directory for issues
 * @example
 * ```yaml
 * .kodebase/
 * ├── initiatives/
 * ├── milestones/
 * └── issues/
 */
export const CKodebaseDomain = {
  INITIATIVES: 'initiatives',
  MILESTONES: 'milestones',
  ISSUES: 'issues',
} as const;
export const KODEBASE_DOMAINS = Object.values(CKodebaseDomain);

/**
 * Lifecycle states for artifacts following the event-driven process
 * @description The events that can be applied to an artifact metadata.events array.
 * @property DRAFT - The draft event
 * @property READY - The ready event
 * @property BLOCKED - The blocked event
 * @property CANCELLED - The cancelled event
 * @property IN_PROGRESS - The in_progress event
 * @property IN_REVIEW - The in_review event
 */
export const CArtifactEvent = {
  DRAFT: 'draft',
  READY: 'ready',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export const ARTIFACT_EVENTS = Object.values(CArtifactEvent);

/**
 * Event triggers that cause state transitions
 * @description The triggers that initiate event transitions in artifacts
 * @property ARTIFACT_CREATED - Initial artifact creation
 * @property DEPENDENCIES_MET - Dependencies already satisfied (initial check)
 * @property DEPENDENCY_COMPLETED - Blocking dependency completed (cascade update)
 * @property HAS_DEPENDENCIES - Artifact has blocking dependencies
 * @property BRANCH_CREATED - Feature branch created for work
 * @property PR_CREATED - Pull request created
 * @property PR_READY - Pull request marked ready for review
 * @property PR_MERGED - Pull request merged to main
 * @property MANUAL - Manual state change by user
 * @property CHILD_STARTED - Child artifact started work
 */
export const CEventTrigger = {
  ARTIFACT_CREATED: 'artifact_created',
  DEPENDENCIES_MET: 'dependencies_met',
  DEPENDENCY_COMPLETED: 'dependency_completed',
  HAS_DEPENDENCIES: 'has_dependencies',
  BRANCH_CREATED: 'branch_created',
  PR_CREATED: 'pr_created',
  PR_READY: 'pr_ready',
  PR_MERGED: 'pr_merged',
  MANUAL: 'manual',
  CHILD_STARTED: 'child_started',
} as const;
export const EVENT_TRIGGERS = Object.values(CEventTrigger);

/**
 * Lifecycle states for artifacts following the event-driven process
 * @description The events that can be applied to an artifact metadata.events array.
 * @property ASSIGNED - The assigned event
 * @property UNASSIGNED - The unassigned event
 * @property PRIORITY_CHANGED - The priority_changed event
 * @property DEPENDENCY_ADDED - The dependency_added event
 * @property DEPENDENCY_REMOVED - The dependency_removed event
 * @property COMMITED - The commited event
 */
export const CCommitEvent = {
  // Extend existing status types
  ...CArtifactEvent,
  // Additional workflow events
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  PRIORITY_CHANGED: 'priority_changed',
  DEPENDENCY_ADDED: 'dependency_added',
  DEPENDENCY_REMOVED: 'dependency_removed',
  COMMITED: 'commited',
} as const;
export const COMMIT_EVENTS = Object.values(CCommitEvent);

/**
 * Priority levels for artifacts
 * @property LOW - The low priority
 * @property MEDIUM - The medium priority
 * @property HIGH - The high priority
 * @property CRITICAL - The critical priority
 */
export const CPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export const PRIORITIES = Object.values(CPriority);

export const CSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;
export const SEVERITIES = Object.values(CSeverity);
export type TSeverity = (typeof CSeverity)[keyof typeof CSeverity];

/**
 * Estimation sizes for work effort
 * @property XS - The XS estimation size
 * @property S - The S estimation size
 * @property M - The M estimation size
 * @property L - The L estimation size
 * @property XL - The XL estimation size
 * @property XXL - The XXL estimation size
 */
export const CEstimationSize = {
  XS: 'XS',
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  XXL: 'XXL',
} as const;
export const ESTIMATION_SIZES = Object.values(CEstimationSize);

/**
 * Valid artifact types
 * @property INITIATIVE - The initiative type
 * @property MILESTONE - The milestone type
 * @property ISSUE - The issue type
 * @property PROJECT - The project type
 */
export const CArtifact = {
  INITIATIVE: 'initiative',
  MILESTONE: 'milestone',
  ISSUE: 'issue',
  // When you add a new type, you only add it here:
  // PROJECT: 'project',
} as const;
export const ARTIFACT_TYPES = Object.values(CArtifact);

/**
 * Type for artifact types
 * @property ArtifactType - The type for an artifact type
 */
export type ArtifactType = (typeof CArtifact)[keyof typeof CArtifact];

// ============================================================================
// Metric Constants
// ============================================================================

/**
 * Trend directions for metrics
 * @property INCREASING - The increasing trend
 * @property STABLE - The stable trend
 * @property DECREASING - The decreasing trend
 */
export const CMtricTrend = {
  INCREASING: 'increasing',
  STABLE: 'stable',
  DECREASING: 'decreasing',
} as const;
export const METRIC_TRENDS = Object.values(CMtricTrend);

/**
 * Types of metrics that can be calculated
 * @property CYCLE_TIME - The cycle time metric
 * @property LEAD_TIME - The lead time metric
 * @property BLOCKED_TIME - The blocked time metric
 */
export const CMetricType = {
  CYCLE_TIME: 'cycleTime',
  LEAD_TIME: 'leadTime',
  BLOCKED_TIME: 'blockedTime',
} as const;
export const METRIC_TYPES = Object.values(CMetricType);

/**
 * Types of validation errors that can occur during event validation
 * @property CHRONOLOGICAL - Events are not in chronological order
 * @property STATE_TRANSITION - Invalid state transition between events
 * @property FIRST_EVENT - First event is not 'draft' as required
 * @property MISSING_TRIGGER - Event is missing required trigger field
 */
export const CValidationErrorType = {
  CHRONOLOGICAL: 'chronological',
  STATE_TRANSITION: 'state_transition',
  FIRST_EVENT: 'first_event',
  MISSING_TRIGGER: 'missing_trigger',
} as const;
export const VALIDATION_ERROR_TYPES = Object.values(CValidationErrorType);

/**
 * Context levels for information depth and detail
 * @property MINIMAL - Minimal context with just essential information
 * @property FULL - Full context with detailed information (default)
 * @property EXTENDED - Extended context with comprehensive information
 */
export const CContextLevel = {
  MINIMAL: 'minimal',
  FULL: 'full',
  EXTENDED: 'extended',
} as const;
export const CONTEXT_LEVELS = Object.values(CContextLevel);
export type TContextLevel = (typeof CContextLevel)[keyof typeof CContextLevel];

export const CIntegrity = {
  VALID: 'valid',
  PARTIAL: 'partial',
  STALE: 'stale',
} as const;
export const INTEGRITY = Object.values(CIntegrity);
export type TIntegrity = (typeof CIntegrity)[keyof typeof CIntegrity];

export const CArtifactReadErrorType = {
  PARSING: 'parsing',
  VALIDATION: 'validation',
  FILESYSTEM: 'filesystem',
  UNKNOWN: 'unknown',
} as const;
export const ARTIFACT_READ_ERROR_TYPES = Object.values(CArtifactReadErrorType);
export type TArtifactReadErrorType =
  (typeof CArtifactReadErrorType)[keyof typeof CArtifactReadErrorType];

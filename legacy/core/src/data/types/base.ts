/**
 * Base types for Kodebase artifacts
 * @property TKodebaseDomain - The type for a Kodebase domain
 * @property TArtifactEvent - The type for an artifact event
 * @property TPriority - The type for a priority
 * @property TEstimationSize - The type for an estimation size
 * @property EventMetadata - The type for an event metadata
 * @property RelationshipsMetadata - The type for relationships metadata
 * @property ArtifactMetadata - The type for artifact metadata
 * @property BaseArtifact - The type for a base artifact
 */

import type {
  CArtifactEvent,
  CEstimationSize,
  CEventTrigger,
  CKodebaseDomain,
  CPriority,
} from './constants';

// ============================================================================
// Type Aliases
// ============================================================================

/**
 * Type aliases for constants
 *
 * These types are inferred from the constant objects to ensure type safety.
 * The T prefix indicates a type alias derived from a constant.
 * @returns The type aliases for constants
 */
export type TKodebaseDomain =
  (typeof CKodebaseDomain)[keyof typeof CKodebaseDomain];
export type TArtifactEvent =
  (typeof CArtifactEvent)[keyof typeof CArtifactEvent];
export type TPriority = (typeof CPriority)[keyof typeof CPriority];
export type TEstimationSize =
  (typeof CEstimationSize)[keyof typeof CEstimationSize];
export type TEventTrigger = (typeof CEventTrigger)[keyof typeof CEventTrigger];

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event metadata structure v2.0
 *
 * Represents a single event in an artifact's lifecycle.
 * Events form an immutable, append-only log that tracks all state transitions.
 *
 * @remarks
 * v2.0 Changes:
 * - Removed event_id, correlation_id, parent_event_id for simplicity
 * - Reordered fields to have event first for better readability
 * - Added required trigger field to track what caused the event
 * - Trigger supports parameterized values like 'child_started:<artifact-id>'
 * Events cannot be modified or deleted once created.
 * The timestamp must be in ISO 8601 format for consistency.
 * @returns The event metadata structure
 */
export interface EventMetadata {
  /** The type of state transition */
  event: TArtifactEvent;
  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;
  /** Who triggered the event (human or AI agent) */
  actor: string;
  /** What caused the event to trigger */
  trigger: TEventTrigger | string;
  /** Optional metadata for additional context */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Relationship Types
// ============================================================================

/**
 * Artifact relationship structure
 *
 * Defines dependency relationships between artifacts.
 * Used for tracking work dependencies and ensuring proper sequencing.
 * @returns The artifact relationship structure
 */
export interface RelationshipsMetadata {
  /** Artifact IDs that this artifact blocks */
  blocks: string[];
  /** Artifact IDs that block this artifact */
  blocked_by: string[];
}

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * Base metadata for all artifacts
 *
 * Common metadata structure shared across initiatives, milestones, and issues.
 * Ensures consistency and enables uniform processing of all artifact types.
 *
 * @remarks
 * - All fields are required to maintain data integrity
 * - Schema version enables future migrations
 * - Events array must contain at least one event (typically 'draft')
 * @returns The base metadata for all artifacts
 */
export interface ArtifactMetadata {
  /** Human-readable title */
  title: string;
  /** Importance level for prioritization */
  priority: TPriority;
  /** Effort estimation */
  estimation: TEstimationSize;
  /** Who created the artifact */
  created_by: string;
  /** Who is responsible for the artifact */
  assignee: string;
  /** Version for schema migration support */
  schema_version: string;
  /** Dependency relationships */
  relationships: RelationshipsMetadata;
  /** Immutable event log */
  events: EventMetadata[];
}

/**
 * Base artifact structure
 *
 * The minimal structure shared by all artifact types.
 * Extended by specific artifact types with their content.
 * @returns The base artifact structure
 */
export interface BaseArtifact {
  /** Common metadata */
  metadata: ArtifactMetadata;
  /** Optional notes for additional context */
  notes?: string;
}

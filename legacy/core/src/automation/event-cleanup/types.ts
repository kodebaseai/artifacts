/**
 * Types for Event Cleanup and Deduplication
 */

import type { EventMetadata, TArtifactEvent } from '../../data/types';

/**
 * Information about a duplicate event
 */
export interface DuplicateEvent {
  /** Index of the original event (kept) */
  originalIndex: number;
  /** Index of the duplicate event (removed) */
  duplicateIndex: number;
  /** The duplicate event that was removed */
  event: EventMetadata;
  /** Reason for considering it a duplicate */
  reason: string;
}

/**
 * Information about an orphaned event
 */
export interface OrphanedEvent {
  /** Index of the orphaned event */
  index: number;
  /** The orphaned event */
  event: EventMetadata;
  /** Reason why it's considered orphaned */
  reason: string;
}

/**
 * Information about a state consistency violation
 */
export interface StateConsistencyViolation {
  /** The state that has multiple events */
  state: TArtifactEvent;
  /** Indices of all events for this state */
  eventIndices: number[];
  /** Events for this state */
  events: EventMetadata[];
  /** Index of the event that was kept */
  keptIndex: number;
  /** Indices of events that were removed */
  removedIndices: number[];
}

/**
 * Result of event deduplication process
 */
export interface EventDeduplicationResult {
  /** Whether any duplicates were found and removed */
  hadDuplicates: boolean;
  /** Number of duplicate events removed */
  duplicatesRemoved: number;
  /** Details about each duplicate removed */
  duplicates: DuplicateEvent[];
  /** The cleaned events array */
  cleanedEvents: EventMetadata[];
  /** Summary of what was done */
  summary: string;
}

/**
 * Result of orphaned event cleanup
 */
export interface OrphanedEventCleanupResult {
  /** Whether any orphaned events were found and removed */
  hadOrphans: boolean;
  /** Number of orphaned events removed */
  orphansRemoved: number;
  /** Details about each orphaned event removed */
  orphans: OrphanedEvent[];
  /** The cleaned events array */
  cleanedEvents: EventMetadata[];
  /** Summary of what was done */
  summary: string;
}

/**
 * Result of state consistency enforcement
 */
export interface StateConsistencyResult {
  /** Whether any violations were found and fixed */
  hadViolations: boolean;
  /** Number of violations fixed */
  violationsFixed: number;
  /** Details about each violation fixed */
  violations: StateConsistencyViolation[];
  /** The cleaned events array */
  cleanedEvents: EventMetadata[];
  /** Summary of what was done */
  summary: string;
}

/**
 * Complete cleanup result combining all operations
 */
export interface EventCleanupResult {
  /** Whether any issues were found and fixed */
  hadIssues: boolean;
  /** Deduplication results */
  deduplication: EventDeduplicationResult;
  /** Orphaned event cleanup results */
  orphanedCleanup: OrphanedEventCleanupResult;
  /** State consistency results */
  stateConsistency: StateConsistencyResult;
  /** Final cleaned events array */
  finalEvents: EventMetadata[];
  /** Overall summary */
  overallSummary: string;
  /** Time taken for cleanup (milliseconds) */
  processingTimeMs: number;
}

/**
 * Options for event cleanup operations
 */
export interface EventCleanupOptions {
  /** Whether to remove duplicate events */
  removeDuplicates?: boolean;
  /** Whether to clean up orphaned events */
  cleanupOrphans?: boolean;
  /** Whether to enforce state consistency */
  enforceStateConsistency?: boolean;
  /** Time tolerance for considering events simultaneous (ms) */
  simultaneousTimeTolerance?: number;
  /** Whether to preserve manual corrections */
  preserveManualCorrections?: boolean;
  /** Custom actor patterns to preserve */
  preserveActorPatterns?: string[];
}

/**
 * Criteria for identifying duplicate events
 */
export interface DuplicationCriteria {
  /** Whether to check timestamp similarity */
  checkTimestamp: boolean;
  /** Whether to check event type */
  checkEventType: boolean;
  /** Whether to check actor */
  checkActor: boolean;
  /** Time tolerance for timestamp comparison (ms) */
  timestampTolerance?: number;
}

export const SimultaneousEvents = {
  KEEP_FIRST: 'keep-first',
  KEEP_LAST: 'keep-last',
  KEEP_ALL: 'keep-all',
} as const;
export const SIMULTANEOUS_EVENTS = Object.values(SimultaneousEvents);
export type SimultaneousEvents = (typeof SIMULTANEOUS_EVENTS)[number];

export const ManualCorrections = {
  PRESERVE: 'preserve',
  APPLY_RULES: 'apply-rules',
} as const;
export const MANUAL_CORRECTIONS = Object.values(ManualCorrections);
export type ManualCorrections = (typeof MANUAL_CORRECTIONS)[number];

/**
 * Configuration for edge case handling
 */
export interface EdgeCaseConfig {
  /** How to handle simultaneous events */
  simultaneousEvents: SimultaneousEvents;
  /** How to handle manual corrections */
  manualCorrections: 'preserve' | 'apply-rules';
  /** Pattern to identify manual corrections */
  manualCorrectionPattern?: RegExp;
  /** Pattern to identify system actors */
  systemActorPattern?: RegExp;
}

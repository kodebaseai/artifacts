/**
 * Event Cleanup and Deduplication Module
 *
 * Provides utilities to detect and remove duplicate events, validate event
 * ordering, ensure single state consistency, and clean up orphaned events.
 *
 * Addresses FP-006: Prevents 25% of event-related errors through automated
 * cleanup and validation.
 */

// Export everything except validateEventSequence from cleanup
export {
  cleanupEvents,
  cleanupOrphanedEvents,
  detectOrphanedEvents,
  detectStateConsistencyViolations,
  enforceStateConsistency,
} from './cleanup';

// Export all from other modules
export * from './deduplication';
export * from './reporting';
export * from './types';

// Export validation utilities including validateEventSequence
export * from './validation';

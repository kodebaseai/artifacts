/**
 * @kodebase/core - Core TypeScript package for Kodebase artifact management
 *
 * @module @kodebase/core
 * @description The foundational TypeScript package for the Kodebase methodology.
 * Provides types, schemas, parsing, validation, and automation for Kodebase artifacts
 * (Initiatives, Milestones, and Issues).
 *
 * @example
 * ```typescript
 * import { ArtifactParser, createEvent, formatActor } from '@kodebase/core';
 *
 * // Parse existing YAML
 * const parser = new ArtifactParser();
 * const issue = parser.parseIssue(yamlContent);
 *
 * // Add new event
 * issue.metadata.events.push(
 *   createEvent({
 *     event: 'ready',
 *     actor: formatActor('John Doe', 'john@example.com')
 *   })
 * );
 * ```
 */

// Export metrics
export * from './analytics/metrics';
// Export batch operations
export * from './automation/batch';
// Export cascade engine
export * from './automation/cascade';
// Export event system utilities
export * from './automation/events';
// Export artifact factory
export * from './automation/factory/factory-exports';
// Export relationship management
export * from './automation/relationships';
// Export event validation
export * from './automation/validation';
// Export parser
export { ArtifactParser } from './data/parser';
// Export all schemas
export * from './data/schemas';
// Export all types
export * from './data/types';
// Export validators and error formatting utilities
export {
  ArtifactValidator,
  type FormattedValidationError,
  formatValidationErrors,
  getValidationErrorDetails,
} from './data/validator';
// Export query system
export * from './query';
// Export utilities
export * from './utils';
// Export validation engine
export * from './validation';

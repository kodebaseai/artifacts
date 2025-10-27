/**
 * Artifact Factory Exports
 *
 * Public API exports for the artifact factory system.
 * Provides factory class, types, and utilities for creating artifacts.
 */

// Export utility functions (advanced usage)
export {
  createFactoryContext,
  generateInitiativeId,
  generateIssueId,
  generateMilestoneId,
  validateIdUnique,
  validateParentExists,
} from './id-generator';
// Export main factory class
export { ArtifactFactory } from './index';
// Export types and interfaces
export type {
  BaseFactoryOptions,
  CreateInitiativeOptions,
  CreateIssueOptions,
  CreateMilestoneOptions,
  FactoryContext,
  FactoryResult,
  UserInfo,
} from './types';
// Export error classes
export { DuplicateIdError, ParentNotFoundError } from './types';

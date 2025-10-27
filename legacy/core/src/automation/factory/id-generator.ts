/**
 * ID Generation Utilities for Artifact Factory
 *
 * Generates sequential IDs following the Kodebase conventions:
 * - Initiatives: A, B, C, D, ...
 * - Milestones: A.1, A.2, B.1, B.2, ...
 * - Issues: A.1.1, A.1.2, A.2.1, B.1.1, ...
 */

import type { FactoryContext } from './types';

/**
 * Generates the next Initiative ID (A, B, C, ...)
 *
 * @param context - Factory context with existing IDs
 * @returns Next available initiative ID
 * @example
 * // If A, B exist, returns 'C'
 * const id = generateInitiativeId(context); // 'C'
 */
export function generateInitiativeId(context: FactoryContext): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Find all existing initiative IDs (single letters)
  const _existingInitiatives = Array.from(context.existingIds)
    .filter((id) => /^[A-Z]$/.test(id))
    .sort();

  // Find the first available letter
  for (let i = 0; i < letters.length; i++) {
    const candidate = letters[i];
    if (candidate && !context.existingIds.has(candidate)) {
      return candidate;
    }
  }

  // If all single letters are taken, throw error
  // In practice, this would be extremely rare
  throw new Error('All initiative IDs (A-Z) are already in use');
}

/**
 * Generates the next Milestone ID (parent.1, parent.2, ...)
 *
 * @param parentInitiativeId - The parent initiative ID (e.g., 'A')
 * @param context - Factory context with existing IDs
 * @returns Next available milestone ID
 * @example
 * // If A.1, A.2 exist under initiative A, returns 'A.3'
 * const id = generateMilestoneId('A', context); // 'A.3'
 */
export function generateMilestoneId(
  parentInitiativeId: string,
  context: FactoryContext,
): string {
  // Validate parent ID format
  if (!/^[A-Z]$/.test(parentInitiativeId)) {
    throw new Error(
      `Invalid initiative ID format: ${parentInitiativeId}. Expected single letter A-Z.`,
    );
  }

  // Find existing milestones under this initiative
  const milestonePattern = new RegExp(`^${parentInitiativeId}\\.(\\d+)$`);
  const existingNumbers = Array.from(context.existingIds)
    .map((id) => {
      const match = id.match(milestonePattern);
      return match?.[1] ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0)
    .sort((a, b) => a - b);

  // Find the next sequential number
  let nextNumber = 1;
  for (const num of existingNumbers) {
    if (num === nextNumber) {
      nextNumber++;
    } else {
      break;
    }
  }

  return `${parentInitiativeId}.${nextNumber}`;
}

/**
 * Generates the next Issue ID (milestone.1, milestone.2, ...)
 *
 * @param parentMilestoneId - The parent milestone ID (e.g., 'A.1')
 * @param context - Factory context with existing IDs
 * @returns Next available issue ID
 * @example
 * // If A.1.1, A.1.2 exist under milestone A.1, returns 'A.1.3'
 * const id = generateIssueId('A.1', context); // 'A.1.3'
 */
export function generateIssueId(
  parentMilestoneId: string,
  context: FactoryContext,
): string {
  // Validate parent ID format
  if (!/^[A-Z]\.\d+$/.test(parentMilestoneId)) {
    throw new Error(
      `Invalid milestone ID format: ${parentMilestoneId}. Expected format: A.1, B.2, etc.`,
    );
  }

  // Find existing issues under this milestone
  const issuePattern = new RegExp(
    `^${parentMilestoneId.replace('.', '\\.')}\\.(\\d+)$`,
  );
  const existingNumbers = Array.from(context.existingIds)
    .map((id) => {
      const match = id.match(issuePattern);
      return match?.[1] ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0)
    .sort((a, b) => a - b);

  // Find the next sequential number
  let nextNumber = 1;
  for (const num of existingNumbers) {
    if (num === nextNumber) {
      nextNumber++;
    } else {
      break;
    }
  }

  return `${parentMilestoneId}.${nextNumber}`;
}

/**
 * Validates that a parent artifact exists in the context
 *
 * @param parentId - The parent artifact ID to validate
 * @param context - Factory context with existing IDs
 * @param parentType - Type of parent for error messages
 * @throws ParentNotFoundError if parent doesn't exist
 */
export function validateParentExists(
  parentId: string,
  context: FactoryContext,
  parentType: string,
): void {
  if (!context.existingIds.has(parentId)) {
    throw new Error(
      `Parent ${parentType} '${parentId}' not found. Parent must exist before creating children.`,
    );
  }
}

/**
 * Validates that an ID doesn't already exist
 *
 * @param id - The ID to validate
 * @param context - Factory context with existing IDs
 * @throws DuplicateIdError if ID already exists
 */
export function validateIdUnique(id: string, context: FactoryContext): void {
  if (context.existingIds.has(id)) {
    throw new Error(`Artifact ID '${id}' already exists. IDs must be unique.`);
  }
}

/**
 * Creates a factory context from a list of existing artifacts
 *
 * @param existingArtifacts - Map of ID to artifact for existing artifacts
 * @returns Factory context for ID generation
 */
export function createFactoryContext(
  existingArtifacts: Map<string, unknown>,
): FactoryContext {
  const existingIds = new Set(existingArtifacts.keys());
  const initiativeMilestoneCount = new Map<string, number>();
  const milestoneIssueCount = new Map<string, number>();

  // Count milestones per initiative and issues per milestone
  for (const id of existingIds) {
    // Count milestones under initiatives (A.1, A.2 under A)
    const milestoneMatch = id.match(/^([A-Z])\.(\d+)$/);
    if (milestoneMatch?.[1] && milestoneMatch[2]) {
      const initiativeId = milestoneMatch[1];
      const milestoneNumber = parseInt(milestoneMatch[2], 10);
      // Ignore zero values as they're not valid milestone numbers
      if (milestoneNumber > 0) {
        const currentCount = initiativeMilestoneCount.get(initiativeId) || 0;
        initiativeMilestoneCount.set(
          initiativeId,
          Math.max(currentCount, milestoneNumber),
        );
      }
    }

    // Count issues under milestones (A.1.1, A.1.2 under A.1)
    const issueMatch = id.match(/^([A-Z]\.\d+)\.(\d+)$/);
    if (issueMatch?.[1] && issueMatch[2]) {
      const milestoneId = issueMatch[1];
      const issueNumber = parseInt(issueMatch[2], 10);
      // Ignore zero values as they're not valid issue numbers
      if (issueNumber > 0) {
        const currentCount = milestoneIssueCount.get(milestoneId) || 0;
        milestoneIssueCount.set(
          milestoneId,
          Math.max(currentCount, issueNumber),
        );
      }
    }
  }

  return {
    existingIds,
    initiativeMilestoneCount,
    milestoneIssueCount,
  };
}

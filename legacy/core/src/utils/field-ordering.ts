/**
 * Field ordering utilities for Kodebase artifacts
 *
 * Ensures consistent field ordering across all artifact types.
 * Critical for maintaining readable git diffs and predictable structure.
 * @module @kodebase/core/utils/field-ordering
 */

import type { ArtifactType } from '../data/types';
import { CArtifact } from '../data/types/constants';

/**
 * Standard field order for artifact metadata section
 */
export const METADATA_FIELD_ORDER = [
  'title',
  'priority',
  'estimation',
  'created_by',
  'assignee',
  'schema_version',
  'relationships',
  'events',
] as const;

/**
 * Standard field order for artifact relationships
 */
export const RELATIONSHIPS_FIELD_ORDER = ['blocks', 'blocked_by'] as const;

/**
 * Standard field order for artifact events (v2.0 schema)
 */
export const EVENT_FIELD_ORDER = [
  'event',
  'timestamp',
  'actor',
  'trigger',
  'metadata',
] as const;

/**
 * Standard field order for artifact content section (issues)
 */
export const ISSUE_CONTENT_FIELD_ORDER = [
  'summary',
  'description',
  'acceptance_criteria',
  'development_process',
  'completion_analysis',
  'notes',
] as const;

/**
 * Standard field order for artifact content section (milestones)
 */
export const MILESTONE_CONTENT_FIELD_ORDER = [
  'summary',
  'deliverables',
  'validation',
  'notes',
] as const;

/**
 * Standard field order for artifact content section (initiatives)
 */
export const INITIATIVE_CONTENT_FIELD_ORDER = [
  'vision',
  'scope',
  'success_criteria',
  'notes',
] as const;

/**
 * Standard field order for top-level artifact structure
 */
export const ARTIFACT_FIELD_ORDER = ['metadata', 'content'] as const;

/**
 * Orders fields in an object according to a specified order
 *
 * @param obj - The object to reorder
 * @param fieldOrder - Array of field names in desired order
 * @returns New object with fields in specified order
 * @example
 * const ordered = orderFields({ b: 2, a: 1 }, ['a', 'b']);
 * // Returns: { a: 1, b: 2 }
 */
export function orderFields<T extends Record<string, unknown>>(
  obj: T,
  fieldOrder: readonly string[],
): T {
  const ordered: Record<string, unknown> = {};

  // First, add fields in the specified order
  for (const field of fieldOrder) {
    if (field in obj) {
      ordered[field] = obj[field];
    }
  }

  // Then add any remaining fields not in the order list
  for (const field in obj) {
    if (!(field in ordered)) {
      ordered[field] = obj[field];
    }
  }

  return ordered as T;
}

/**
 * Orders all fields in an artifact according to standard conventions
 *
 * @param artifact - The artifact object to order
 * @param type - The artifact type ('issue', 'milestone', or 'initiative')
 * @returns New artifact object with all fields properly ordered
 * @example
 * const orderedArtifact = orderArtifactFields(artifact, 'issue');
 */
export function orderArtifactFields(
  artifact: Record<string, unknown>,
  type: ArtifactType,
): Record<string, unknown> {
  // Order top-level fields
  const ordered = orderFields(artifact, ARTIFACT_FIELD_ORDER);

  // Order metadata fields
  if (ordered.metadata && typeof ordered.metadata === 'object') {
    const metadata = ordered.metadata as Record<string, unknown>;
    ordered.metadata = orderFields(metadata, METADATA_FIELD_ORDER);

    // Order relationships if present
    if (metadata.relationships && typeof metadata.relationships === 'object') {
      const relationships = metadata.relationships as Record<string, unknown>;
      (ordered.metadata as Record<string, unknown>).relationships = orderFields(
        relationships,
        RELATIONSHIPS_FIELD_ORDER,
      );
    }

    // Order events if present
    if (Array.isArray(metadata.events)) {
      (ordered.metadata as Record<string, unknown>).events =
        metadata.events.map((event: Record<string, unknown>) =>
          orderFields(event, EVENT_FIELD_ORDER),
        );
    }
  }

  // Order content fields based on artifact type
  if (ordered.content && typeof ordered.content === 'object') {
    const content = ordered.content as Record<string, unknown>;
    let contentFieldOrder: readonly string[];

    switch (type) {
      case CArtifact.ISSUE:
        contentFieldOrder = ISSUE_CONTENT_FIELD_ORDER;
        break;
      case CArtifact.MILESTONE:
        contentFieldOrder = MILESTONE_CONTENT_FIELD_ORDER;
        break;
      case CArtifact.INITIATIVE:
        contentFieldOrder = INITIATIVE_CONTENT_FIELD_ORDER;
        break;
    }

    ordered.content = orderFields(content, contentFieldOrder);
  }

  return ordered;
}

/**
 * Detects the artifact type from its ID
 *
 * @param artifactId - The artifact ID (e.g., 'A.1.5', 'B.2', 'C')
 * @returns The artifact type
 * @example
 * detectArtifactType('A.1.5'); // 'issue'
 * detectArtifactType('B.2');   // 'milestone'
 * detectArtifactType('C');     // 'initiative'
 */
export function detectArtifactType(artifactId: string): ArtifactType {
  const parts = artifactId.split('.');
  if (parts.length === 3) return CArtifact.ISSUE;
  if (parts.length === 2) return CArtifact.MILESTONE;
  return CArtifact.INITIATIVE;
}

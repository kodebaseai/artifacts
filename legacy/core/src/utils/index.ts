/**
 * Utilities for Kodebase artifacts
 *
 * This module provides common utilities for working with Kodebase artifacts:
 * - Timestamp formatting and parsing
 * - Actor formatting and parsing
 * - YAML formatting with structure preservation
 * - Field ordering for consistent artifact structure
 * - Smart diffing for readable git history
 */

// Export actor utilities
export {
  type ActorInfo,
  formatActor,
  isValidActor,
  parseActor,
} from './actor';

// Export field ordering utilities
export {
  ARTIFACT_FIELD_ORDER,
  detectArtifactType,
  EVENT_FIELD_ORDER,
  INITIATIVE_CONTENT_FIELD_ORDER,
  ISSUE_CONTENT_FIELD_ORDER,
  METADATA_FIELD_ORDER,
  MILESTONE_CONTENT_FIELD_ORDER,
  orderArtifactFields,
  orderFields,
  RELATIONSHIPS_FIELD_ORDER,
} from './field-ordering';

// Export smart diff utilities
export {
  describeChange,
  formatArtifactForDiff,
  formatForDiff,
  type SmartDiffOptions,
  summarizeArtifactChanges,
} from './smart-diff';

// Export timestamp utilities
export {
  formatTimestamp,
  isValidTimestamp,
  parseTimestamp,
} from './timestamp';

// Export YAML formatting utilities
export {
  formatYaml,
  formatYamlWithFieldOrder,
  isValidYaml,
  parseYaml,
  type YamlFormatOptions,
} from './yaml-formatter';

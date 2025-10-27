#!/usr/bin/env node

/**
 * Schema validation script
 *
 * Usage:
 *   ts-node validate-schema.ts path/to/artifact.yml
 *   ts-node validate-schema.ts --schema-version 2 path/to/artifact.yml
 */

import * as fs from 'node:fs';
import { parse } from 'yaml';
import {
  ARTIFACT_EVENTS,
  type CEstimationSize,
  type CPriority,
  ESTIMATION_SIZES,
  PRIORITIES,
} from '../../src/types/constants';

// Type for parsed artifact structure
interface ParsedArtifact {
  metadata?: {
    schema_version?: string;
    title?: string;
    priority?: string;
    estimation?: string;
    created_by?: string;
    assignee?: string;
    relationships?: {
      blocks?: string[];
      blocked_by?: string[];
    };
    events?: Array<{
      timestamp?: string;
      event?: string;
      actor?: string;
      event_id?: string;
      correlation_id?: string;
      metadata?: {
        correlation_id?: string;
        parent_event_id?: string | null;
        [key: string]: unknown;
      };
    }>;
    [key: string]: unknown;
  };
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

// Define schema versions with their specific rules
const SCHEMA_V1 = '0.1.0';
const SCHEMA_V2 = '2.0.0';

// Validation rules for each schema version
const validationRules = {
  [SCHEMA_V1]: {
    requiredMetadataFields: [
      'title',
      'priority',
      'estimation',
      'created_by',
      'assignee',
      'schema_version',
      'relationships',
      'events',
    ],
    requiredEventFields: ['timestamp', 'event', 'actor'],
    validEvents: ARTIFACT_EVENTS,
    validPriorities: PRIORITIES,
    validEstimations: ESTIMATION_SIZES,
  },
  [SCHEMA_V2]: {
    requiredMetadataFields: [
      'title',
      'priority',
      'estimation',
      'created_by',
      'assignee',
      'schema_version',
      'events', // relationships is optional in v2
    ],
    requiredEventFields: ['timestamp', 'event', 'actor'],
    validEvents: ARTIFACT_EVENTS,
    validPriorities: PRIORITIES,
    validEstimations: ESTIMATION_SIZES,
  },
};

// Parse arguments
const args = process.argv.slice(2);
const schemaVersionIndex = args.indexOf('--schema-version');
const requestedVersion =
  schemaVersionIndex !== -1 ? args[schemaVersionIndex + 1] : null;
const filePath = args.find(
  (arg) => !arg.startsWith('--') && arg !== requestedVersion,
);

if (!filePath) {
  console.error(
    'Usage: ts-node validate-schema.ts [--schema-version 2] path/to/artifact.yml',
  );
  process.exit(1);
}

// Read artifact
let artifact: ParsedArtifact;
try {
  const content = fs.readFileSync(filePath, 'utf8');
  artifact = parse(content);
} catch (error) {
  console.error(
    `❌ Error reading file: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

// Detect schema version
function detectSchemaVersion(artifact: ParsedArtifact): string {
  const declared = artifact.metadata?.schema_version;
  if (declared) return declared;

  // Heuristics for v1.0.0
  if (artifact.metadata?.events?.some((e) => e.event_id || e.correlation_id)) {
    return SCHEMA_V1;
  }

  // Default to v2.0.0 for new files
  return SCHEMA_V2;
}

const detectedVersion = detectSchemaVersion(artifact);
const schemaVersion = requestedVersion || detectedVersion;

console.log(`📋 Validating ${filePath}`);
console.log(
  `📌 Schema version: ${schemaVersion} ${requestedVersion ? '(forced)' : '(detected)'}`,
);

// Normalize version for rules lookup
const rulesKey =
  schemaVersion === '1' || schemaVersion === '1.0.0' ? SCHEMA_V1 : SCHEMA_V2;
const rules = validationRules[rulesKey] || validationRules[SCHEMA_V2];
const errors: string[] = [];
const warnings: string[] = [];

// Validate metadata
if (!artifact.metadata) {
  errors.push('Missing required "metadata" section');
} else {
  // Check required fields
  rules.requiredMetadataFields.forEach((field) => {
    // biome-ignore lint/style/noNonNullAssertion: we check for the field in the metadata object line 147
    if (!(field in artifact.metadata!)) {
      // Relationships is optional in v2
      if (field === 'relationships' && rulesKey === SCHEMA_V2) {
        return; // Skip
      }
      errors.push(`Missing required metadata.${field}`);
    }
  });

  // Validate priority
  if (
    artifact.metadata?.priority &&
    !rules.validPriorities.includes(
      artifact.metadata?.priority as (typeof CPriority)[keyof typeof CPriority],
    )
  ) {
    errors.push(
      `Invalid priority: ${artifact.metadata?.priority}. Must be one of: ${rules.validPriorities.join(', ')}`,
    );
  }

  // Validate estimation
  if (
    artifact.metadata?.estimation &&
    !rules.validEstimations.includes(
      artifact.metadata
        ?.estimation as (typeof CEstimationSize)[keyof typeof CEstimationSize],
    )
  ) {
    errors.push(
      `Invalid estimation: ${artifact.metadata?.estimation}. Must be one of: ${rules.validEstimations.join(', ')}`,
    );
  }

  // Validate events
  if (artifact.metadata?.events) {
    artifact.metadata?.events.forEach((event, index) => {
      rules.requiredEventFields.forEach((field) => {
        if (!(field in event)) {
          errors.push(`Missing required field in event[${index}].${field}`);
        }
      });

      if (
        event.event &&
        !rules.validEvents.some((validEvent) => validEvent === event.event)
      ) {
        errors.push(`Invalid event type in event[${index}]: ${event.event}`);
      }

      // Check for deprecated fields in v2
      if (rulesKey === SCHEMA_V2) {
        [
          'event_id',
          'correlation_id',
          'parent_event_id',
          'commit_hash',
        ].forEach((field) => {
          if (field in event) {
            warnings.push(
              `Deprecated field in event[${index}].${field} - should be removed in v2`,
            );
          }
        });
      }
    });
  }
}

// Validate content section
if (!artifact.content) {
  errors.push('Missing required "content" section');
} else {
  // Check for required content fields based on artifact type
  if (
    artifact.content.summary === undefined ||
    artifact.content.summary === ''
  ) {
    errors.push('Missing required content.summary');
  }

  // Issue-specific validation
  if (artifact.content.acceptance_criteria !== undefined) {
    if (
      !Array.isArray(artifact.content.acceptance_criteria) ||
      artifact.content.acceptance_criteria.length === 0
    ) {
      errors.push('Issues must have at least one acceptance criterion');
    }
  }

  // Milestone-specific validation
  if (artifact.content.deliverables !== undefined) {
    if (
      !Array.isArray(artifact.content.deliverables) ||
      artifact.content.deliverables.length === 0
    ) {
      errors.push('Milestones must have at least one deliverable');
    }
  }

  // Initiative-specific validation
  if (artifact.content.vision !== undefined) {
    if (!artifact.content.scope) {
      errors.push('Initiatives must have a scope');
    }
    if (
      !artifact.content.success_criteria ||
      (Array.isArray(artifact.content.success_criteria) &&
        artifact.content.success_criteria.length === 0)
    ) {
      errors.push('Initiatives must have at least one success criterion');
    }
  }
}

// Check for deprecated fields
if (rulesKey === SCHEMA_V2) {
  if (artifact.technical_approach) {
    warnings.push(
      'Deprecated field "technical_approach" - move to completion_analysis.implementation_approach',
    );
  }
  if (artifact.issue_breakdown_rationale) {
    warnings.push(
      'Deprecated field "issue_breakdown_rationale" - this field is no longer used',
    );
  }
}

// Report results
console.log('\n📊 Validation Results:');
console.log('====================');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Valid artifact! No issues found.');
} else {
  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach((error) => console.log(`   • ${error}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach((warning) => console.log(`   • ${warning}`));
  }

  console.log('\n💡 Run migration script to fix most issues:');
  console.log(`   ts-node migrate-v1-to-v2.ts ${filePath}`);
}

// Exit with error code if validation failed
process.exit(errors.length > 0 ? 1 : 0);

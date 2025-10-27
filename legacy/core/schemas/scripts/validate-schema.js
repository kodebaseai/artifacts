#!/usr/bin/env node

/**
 * Schema validation script
 *
 * Usage:
 *   node validate-schema.js path/to/artifact.yml
 *   node validate-schema.js --schema-version 2 path/to/artifact.yml
 */

const fs = require('node:fs');
const { parse } = require('yaml');

// Simple validation rules (in real implementation, use JSON Schema validator)
const validationRules = {
  '1.0.0': {
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
    validEvents: [
      'draft',
      'ready',
      'blocked',
      'cancelled',
      'in_progress',
      'in_review',
      'completed',
      'archived',
    ],
    validPriorities: ['critical', 'high', 'medium', 'low'],
    validEstimations: ['XS', 'S', 'M', 'L', 'XL'],
  },
  '2.0.0': {
    requiredMetadataFields: [
      'title',
      'priority',
      'estimation',
      'created_by',
      'assignee',
      'schema_version',
      'events',
    ],
    requiredEventFields: ['timestamp', 'event', 'actor'],
    validEvents: [
      'draft',
      'ready',
      'blocked',
      'cancelled',
      'in_progress',
      'in_review',
      'completed',
      'archived',
    ],
    validPriorities: ['critical', 'high', 'medium', 'low'],
    validEstimations: ['XS', 'S', 'M', 'L', 'XL'],
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
    'Usage: node validate-schema.js [--schema-version 2] path/to/artifact.yml',
  );
  process.exit(1);
}

// Read artifact
let artifact;
try {
  const content = fs.readFileSync(filePath, 'utf8');
  artifact = parse(content);
} catch (error) {
  console.error(`❌ Error reading file: ${error.message}`);
  process.exit(1);
}

// Detect schema version
function detectSchemaVersion(artifact) {
  const declared = artifact.metadata?.schema_version;
  if (declared) return declared;

  // Heuristics for v1.0.0
  if (artifact.metadata?.events?.some((e) => e.event_id || e.correlation_id)) {
    return '1.0.0';
  }

  // Default to v2.0.0 for new files
  return '2.0.0';
}

const detectedVersion = detectSchemaVersion(artifact);
const schemaVersion = requestedVersion || detectedVersion;

console.log(`📋 Validating ${filePath}`);
console.log(
  `📌 Schema version: ${schemaVersion} ${requestedVersion ? '(forced)' : '(detected)'}`,
);

const rules = validationRules[schemaVersion] || validationRules['2.0.0'];
const errors = [];
const warnings = [];

// Validate metadata
if (!artifact.metadata) {
  errors.push('Missing required "metadata" section');
} else {
  // Check required fields
  rules.requiredMetadataFields.forEach((field) => {
    if (!(field in artifact.metadata)) {
      // Relationships is optional in v2
      if (field === 'relationships' && schemaVersion === '2.0.0') {
        return; // Skip
      }
      errors.push(`Missing required metadata.${field}`);
    }
  });

  // Validate priority
  if (
    artifact.metadata.priority &&
    !rules.validPriorities.includes(artifact.metadata.priority)
  ) {
    errors.push(
      `Invalid priority: ${artifact.metadata.priority}. Must be one of: ${rules.validPriorities.join(', ')}`,
    );
  }

  // Validate estimation
  if (
    artifact.metadata.estimation &&
    !rules.validEstimations.includes(artifact.metadata.estimation)
  ) {
    errors.push(
      `Invalid estimation: ${artifact.metadata.estimation}. Must be one of: ${rules.validEstimations.join(', ')}`,
    );
  }

  // Validate events
  if (artifact.metadata.events) {
    artifact.metadata.events.forEach((event, index) => {
      rules.requiredEventFields.forEach((field) => {
        if (!(field in event)) {
          errors.push(`Missing required field in event[${index}].${field}`);
        }
      });

      if (event.event && !rules.validEvents.includes(event.event)) {
        errors.push(`Invalid event type in event[${index}]: ${event.event}`);
      }

      // Check for deprecated fields in v2
      if (schemaVersion === '2.0.0') {
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
      artifact.content.success_criteria.length === 0
    ) {
      errors.push('Initiatives must have at least one success criterion');
    }
  }
}

// Check for deprecated fields
if (schemaVersion === '2.0.0') {
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
  console.log(`   node migrate-v1-to-v2.js ${filePath}`);
}

// Exit with error code if validation failed
process.exit(errors.length > 0 ? 1 : 0);

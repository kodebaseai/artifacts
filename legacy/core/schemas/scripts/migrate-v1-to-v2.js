#!/usr/bin/env node

/**
 * Migration script: v1.0 to v2.0 schemas
 *
 * Usage:
 *   node migrate-v1-to-v2.js path/to/artifact.yml
 *   node migrate-v1-to-v2.js --dry-run path/to/artifact.yml
 */

const fs = require('node:fs');
const { parse, stringify } = require('yaml');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const filePath = args.find((arg) => !arg.startsWith('--'));

if (!filePath) {
  console.error(
    'Usage: node migrate-v1-to-v2.js [--dry-run] path/to/artifact.yml',
  );
  process.exit(1);
}

// Read and parse the artifact
let artifact;
try {
  const content = fs.readFileSync(filePath, 'utf8');
  artifact = parse(content);
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}

// Check if already v2
if (artifact.metadata?.schema_version === '2.0.0') {
  console.log('✅ Artifact is already using schema v2.0.0');
  process.exit(0);
}

console.log(
  `🔄 Migrating ${filePath} from v${artifact.metadata?.schema_version || '0.1.0'} to v2.0.0`,
);

// Perform migration
function migrateArtifact(artifact) {
  const migrated = JSON.parse(JSON.stringify(artifact)); // Deep clone

  // Update schema version
  if (migrated.metadata) {
    migrated.metadata.schema_version = '2.0.0';

    // Clean up events
    if (migrated.metadata.events) {
      migrated.metadata.events = migrated.metadata.events.map((event) => {
        // Remove deprecated fields
        delete event.event_id;
        delete event.correlation_id;
        delete event.parent_event_id;
        delete event.commit_hash;
        return event;
      });
    }

    // Make empty relationships optional
    if (migrated.metadata.relationships) {
      const { blocks, blocked_by } = migrated.metadata.relationships;
      if (
        (!blocks || blocks.length === 0) &&
        (!blocked_by || blocked_by.length === 0)
      ) {
        delete migrated.metadata.relationships;
      }
    }
  }

  // Handle deprecated technical_approach in issues
  if (migrated.technical_approach) {
    if (!migrated.completion_analysis) {
      migrated.completion_analysis = {};
    }
    migrated.completion_analysis.implementation_approach =
      migrated.technical_approach;
    delete migrated.technical_approach;
  }

  // Remove deprecated issue_breakdown_rationale in milestones
  if (migrated.issue_breakdown_rationale) {
    delete migrated.issue_breakdown_rationale;
  }

  // Remove empty optional sections
  const optionalSections = [
    'notes',
    'development_process',
    'completion_analysis',
    'completion_summary',
    'review_details',
  ];
  optionalSections.forEach((section) => {
    if (migrated[section] && Object.keys(migrated[section]).length === 0) {
      delete migrated[section];
    }
  });

  return migrated;
}

const migratedArtifact = migrateArtifact(artifact);

// Generate YAML with proper formatting
const yamlOptions = {
  lineWidth: -1, // Don't wrap lines
  noRefs: true,
  sortKeys: false,
};

const migratedYaml = stringify(migratedArtifact, yamlOptions);

if (dryRun) {
  console.log('\n📄 Preview of migrated artifact:');
  console.log('================================');
  console.log(migratedYaml);
  console.log('================================');
  console.log('\n✅ Dry run complete. Use without --dry-run to save changes.');
} else {
  // Backup original
  const backupPath = `${filePath}.v1.backup`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`📦 Created backup: ${backupPath}`);

  // Write migrated version
  fs.writeFileSync(filePath, migratedYaml);
  console.log(`✅ Migration complete: ${filePath}`);
  console.log(`💡 To rollback: mv ${backupPath} ${filePath}`);
}

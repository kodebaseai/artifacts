#!/usr/bin/env node

/**
 * Enhanced Migration Tool: Schema v0.1.0 to v0.2.0
 *
 * This migration adds the event identity system while providing comprehensive
 * backup, validation, rollback, and reporting capabilities.
 *
 * Usage:
 *   tsx migrate-v0.1-to-v0.2.ts <artifact-file.yml>
 *   tsx migrate-v0.1-to-v0.2.ts --dry-run <artifact-file.yml>
 *   tsx migrate-v0.1-to-v0.2.ts --all .kodebase/artifacts
 *   tsx migrate-v0.1-to-v0.2.ts --rollback <artifact-file.yml>
 *   tsx migrate-v0.1-to-v0.2.ts --rollback --all .kodebase/artifacts
 */

import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { parseDocument, type YAMLMap, type YAMLSeq } from 'yaml';
import { generateEventId } from '../../src/automation/events/identity';

// Migration report types
interface FileChangeReport {
  filePath: string;
  status: 'migrated' | 'already_migrated' | 'skipped' | 'error' | 'rolled_back';
  eventsProcessed?: number;
  correlationId?: string;
  errorMessage?: string;
  backupCreated?: boolean;
  validationPassed?: boolean;
}

interface MigrationReport {
  summary: {
    totalFiles: number;
    migrated: number;
    alreadyMigrated: number;
    skipped: number;
    errors: number;
    rolledBack: number;
  };
  files: FileChangeReport[];
  startTime: string;
  endTime?: string;
}

// Global report tracking
const migrationReport: MigrationReport = {
  summary: {
    totalFiles: 0,
    migrated: 0,
    alreadyMigrated: 0,
    skipped: 0,
    errors: 0,
    rolledBack: 0,
  },
  files: [],
  startTime: new Date().toISOString(),
};

function validateArtifact(filePath: string): boolean {
  try {
    // Simple validation - could be enhanced to use the full validator
    const content = readFileSync(filePath, 'utf-8');
    const doc = parseDocument(content);

    // Check for required metadata structure
    const metadata = doc.get('metadata');
    if (!metadata) {
      console.error(`  ✗ Invalid: Missing metadata section`);
      return false;
    }

    // Check for required fields
    const requiredFields = [
      'title',
      'priority',
      'estimation',
      'created_by',
      'assignee',
      'schema_version',
      'events',
    ];
    for (const field of requiredFields) {
      if (!(metadata as YAMLMap).has(field)) {
        console.error(`  ✗ Invalid: Missing required field: ${field}`);
        return false;
      }
    }

    console.log(`  ✓ Validation passed`);
    return true;
  } catch (error) {
    console.error(
      `  ✗ Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

function createBackup(filePath: string): boolean {
  try {
    const backupPath = `${filePath}.v0.1.backup`;
    copyFileSync(filePath, backupPath);
    console.log(`  📦 Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(
      `  ✗ Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

function rollbackFile(filePath: string): FileChangeReport {
  const report: FileChangeReport = {
    filePath,
    status: 'error',
  };

  try {
    const backupPath = `${filePath}.v0.1.backup`;

    if (!existsSync(backupPath)) {
      report.errorMessage = 'No backup file found';
      console.error(`  ✗ No backup file found: ${backupPath}`);
      return report;
    }

    // Restore from backup
    copyFileSync(backupPath, filePath);
    console.log(`  ✓ Restored from backup: ${backupPath}`);

    // Clean up backup file
    unlinkSync(backupPath);
    console.log(`  🗑️  Removed backup file`);

    report.status = 'rolled_back';
    migrationReport.summary.rolledBack++;
  } catch (error) {
    report.errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Rollback failed: ${report.errorMessage}`);
    migrationReport.summary.errors++;
  }

  return report;
}

function processFile(
  filePath: string,
  dryRun: boolean = false,
): FileChangeReport {
  const report: FileChangeReport = {
    filePath,
    status: 'error',
  };

  console.log(`\nProcessing: ${filePath}`);

  try {
    // Pre-migration validation
    console.log(`  📋 Running pre-migration validation...`);
    const preValidationPassed = validateArtifact(filePath);

    if (!preValidationPassed) {
      report.status = 'skipped';
      report.errorMessage = 'Pre-migration validation failed';
      migrationReport.summary.skipped++;
      return report;
    }

    // Read file content
    const content = readFileSync(filePath, 'utf-8');

    // Parse using yaml package to preserve formatting
    const doc = parseDocument(content);

    // Check schema version
    const metadata = doc.get('metadata') as YAMLMap;
    const schemaVersion = metadata?.get('schema_version');
    if (schemaVersion === '0.2.0') {
      console.log('  ✓ Already migrated');
      report.status = 'already_migrated';
      migrationReport.summary.alreadyMigrated++;
      return report;
    }

    if (schemaVersion !== '0.1.0') {
      console.error(`  ✗ Not a v0.1.0 schema file (found ${schemaVersion})`);
      report.status = 'skipped';
      report.errorMessage = `Invalid schema version: ${schemaVersion}`;
      migrationReport.summary.skipped++;
      return report;
    }

    // Create backup before migration (unless dry run)
    if (!dryRun) {
      const backupCreated = createBackup(filePath);
      report.backupCreated = backupCreated;

      if (!backupCreated) {
        report.status = 'error';
        report.errorMessage = 'Failed to create backup';
        migrationReport.summary.errors++;
        return report;
      }
    }

    // Update schema version
    doc.setIn(['metadata', 'schema_version'], '0.2.0');

    // Get events array
    const eventsNode = doc.getIn(['metadata', 'events']) as YAMLSeq;
    if (!eventsNode || !eventsNode.items) {
      console.error('  ✗ No events array found');
      report.status = 'error';
      report.errorMessage = 'No events array found';
      migrationReport.summary.errors++;
      return report;
    }
    const events = eventsNode.items as YAMLMap[];

    // Generate event IDs for all events
    const eventIds = events.map(() => generateEventId());
    const correlationId = eventIds[0];
    report.correlationId = correlationId;
    report.eventsProcessed = events.length;

    // Process each event
    events.forEach((event, index) => {
      // Add event_id
      event.set('event_id', eventIds[index]);

      // Get or create metadata
      const eventMetadata = event.get('metadata') as YAMLMap | undefined;
      if (!eventMetadata) {
        // Create new metadata map
        event.set(
          'metadata',
          doc.createNode({
            correlation_id: correlationId,
            parent_event_id: null,
          }),
        );
      } else {
        // Add to existing metadata
        eventMetadata.set('correlation_id', correlationId);
        eventMetadata.set('parent_event_id', null);
      }
    });

    const migratedContent = doc.toString();

    if (dryRun) {
      console.log('  ✓ Would migrate (dry run)');
      console.log(`    - ${eventIds.length} events would get event_ids`);
      console.log(`    - Correlation ID: ${correlationId}`);
      report.status = 'migrated';
    } else {
      // Write migrated content
      writeFileSync(filePath, migratedContent);

      // Post-migration validation
      console.log(`  📋 Running post-migration validation...`);
      const postValidationPassed = validateArtifact(filePath);
      report.validationPassed = postValidationPassed;

      if (!postValidationPassed) {
        console.error(
          '  ⚠️  Post-migration validation failed, but migration completed',
        );
      }

      console.log('  ✓ Migration complete');
      console.log(`    - Added ${eventIds.length} event_ids`);
      console.log(`    - Correlation ID: ${correlationId}`);
      console.log(`    - Backup created: ${filePath}.v0.1.backup`);

      report.status = 'migrated';
      migrationReport.summary.migrated++;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Error: ${errorMessage}`);
    report.status = 'error';
    report.errorMessage = errorMessage;
    migrationReport.summary.errors++;
  }

  return report;
}

function findYamlFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.yml') && !entry.includes('.backup')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function printMigrationReport(): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60));

  const { summary } = migrationReport;
  console.log(`📂 Total files processed: ${summary.totalFiles}`);
  console.log(`✅ Successfully migrated: ${summary.migrated}`);
  console.log(`⏭️  Already migrated: ${summary.alreadyMigrated}`);
  console.log(`⏸️  Skipped: ${summary.skipped}`);
  console.log(`🔄 Rolled back: ${summary.rolledBack}`);
  console.log(`❌ Errors: ${summary.errors}`);

  if (migrationReport.files.length <= 10) {
    console.log('\n📋 Detailed Results:');
    migrationReport.files.forEach((file) => {
      const statusIcon = {
        migrated: '✅',
        already_migrated: '⏭️',
        skipped: '⏸️',
        rolled_back: '🔄',
        error: '❌',
      }[file.status];

      console.log(`  ${statusIcon} ${file.filePath}`);
      if (file.eventsProcessed) {
        console.log(
          `      Events: ${file.eventsProcessed}, Correlation: ${file.correlationId?.substring(0, 12)}...`,
        );
      }
      if (file.errorMessage) {
        console.log(`      Error: ${file.errorMessage}`);
      }
    });
  }

  console.log(
    `\n⏱️  Duration: ${migrationReport.startTime} → ${migrationReport.endTime}`,
  );
  console.log('='.repeat(60));
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const allMode = args.includes('--all');
  const rollbackMode = args.includes('--rollback');
  const paths = args.filter((arg) => !arg.startsWith('--'));

  if (paths.length === 0) {
    console.error(`
Enhanced Migration Tool: Schema v0.1.0 → v0.2.0

Usage:
  tsx migrate-v0.1-to-v0.2.ts <file.yml>                    # Migrate single file
  tsx migrate-v0.1-to-v0.2.ts --all .kodebase/artifacts    # Migrate all files in directory
  tsx migrate-v0.1-to-v0.2.ts --dry-run <file.yml>         # Preview changes without applying
  tsx migrate-v0.1-to-v0.2.ts --rollback <file.yml>        # Rollback single file
  tsx migrate-v0.1-to-v0.2.ts --rollback --all <dir>       # Rollback all files in directory

Features:
  ✅ Identifies all v0.1.0 artifacts
  ✅ Updates event structure to v0.2.0 schema
  ✅ Adds event_id, correlation_id, parent_event_id fields
  ✅ Validates before and after migration
  ✅ Creates .v0.1.backup files automatically
  ✅ Rollback command restores from backup
  ✅ Detailed migration report
  ✅ TypeScript types handle both schema versions
    `);
    process.exit(1);
  }

  console.log('🚀 Enhanced Schema Migration Tool v0.1.0 → v0.2.0');
  console.log(`📅 Started: ${migrationReport.startTime}`);

  if (rollbackMode) {
    console.log('🔄 ROLLBACK MODE - Restoring from backups');
  } else if (dryRun) {
    console.log('👁️  DRY RUN MODE - No changes will be made');
  }

  if (allMode && paths.length === 1) {
    // Process all YAML files in directory
    const dir = resolve(paths[0]);
    const files = findYamlFiles(dir);
    migrationReport.summary.totalFiles = files.length;

    console.log(`📂 Found ${files.length} YAML files to process in ${dir}`);

    files.forEach((file) => {
      try {
        const report = rollbackMode
          ? rollbackFile(file)
          : processFile(file, dryRun);
        migrationReport.files.push(report);
      } catch (error) {
        console.error(`💥 Failed to process ${file}: ${error}`);
        migrationReport.files.push({
          filePath: file,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        migrationReport.summary.errors++;
      }
    });
  } else {
    // Process individual files
    migrationReport.summary.totalFiles = paths.length;

    paths.forEach((path) => {
      const filePath = resolve(path);
      try {
        const report = rollbackMode
          ? rollbackFile(filePath)
          : processFile(filePath, dryRun);
        migrationReport.files.push(report);
      } catch (error) {
        console.error(`💥 Failed to process ${filePath}: ${error}`);
        migrationReport.files.push({
          filePath,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        migrationReport.summary.errors++;
      }
    });
  }

  migrationReport.endTime = new Date().toISOString();

  // Print final report
  printMigrationReport();

  const hasErrors = migrationReport.summary.errors > 0;
  const successfulOps = rollbackMode
    ? migrationReport.summary.rolledBack
    : migrationReport.summary.migrated;

  if (hasErrors) {
    console.log(
      `\n⚠️  Completed with ${migrationReport.summary.errors} error(s)`,
    );
    process.exit(1);
  } else if (successfulOps > 0) {
    console.log(
      `\n🎉 Successfully ${rollbackMode ? 'rolled back' : 'migrated'} ${successfulOps} file(s)!`,
    );
  } else {
    console.log(
      `\n✨ No files needed ${rollbackMode ? 'rollback' : 'migration'}`,
    );
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export functions for testing
export {
  processFile,
  rollbackFile,
  validateArtifact,
  createBackup,
  findYamlFiles,
};

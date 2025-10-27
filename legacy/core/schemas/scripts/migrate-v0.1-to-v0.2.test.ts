import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBackup,
  findYamlFiles,
  processFile,
  rollbackFile,
  validateArtifact,
} from './migrate-v0.1-to-v0.2';

describe('Enhanced Migration Tool v0.1.0 → v0.2.0', () => {
  let testDir: string;
  let testFile: string;

  beforeEach(() => {
    // Create a temporary directory for tests
    testDir = join(
      tmpdir(),
      `migration-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    mkdirSync(testDir, { recursive: true });
    testFile = join(testDir, 'test-artifact.yml');
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('validateArtifact', () => {
    it('should validate a correct v0.2.0 artifact', () => {
      const validArtifact = `
metadata:
  title: Test Issue
  priority: medium
  estimation: S
  created_by: Test User (test@example.com)
  assignee: Test User (test@example.com)
  schema_version: 0.2.0
  events:
    - timestamp: 2025-07-15T10:00:00Z
      event: draft
      actor: Test User (test@example.com)
      event_id: evt_1234567890abcdef
      metadata:
        correlation_id: evt_1234567890abcdef
        parent_event_id: null

content:
  summary: Test summary
  acceptance_criteria:
    - Criterion 1
    - Criterion 2
`;

      writeFileSync(testFile, validArtifact);

      // Mock console.log to avoid output during tests
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = validateArtifact(testFile);
      expect(result).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should reject artifact missing required fields', () => {
      const invalidArtifact = `
metadata:
  title: Test Issue
  # missing required fields
content:
  summary: Test summary
`;

      writeFileSync(testFile, invalidArtifact);

      // Mock console.error to avoid output during tests
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = validateArtifact(testFile);
      expect(result).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid YAML syntax', () => {
      const invalidYaml = `
metadata:
  title: Test Issue
  invalid: [unclosed bracket
`;

      writeFileSync(testFile, invalidYaml);

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = validateArtifact(testFile);
      expect(result).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createBackup', () => {
    it('should create a backup file', () => {
      const originalContent = 'test content';
      writeFileSync(testFile, originalContent);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = createBackup(testFile);
      expect(result).toBe(true);

      const backupFile = `${testFile}.v0.1.backup`;
      expect(existsSync(backupFile)).toBe(true);
      expect(readFileSync(backupFile, 'utf-8')).toBe(originalContent);

      consoleSpy.mockRestore();
    });

    it('should handle backup creation errors', () => {
      // Try to backup a non-existent file
      const nonExistentFile = join(testDir, 'non-existent.yml');

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = createBackup(nonExistentFile);
      expect(result).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('processFile', () => {
    it('should migrate a v0.1.0 artifact to v0.2.0', () => {
      const v01Artifact = `
metadata:
  title: Test Issue
  priority: medium
  estimation: S
  created_by: Test User (test@example.com)
  assignee: Test User (test@example.com)
  schema_version: 0.1.0
  relationships:
    blocks: []
    blocked_by: []
  events:
    - timestamp: 2025-07-15T10:00:00Z
      event: draft
      actor: Test User (test@example.com)

content:
  summary: Test summary
  acceptance_criteria:
    - Criterion 1
    - Criterion 2
`;

      writeFileSync(testFile, v01Artifact);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = processFile(testFile, false);

      expect(result.status).toBe('migrated');
      expect(result.eventsProcessed).toBe(1);
      expect(result.correlationId).toMatch(/^evt_[0-9a-f]{16}$/);
      expect(result.backupCreated).toBe(true);

      // Check that backup was created
      const backupFile = `${testFile}.v0.1.backup`;
      expect(existsSync(backupFile)).toBe(true);

      // Check that file was updated to v0.2.0
      const migratedContent = readFileSync(testFile, 'utf-8');
      expect(migratedContent).toContain('schema_version: 0.2.0');
      expect(migratedContent).toContain('event_id: evt_');
      expect(migratedContent).toContain('correlation_id: evt_');
      expect(migratedContent).toContain('parent_event_id: null');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should skip already migrated v0.2.0 artifacts', () => {
      const v02Artifact = `
metadata:
  title: Test Issue
  priority: medium
  estimation: S
  created_by: Test User (test@example.com)
  assignee: Test User (test@example.com)
  schema_version: 0.2.0
  events:
    - timestamp: 2025-07-15T10:00:00Z
      event: draft
      actor: Test User (test@example.com)
      event_id: evt_1234567890abcdef
      metadata:
        correlation_id: evt_1234567890abcdef
        parent_event_id: null

content:
  summary: Test summary
  acceptance_criteria:
    - Criterion 1
`;

      writeFileSync(testFile, v02Artifact);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = processFile(testFile, false);

      expect(result.status).toBe('already_migrated');
      expect(result.eventsProcessed).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should handle dry run mode', () => {
      const v01Artifact = `
metadata:
  title: Test Issue
  priority: medium
  estimation: S
  created_by: Test User (test@example.com)
  assignee: Test User (test@example.com)
  schema_version: 0.1.0
  relationships:
    blocks: []
    blocked_by: []
  events:
    - timestamp: 2025-07-15T10:00:00Z
      event: draft
      actor: Test User (test@example.com)

content:
  summary: Test summary
  acceptance_criteria:
    - Criterion 1
`;

      writeFileSync(testFile, v01Artifact);
      const originalContent = readFileSync(testFile, 'utf-8');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = processFile(testFile, true); // dry run

      expect(result.status).toBe('migrated');
      expect(result.eventsProcessed).toBe(1);
      expect(result.backupCreated).toBeUndefined(); // No backup in dry run

      // File should not be modified
      const afterContent = readFileSync(testFile, 'utf-8');
      expect(afterContent).toBe(originalContent);

      // No backup should be created
      const backupFile = `${testFile}.v0.1.backup`;
      expect(existsSync(backupFile)).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should skip files with invalid schema versions', () => {
      const invalidVersionArtifact = `
metadata:
  title: Test Issue
  priority: medium
  estimation: S
  created_by: Test User (test@example.com)
  assignee: Test User (test@example.com)
  schema_version: 2.0.0
  events:
    - timestamp: 2025-07-15T10:00:00Z
      event: draft
      actor: Test User (test@example.com)

content:
  summary: Test summary
  acceptance_criteria:
    - Criterion 1
`;

      writeFileSync(testFile, invalidVersionArtifact);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = processFile(testFile, false);

      expect(result.status).toBe('skipped');
      expect(result.errorMessage).toContain('Invalid schema version');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle artifacts with multiple events', () => {
      const multiEventArtifact = `
metadata:
  title: Test Issue
  priority: medium
  estimation: S
  created_by: Test User (test@example.com)
  assignee: Test User (test@example.com)
  schema_version: 0.1.0
  relationships:
    blocks: []
    blocked_by: []
  events:
    - timestamp: 2025-07-15T10:00:00Z
      event: draft
      actor: Test User (test@example.com)
    - timestamp: 2025-07-15T11:00:00Z
      event: ready
      actor: Test User (test@example.com)
    - timestamp: 2025-07-15T12:00:00Z
      event: in_progress
      actor: Test User (test@example.com)

content:
  summary: Test summary
  acceptance_criteria:
    - Criterion 1
`;

      writeFileSync(testFile, multiEventArtifact);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = processFile(testFile, false);

      expect(result.status).toBe('migrated');
      expect(result.eventsProcessed).toBe(3);

      // Check that all events got event_ids and metadata
      const migratedContent = readFileSync(testFile, 'utf-8');
      const eventIdMatches = migratedContent.match(
        /event_id: evt_[0-9a-f]{16}/g,
      );
      expect(eventIdMatches).toHaveLength(3);

      // All events should have the same correlation_id
      const correlationIdMatches = migratedContent.match(
        /correlation_id: (evt_[0-9a-f]{16})/g,
      );
      expect(correlationIdMatches).toHaveLength(3);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('rollbackFile', () => {
    it('should rollback a file from backup', () => {
      const originalContent = `
metadata:
  title: Test Issue
  schema_version: 0.1.0
`;
      const modifiedContent = `
metadata:
  title: Test Issue
  schema_version: 0.2.0
`;

      // Create original and modified files
      writeFileSync(testFile, modifiedContent);
      const backupFile = `${testFile}.v0.1.backup`;
      writeFileSync(backupFile, originalContent);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = rollbackFile(testFile);

      expect(result.status).toBe('rolled_back');

      // File should be restored to original content
      const restoredContent = readFileSync(testFile, 'utf-8');
      expect(restoredContent).toBe(originalContent);

      // Backup file should be deleted
      expect(existsSync(backupFile)).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should handle missing backup files', () => {
      writeFileSync(testFile, 'some content');

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = rollbackFile(testFile);

      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('No backup file found');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('findYamlFiles', () => {
    it('should find YAML files in directory', () => {
      // Create test structure
      const subDir = join(testDir, 'subdir');
      mkdirSync(subDir);

      const file1 = join(testDir, 'test1.yml');
      const file2 = join(subDir, 'test2.yml');
      const backupFile = join(testDir, 'test.yml.backup');
      const nonYamlFile = join(testDir, 'test.txt');

      writeFileSync(file1, 'content1');
      writeFileSync(file2, 'content2');
      writeFileSync(backupFile, 'backup');
      writeFileSync(nonYamlFile, 'text');

      const yamlFiles = findYamlFiles(testDir);

      expect(yamlFiles).toHaveLength(2);
      expect(yamlFiles).toContain(file1);
      expect(yamlFiles).toContain(file2);
      expect(yamlFiles).not.toContain(backupFile); // Should exclude backup files
      expect(yamlFiles).not.toContain(nonYamlFile); // Should exclude non-YAML files
    });

    it('should handle empty directories', () => {
      const yamlFiles = findYamlFiles(testDir);
      expect(yamlFiles).toHaveLength(0);
    });
  });

  describe('Integration tests', () => {
    it('should perform full migration workflow', () => {
      const v01Artifact = `
metadata:
  title: Integration Test Issue
  priority: high
  estimation: M
  created_by: Test User (test@example.com)
  assignee: Test User (test@example.com)
  schema_version: 0.1.0
  relationships:
    blocks: []
    blocked_by: []
  events:
    - timestamp: 2025-07-15T10:00:00Z
      event: draft
      actor: Test User (test@example.com)

content:
  summary: Integration test summary
  acceptance_criteria:
    - Should migrate correctly
    - Should create backup
    - Should allow rollback
`;

      writeFileSync(testFile, v01Artifact);
      const originalContent = readFileSync(testFile, 'utf-8');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Step 1: Migrate
      const migrateResult = processFile(testFile, false);
      expect(migrateResult.status).toBe('migrated');

      const migratedContent = readFileSync(testFile, 'utf-8');
      expect(migratedContent).toContain('schema_version: 0.2.0');
      expect(migratedContent).not.toBe(originalContent);

      // Step 2: Verify backup exists
      const backupFile = `${testFile}.v0.1.backup`;
      expect(existsSync(backupFile)).toBe(true);
      expect(readFileSync(backupFile, 'utf-8')).toBe(originalContent);

      // Step 3: Rollback
      const rollbackResult = rollbackFile(testFile);
      expect(rollbackResult.status).toBe('rolled_back');

      // Step 4: Verify rollback
      const rolledBackContent = readFileSync(testFile, 'utf-8');
      expect(rolledBackContent).toBe(originalContent);
      expect(existsSync(backupFile)).toBe(false); // Backup should be cleaned up

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});

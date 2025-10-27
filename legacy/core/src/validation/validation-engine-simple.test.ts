import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { IssueSchema } from '../data/schemas';
import { CArtifactEvent, CEventTrigger } from '../data/types/constants';
import { ValidationEngine } from './validation-engine';

describe('ValidationEngine Integration', () => {
  it('should validate a real issue artifact', async () => {
    const engine = new ValidationEngine();

    // Create a temporary directory and file
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'kodebase-test-'));
    const artifactsDir = join(
      tempDir,
      '.kodebase',
      'artifacts',
      'A.test-initiative',
      'A.1.test-milestone',
    );
    await fs.mkdir(artifactsDir, { recursive: true });

    const validIssue: IssueSchema = {
      metadata: {
        title: 'Test Issue',
        priority: 'high',
        estimation: 'M',
        created_by: 'Test User (test@example.com)',
        assignee: 'Test User (test@example.com)',
        schema_version: '0.1.0',
        relationships: {
          blocks: [],
          blocked_by: [],
        },
        events: [
          {
            event: CArtifactEvent.DRAFT,
            timestamp: '2025-01-01T00:00:00Z',
            actor: 'Test User (test@example.com)',
            trigger: CEventTrigger.ARTIFACT_CREATED,
          },
        ],
      },
      content: {
        summary: 'Test summary',
        acceptance_criteria: ['Test criterion 1', 'Test criterion 2'],
      },
    };

    const filePath = join(artifactsDir, 'A.1.1.yml');
    await fs.writeFile(filePath, stringify(validIssue));

    const result = await engine.validateArtifact(filePath);

    expect(result).toMatchObject({
      artifactId: 'A.1.1',
      artifactType: 'issue',
      isValid: true,
      errors: [],
    });

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it('should detect missing required fields', async () => {
    const engine = new ValidationEngine();

    // Create a temporary directory and file
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'kodebase-test-'));
    const artifactsDir = join(
      tempDir,
      '.kodebase',
      'artifacts',
      'A.test-initiative',
      'A.1.test-milestone',
    );
    await fs.mkdir(artifactsDir, { recursive: true });

    const invalidIssue = {
      metadata: {
        title: '',
        priority: 'high',
        estimation: 'M',
        created_by: 'Test User (test@example.com)',
        assignee: 'Test User (test@example.com)',
        schema_version: '0.1.0',
        relationships: {
          blocks: [],
          blocked_by: [],
        },
        events: [],
      },
      content: {
        summary: '',
        acceptance_criteria: [],
      },
    };

    const filePath = join(artifactsDir, 'A.1.1.yml');
    await fs.writeFile(filePath, stringify(invalidIssue));

    const result = await engine.validateArtifact(filePath);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it('should handle performance for multiple artifacts', async () => {
    const engine = new ValidationEngine();

    // Create a temporary directory
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'kodebase-test-'));
    const artifactsDir = join(
      tempDir,
      '.kodebase',
      'artifacts',
      'A.test-initiative',
      'A.1.test-milestone',
    );
    await fs.mkdir(artifactsDir, { recursive: true });

    // Create 10 test artifacts
    for (let i = 1; i <= 10; i++) {
      const issue: IssueSchema = {
        metadata: {
          title: `Test Issue ${i}`,
          priority: 'high',
          estimation: 'M',
          created_by: 'Test User (test@example.com)',
          assignee: 'Test User (test@example.com)',
          schema_version: '0.1.0',
          relationships: {
            blocks: [],
            blocked_by: [],
          },
          events: [
            {
              timestamp: '2025-01-01T00:00:00Z',
              event: CArtifactEvent.DRAFT,
              actor: 'Test User (test@example.com)',
              trigger: CEventTrigger.ARTIFACT_CREATED,
            },
          ],
        },
        content: {
          summary: `Test summary ${i}`,
          acceptance_criteria: [`Test criterion ${i}`],
        },
      };

      const filePath = join(artifactsDir, `A.1.${i}.yml`);
      await fs.writeFile(filePath, stringify(issue));
    }

    // Create paths array for mocking
    const paths: string[] = [];
    for (let i = 1; i <= 10; i++) {
      paths.push(join(artifactsDir, `A.1.${i}.yml`));
    }

    // Mock the loader directly on the engine
    (engine as any).loader.loadAllArtifactPaths = async () => paths;

    const startTime = Date.now();
    const result = await engine.validateAll();
    const duration = Date.now() - startTime;

    expect(result.totalArtifacts).toBe(10);
    expect(result.validArtifacts).toBe(10);
    expect(result.invalidArtifacts).toBe(0);
    expect(duration).toBeLessThan(2000); // Should be under 2 seconds

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationEngine } from './validation-engine';
import type { IssueSchema } from '../data/schemas';
import { createValidIssueMetadata } from './test-helpers';

// Mock the dependencies
vi.mock('../services/artifact-file-service', () => ({
  ArtifactFileService: vi.fn().mockImplementation(() => ({
    readArtifact: vi.fn(),
    writeArtifact: vi.fn(),
  })),
}));

vi.mock('../loading/artifact-loader', () => ({
  ArtifactLoader: vi.fn().mockImplementation(() => ({
    loadAllArtifactPaths: vi.fn(),
  })),
}));

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ValidationEngine();
    // Ensure loader mock methods are accessible
    const mockLoadAllArtifactPaths = vi.fn();
    (engine as any).loader.loadAllArtifactPaths = mockLoadAllArtifactPaths;
    (engine.loader as any).loadAllArtifactPaths = mockLoadAllArtifactPaths;
  });

  describe('validateArtifact', () => {
    it('should validate a valid issue artifact', async () => {
      const validIssue: IssueSchema = {
        metadata: createValidIssueMetadata(),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion 1', 'Test criterion 2'],
        },
      };

      // Access the mocked instance through the engine's private property
      (engine as any).fileService.readArtifact.mockResolvedValue(validIssue);

      const result = await engine.validateArtifact('/path/to/A.1.1.yml');

      expect(result).toMatchObject({
        artifactId: 'A.1.1',
        artifactType: 'issue',
        isValid: true,
        errors: [],
      });
    });

    it('should return schema validation errors for invalid data', async () => {
      const invalidData = {
        metadata: {
          title: 'Test Issue',
          // Missing required fields
        },
        content: {},
      };

      (engine as any).fileService.readArtifact.mockResolvedValue(invalidData);

      const result = await engine.validateArtifact('/path/to/A.1.1.yml');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: 'SCHEMA_VALIDATION_FAILED',
      });
    });

    it('should validate with caching enabled', async () => {
      const validIssue: IssueSchema = {
        metadata: createValidIssueMetadata(),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      (engine as any).fileService.readArtifact.mockResolvedValue(validIssue);
      (engine.loader as any).loadAllArtifactPaths.mockResolvedValue([
        '.kodebase/artifacts/A.test/A.1.test/A.1.1.yml',
      ]);

      // First call - should hit the file system
      const result1 = await engine.validateArtifact(
        '.kodebase/artifacts/A.test/A.1.test/A.1.1.yml',
        {
          useCache: true,
        },
      );

      // Second call - should use cache
      const result2 = await engine.validateArtifact(
        '.kodebase/artifacts/A.test/A.1.test/A.1.1.yml',
        {
          useCache: true,
        },
      );

      expect(result1).toEqual(result2);
      expect((engine as any).fileService.readArtifact).toHaveBeenCalledTimes(1);
    });
  });

  // TODO: Add fixArtifact tests when the method is implemented

  describe('validateAll', () => {
    it('should validate multiple artifacts and return aggregate results', async () => {
      const issue1: IssueSchema = {
        metadata: createValidIssueMetadata(),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      // Create an artifact with content structure that can be detected as an issue
      // but with invalid fields for validation to fail
      const issue2 = {
        metadata: {
          ...createValidIssueMetadata({
            title: '', // Invalid: empty title
            events: [], // Invalid: no events
          }),
        },
        content: {
          summary: '', // Invalid: empty summary
          acceptance_criteria: [], // Invalid: no acceptance criteria
        },
      };

      const mockFileService = (engine as any).fileService;
      mockFileService.readArtifact
        .mockResolvedValueOnce(issue1)
        .mockResolvedValueOnce(issue2);

      (engine.loader as any).loadAllArtifactPaths.mockResolvedValue([
        '.kodebase/artifacts/A.test/A.1.test/A.1.1.yml',
        '.kodebase/artifacts/A.test/A.1.test/A.1.2.yml',
      ]);

      const result = await engine.validateAll();

      expect(result.totalArtifacts).toBe(2);
      expect(result.validArtifacts).toBe(1);
      expect(result.invalidArtifacts).toBe(1);
      expect(result.errors).toHaveLength(0); // errors array contains only system-level errors

      // Check individual results
      const invalidResults = result.results.filter((r) => !r.isValid);
      expect(invalidResults).toHaveLength(1);
      expect(invalidResults[0]).toMatchObject({
        artifactId: 'A.1.2',
        isValid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            code: 'SCHEMA_VALIDATION_FAILED',
            message: 'Unable to determine artifact type from data structure',
          }),
        ]),
      });
    });

    it('should detect circular dependencies across artifacts', async () => {
      const issue1: IssueSchema = {
        metadata: createValidIssueMetadata({
          relationships: {
            blocks: [],
            blocked_by: ['A.1.2'],
          },
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const issue2: IssueSchema = {
        metadata: createValidIssueMetadata({
          relationships: {
            blocks: [],
            blocked_by: ['A.1.1'],
          },
        }),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      const mockFileService = (engine as any).fileService;
      mockFileService.readArtifact
        .mockResolvedValueOnce(issue1)
        .mockResolvedValueOnce(issue2);

      (engine.loader as any).loadAllArtifactPaths.mockResolvedValue([
        '.kodebase/artifacts/A.test/A.1.test/A.1.1.yml',
        '.kodebase/artifacts/A.test/A.1.test/A.1.2.yml',
      ]);

      const result = await engine.validateAll();

      // Circular dependencies are reported in the errors array
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        artifactId: 'system',
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'CIRCULAR_DEPENDENCY',
          }),
        ]),
      });
    });
  });

  describe('Performance', () => {
    it('should validate 100 artifacts in under 2 seconds', async () => {
      const validIssue: IssueSchema = {
        metadata: createValidIssueMetadata(),
        content: {
          summary: 'Test summary',
          acceptance_criteria: ['Test criterion'],
        },
      };

      // Create 100 artifact paths
      const paths = Array.from(
        { length: 100 },
        (_, i) => `.kodebase/artifacts/A.test/A.${i}.test/A.${i}.1.yml`,
      );

      const mockFileService = (engine as any).fileService;
      mockFileService.readArtifact.mockResolvedValue(validIssue);

      (engine.loader as any).loadAllArtifactPaths.mockResolvedValue(paths);

      const startTime = Date.now();
      const result = await engine.validateAll();
      const endTime = Date.now();

      expect(result.totalArtifacts).toBe(100);
      expect(result.validArtifacts).toBe(100);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});

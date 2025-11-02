import type { BatchValidationResult, ValidationResult } from '@kodebase/core';
import { render } from 'ink-testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Validate } from './Validate.js';

// Mock ValidationEngine from @kodebase/core
const mockValidateArtifact = vi.fn();
const mockValidateAll = vi.fn();
const mockGetArtifactPath = vi.fn();

vi.mock('@kodebase/core', async () => {
  const original = await vi.importActual('@kodebase/core');
  return {
    ...original,
    ValidationEngine: vi.fn().mockImplementation(() => ({
      validateArtifact: mockValidateArtifact,
      validateAll: mockValidateAll,
    })),
  };
});

// Mock ArtifactLoader
vi.mock('../utils/artifact-loader.js', () => ({
  ArtifactLoader: vi.fn().mockImplementation(() => ({
    getArtifactPath: mockGetArtifactPath,
  })),
}));

describe('Validate Command', () => {
  beforeEach(() => {
    // Clear only our specific mocks
    mockValidateArtifact.mockClear();
    mockValidateAll.mockClear();
    mockGetArtifactPath.mockClear();

    // Set up default mock return values
    mockGetArtifactPath.mockResolvedValue('/path/to/A.1.5.yml');
  });

  const mockValidationResult: ValidationResult = {
    isValid: true,
    errors: [],
    artifactId: 'A.1.5',
    artifactType: 'issue',
  };

  const mockBatchResult: BatchValidationResult = {
    totalArtifacts: 2,
    validArtifacts: 2,
    invalidArtifacts: 0,
    errors: [],
    results: [mockValidationResult],
    duration: 500,
  };

  describe('Basic Functionality', () => {
    it('should validate single artifact without fix by default', async () => {
      mockValidateArtifact.mockResolvedValueOnce(mockValidationResult);

      const { lastFrame } = render(<Validate path="A.1.5" />);

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockValidateArtifact).toHaveBeenCalledWith('/path/to/A.1.5.yml', {
        fix: false, // I.1.5 requirement: no fix by default
        validateSchema: true,
        validateReadiness: true,
        validateDependencies: false, // Skip for performance
        validateRelationships: false, // Skip for performance
        useCache: true, // Enable for performance
      });

      const output = lastFrame();
      expect(output).toContain('Validation Summary');
      expect(output).toContain('✓ All artifacts are valid!');
    });

    it('should validate all artifacts when no path provided', async () => {
      mockValidateAll.mockResolvedValueOnce(mockBatchResult);

      const { lastFrame } = render(<Validate />);

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockValidateAll).toHaveBeenCalledWith({ fix: false });

      const output = lastFrame();
      expect(output).toContain('Validation Summary');
      expect(output).toContain('Total artifacts: 2');
      expect(output).toContain('Valid: 2');
    });
  });

  describe('I.1.5 Enhanced Features', () => {
    it('should show performance timing with visual indicator for fast validation', async () => {
      // Mock fast validation (<1s) - Control timing more precisely
      const mockPerformanceNow = vi.spyOn(performance, 'now');
      let callCount = 0;
      mockPerformanceNow.mockImplementation(() => {
        callCount++;
        // For the validation timing calculation, we need start=100, end=600 (500ms diff)
        // But there are other calls, so we need to track and return appropriate values
        if (callCount <= 10) return 100; // Early calls return start time
        return 600; // Later calls return end time
      });

      mockValidateArtifact.mockResolvedValueOnce(mockValidationResult);

      const { lastFrame } = render(<Validate path="A.1.5" />);

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 150));

      const output = lastFrame();
      expect(output).toContain('Duration: 500ms ✓'); // Fast validation indicator

      mockPerformanceNow.mockRestore();
    });

    it('should show performance warning for slow validation', async () => {
      // Mock slow validation (>=1s) - Control timing for 1500ms duration
      const mockPerformanceNow = vi.spyOn(performance, 'now');
      let callCount = 0;
      mockPerformanceNow.mockImplementation(() => {
        callCount++;
        // For the validation timing calculation, we need start=100, end=1600 (1500ms diff)
        if (callCount <= 10) return 100; // Early calls return start time
        return 1600; // Later calls return end time
      });

      mockValidateArtifact.mockResolvedValueOnce(mockValidationResult);

      const { lastFrame } = render(<Validate path="A.1.5" />);

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 150));

      const output = lastFrame();
      expect(output).toContain('Duration: 1500ms ⚠️'); // Slow validation warning

      mockPerformanceNow.mockRestore();
    });

    it('should provide JSON output for machine-readable results', async () => {
      mockValidateArtifact.mockResolvedValueOnce({
        ...mockValidationResult,
        errors: [{ message: 'Test error', code: 'TEST_ERROR', field: 'test' }],
      });

      const { lastFrame } = render(<Validate path="A.1.5" format="json" />);

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();

      // Should contain structured JSON
      expect(output).toContain('"summary":');
      expect(output).toContain('"totalArtifacts": 1');
      expect(output).toContain('"validArtifacts"');
      expect(output).toContain('"invalidArtifacts"');
      expect(output).toContain('"duration"');
      expect(output).toContain('"success"');
      expect(output).toContain('"globalErrors"');
      expect(output).toContain('"artifactResults"');

      // Should contain artifact details
      expect(output).toContain('"artifactId": "A.1.5"');
      expect(output).toContain('"artifactType": "issue"');
      expect(output).toContain('"isValid"');
      expect(output).toContain('"errors"');
    });

    it('should handle validation errors in JSON format', async () => {
      const failedValidation: ValidationResult = {
        isValid: false,
        errors: [
          { message: 'Schema validation failed', code: 'SCHEMA_ERROR' },
          {
            message: 'Missing required field',
            code: 'REQUIRED_FIELD',
            field: 'title',
          },
        ],
        artifactId: 'A.1.5',
        artifactType: 'issue',
      };

      mockValidateArtifact.mockResolvedValueOnce(failedValidation);

      const { lastFrame } = render(<Validate path="A.1.5" format="json" />);

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();

      expect(output).toContain('"success": false');
      expect(output).toContain('"isValid": false');
      expect(output).toContain('Schema validation failed');
      expect(output).toContain('Missing required field');
      expect(output).toContain('"field": "title"');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation engine errors gracefully', async () => {
      mockValidateArtifact.mockRejectedValueOnce(
        new Error('Validation engine failed'),
      );

      const { lastFrame } = render(<Validate path="A.1.5" />);

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('✗ Validation failed');
      expect(output).toContain('Validation engine failed');
    });

    it('should show loading state initially', () => {
      // Don't resolve the mock, so it stays in loading state
      mockValidateArtifact.mockReturnValue(new Promise(() => {}));

      const { lastFrame } = render(<Validate path="A.1.5" />);

      const output = lastFrame();
      expect(output).toContain('Validating artifacts...');
    });
  });
});

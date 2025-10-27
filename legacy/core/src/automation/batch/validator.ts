/**
 * Batch Validator
 *
 * Implements parallel validation of multiple artifacts with error isolation,
 * progress reporting, and memory-efficient processing.
 */

import { readFile } from 'node:fs/promises';
import { ArtifactParser } from '../../data/parser';
import type { ArtifactSchema } from '../../data/schemas';
import { ArtifactValidator } from '../../data/validator';
import type {
  BatchResult,
  BatchValidationConfig,
  BatchValidator,
} from './index';
import { BatchProcessor } from './processor';

/**
 * Implementation of batch artifact validation
 */
class BatchValidatorImpl implements BatchValidator {
  private processor: BatchProcessor;
  private parser: ArtifactParser;
  private validator: ArtifactValidator;

  constructor() {
    this.processor = new BatchProcessor();
    this.parser = new ArtifactParser();
    this.validator = new ArtifactValidator();
  }

  /**
   * Validate multiple artifact data objects in parallel
   *
   * @param artifactData - Array of unknown data to validate
   * @param config - Validation configuration
   * @returns Batch validation result
   */
  async validateArtifacts(
    artifactData: unknown[],
    config: BatchValidationConfig = {},
  ): Promise<BatchResult<ArtifactSchema>> {
    // Create dummy artifacts for processing
    const dummyArtifacts = artifactData.map((data, index) => ({
      metadata: { title: `Validating item ${index}` },
      content: {},
      _validationData: data,
    })) as unknown as ArtifactSchema[];

    return this.processor.processArtifacts(
      dummyArtifacts,
      async (dummyArtifact) => {
        // biome-ignore lint/suspicious/noExplicitAny: Accessing custom property on dummy artifact carrier object - _validationData is not part of ArtifactSchema but temporarily attached for batch processing
        const data = (dummyArtifact as any)._validationData;
        return this.validator.validate(data);
      },
      {
        ...config,
        progressCallback: config.progressCallback
          ? (current, total, _operation) =>
              config.progressCallback?.(current, total, 'Validating artifacts')
          : undefined,
      },
    );
  }

  /**
   * Validate multiple artifact files in parallel
   *
   * @param paths - Array of file paths to validate
   * @param config - Validation configuration
   * @returns Batch validation result
   */
  async validateArtifactPaths(
    paths: string[],
    config: BatchValidationConfig = {},
  ): Promise<BatchResult<ArtifactSchema>> {
    // Create dummy artifacts with path information
    const dummyArtifacts = paths.map((path) => ({
      metadata: { title: `Validating ${path}` },
      content: {},
      _filePath: path,
    })) as unknown as ArtifactSchema[];

    return this.processor.processArtifacts(
      dummyArtifacts,
      async (dummyArtifact) => {
        // biome-ignore lint/suspicious/noExplicitAny: Accessing custom property on dummy artifact carrier object - _filePath is not part of ArtifactSchema but temporarily attached for batch processing
        const path = (dummyArtifact as any)._filePath;

        try {
          // Read file
          const content = await readFile(path, 'utf-8');

          // Parse YAML
          const data = this.parser.parseYaml(content);

          // Validate artifact
          return this.validator.validate(data);
        } catch (error) {
          throw new Error(
            `Failed to process file ${path}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
      {
        ...config,
        progressCallback: config.progressCallback
          ? (current, total, _operation) =>
              config.progressCallback?.(
                current,
                total,
                'Validating artifact files',
              )
          : undefined,
      },
    );
  }
}

/**
 * Factory function to create a batch validator
 */
export function createBatchValidator(): BatchValidator {
  return new BatchValidatorImpl();
}

/**
 * Convenience function for parallel validation of artifact data
 *
 * @param artifactData - Array of unknown data to validate
 * @param config - Validation configuration
 * @returns Batch validation result
 */
export async function validateArtifactsInParallel(
  artifactData: unknown[],
  config: BatchValidationConfig = {},
): Promise<BatchResult<ArtifactSchema>> {
  const validator = createBatchValidator();
  return validator.validateArtifacts(artifactData, config);
}

/**
 * Convenience function for parallel validation of artifact files
 *
 * @param paths - Array of file paths to validate
 * @param config - Validation configuration
 * @returns Batch validation result
 */
export async function validateArtifactFilesInParallel(
  paths: string[],
  config: BatchValidationConfig = {},
): Promise<BatchResult<ArtifactSchema>> {
  const validator = createBatchValidator();
  return validator.validateArtifactPaths(paths, config);
}

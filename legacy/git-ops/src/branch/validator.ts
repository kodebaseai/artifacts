/**
 * Branch name validation
 */

import type { BranchValidationResult } from '../types';

/**
 * Validates branch names against Kodebase artifact ID patterns
 */
export class BranchValidator {
  /**
   * Artifact ID pattern: [A-Z]+(\.[0-9]+)*
   * Examples: A, A.1, A.1.5, AB.23.11
   */
  private readonly artifactPattern = /^[A-Z]+(\.[0-9]+)*$/;

  /**
   * Special branches that should not be used as artifact branches
   */
  private readonly specialBranches = new Set([
    'main',
    'master',
    'develop',
    'development',
    'staging',
    'production',
    'release',
  ]);

  /**
   * Validate a branch name
   * Enhanced with better error messages and suggestions
   */
  validate(branchName: string): BranchValidationResult {
    // Check if it's a special branch
    if (this.specialBranches.has(branchName)) {
      return {
        valid: false,
        error: `"${branchName}" is a special branch name and cannot be used as an artifact branch`,
      };
    }

    // Check if it matches the artifact pattern
    if (!this.artifactPattern.test(branchName)) {
      const error = this.getSpecificError(branchName);
      const suggestion = this.suggestCorrection(branchName);

      return {
        valid: false,
        error,
        suggestion: suggestion !== branchName ? suggestion : undefined,
      };
    }

    // Extract artifact info
    const artifactInfo = this.extractArtifactInfo(branchName);
    if (!artifactInfo) {
      return {
        valid: false,
        error: 'Invalid artifact ID format',
      };
    }

    return {
      valid: true,
      artifactId: branchName,
      artifactType: artifactInfo.type,
    };
  }

  /**
   * Extract artifact type and parts from a valid artifact ID
   * Enhanced to support nested artifacts beyond 3 levels
   */
  extractArtifactInfo(artifactId: string): {
    type: 'initiative' | 'milestone' | 'issue' | 'nested_artifact';
    parts: string[];
  } | null {
    if (!this.artifactPattern.test(artifactId)) {
      return null;
    }

    const parts = artifactId.split('.');

    if (parts.length === 1) {
      return { type: 'initiative', parts };
    } else if (parts.length === 2) {
      return { type: 'milestone', parts };
    } else if (parts.length === 3) {
      return { type: 'issue', parts };
    } else if (parts.length > 3) {
      return { type: 'nested_artifact', parts };
    }

    return null;
  }

  /**
   * Get specific error message based on the invalid format
   * Enhanced with more detailed error analysis and suggestions
   */
  private getSpecificError(branchName: string): string {
    if (!branchName) {
      return 'Branch name cannot be empty';
    }

    if (branchName.startsWith('.')) {
      return 'Branch name cannot start with a dot';
    }

    if (branchName.endsWith('.')) {
      return 'Branch name cannot end with a trailing dot';
    }

    if (branchName.includes('..')) {
      return 'Branch name cannot contain empty parts (consecutive dots)';
    }

    if (/[a-z]/.test(branchName)) {
      return (
        'Branch name must use uppercase letters for the prefix. Did you mean "' +
        this.suggestCorrection(branchName) +
        '"?'
      );
    }

    if (branchName.includes('-')) {
      return (
        'Branch name must use dots as separators, not dashes. Did you mean "' +
        branchName.replace(/-/g, '.') +
        '"?'
      );
    }

    if (branchName.includes('_')) {
      return (
        'Branch name must use dots as separators, not underscores. Did you mean "' +
        branchName.replace(/_/g, '.') +
        '"?'
      );
    }

    if (/^\d/.test(branchName)) {
      return 'Branch name must start with a letter prefix';
    }

    if (/[^A-Z0-9.]/.test(branchName)) {
      return 'Branch name contains invalid characters. Only uppercase letters, numbers, and dots are allowed';
    }

    // Check for non-numeric parts after the prefix
    const parts = branchName.split('.');
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part && !/^\d+$/.test(part)) {
          return `Part "${part}" must be numeric. All parts after the prefix must be numbers`;
        }
      }
    }

    return `Invalid artifact ID format: "${branchName}". Expected pattern: [A-Z]+(\.[0-9]+)*`;
  }

  /**
   * Suggest a corrected version of an invalid branch name
   */
  private suggestCorrection(branchName: string): string {
    return branchName
      .toUpperCase()
      .replace(/[-_]/g, '.')
      .replace(/[^A-Z0-9.]/g, '')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/, '');
  }
}

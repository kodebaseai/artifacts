/**
 * Submission Utility for --submit Flag
 *
 * Implements validation and PR submission functionality for kodebase create --submit
 * and kodebase start --submit commands.
 *
 * Following MVP principle: simple, direct implementation of the 5 acceptance criteria:
 * 1. Validation runs and blocks PR creation on failure
 * 2. PR titles follow required format (Add/Update)
 * 3. PR body includes validation summary & dependency impact
 * 4. Reviewer assignment rules applied via GitHub API
 * 5. Handles API / network errors with retries and user feedback
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ValidationEngine, type ValidationError } from '@kodebase/core';
import { parse as parseYAML } from 'yaml';

export interface SubmissionOptions {
  artifactId: string | string[];
  isNewArtifact?: boolean;
  verbose?: boolean;
  batchMode?: boolean;
}

export interface SubmissionResult {
  success: boolean;
  message: string;
  prUrl?: string;
  validationErrors?: string[];
  error?: string;
  batchResults?: BatchValidationResult[];
}

export interface BatchValidationResult {
  artifactId: string;
  isValid: boolean;
  errors: string[];
}

export interface CompletionAnalysis {
  key_insights?: string[];
  implementation_approach?: string;
  architecture_decisions?: string[];
  manual_testing_steps?: string[];
  challenges_encountered?: string[];
}

export interface ArtifactData {
  metadata: {
    title: string;
    priority: string;
  };
  content: {
    acceptance_criteria: string[];
    summary?: string;
  };
  completion_analysis?: CompletionAnalysis;
  development_process?: {
    challenges_encountered?: string[];
  };
}

/**
 * Reads and parses artifact YAML file following get-pr-context.sh patterns
 */
function readArtifactData(artifactId: string): ArtifactData | null {
  try {
    // Determine artifact file path following Kodebase conventions
    const artifactPath = getArtifactFilePath(artifactId);
    const content = readFileSync(artifactPath, 'utf8');
    const parsed = parseYAML(content) as ArtifactData;

    return parsed;
  } catch (error) {
    console.warn(
      `⚠️  Could not read artifact data for ${artifactId}:`,
      error instanceof Error ? error.message : 'Unknown error',
    );
    return null;
  }
}

/**
 * Gets artifact file path following Kodebase directory structure
 * Uses a more flexible approach to find artifact files
 */
function getArtifactFilePath(artifactId: string): string {
  const parts = artifactId.split('.');

  if (parts.length === 1) {
    // Initiative: Find directories matching pattern
    try {
      const dirs = execSync(
        'find .kodebase/artifacts -name "*.yml" -path "*/I.yml"',
        { encoding: 'utf8' },
      );
      const found = dirs
        .split('\n')
        .find((path) => path.includes(`${artifactId}.yml`));
      if (found) return found.trim();
    } catch {
      // Fallback
    }
    return `.kodebase/artifacts/${artifactId}.artifact-lifecycle-system-v3/${artifactId}.yml`;
  } else if (parts.length === 2) {
    // Milestone: Find milestone files
    try {
      const files = execSync(
        `find .kodebase/artifacts -name "${artifactId}.yml"`,
        { encoding: 'utf8' },
      );
      const found = files.split('\n')[0];
      if (found?.trim()) return found.trim();
    } catch {
      // Fallback
    }
    return `.kodebase/artifacts/${parts[0]}.artifact-lifecycle-system-v3/${artifactId}.event-system-foundation-and-cli-enhancement/${artifactId}.yml`;
  } else {
    // Issue: Find issue files
    try {
      const files = execSync(
        `find .kodebase/artifacts -name "${artifactId}.*.yml"`,
        { encoding: 'utf8' },
      );
      const found = files.split('\n')[0];
      if (found?.trim()) return found.trim();
    } catch {
      // Fallback
    }
    const initiative = parts[0];
    const milestone = parts.slice(0, 2).join('.');
    return `.kodebase/artifacts/${initiative}.artifact-lifecycle-system-v3/${milestone}.event-system-foundation-and-cli-enhancement/${artifactId}.batch-artifact-creation-support.yml`;
  }
}

/**
 * Gets git information for the current branch following get-pr-context.sh patterns
 */
function getGitInfo(artifactId: string): {
  branch: string;
  commitCount: number;
  fileChanges: string[];
} {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim();

    // Count commits for this issue (like get-pr-context.sh)
    const commitOutput = execSync(`git log --oneline --grep="${artifactId}:"`, {
      encoding: 'utf8',
    });
    const commitCount = commitOutput
      .split('\n')
      .filter((line) => line.trim()).length;

    // Get file changes compared to main (like get-pr-context.sh)
    const fileOutput = execSync('git diff --name-only origin/main...HEAD', {
      encoding: 'utf8',
    });
    const fileChanges = fileOutput.split('\n').filter((line) => line.trim());

    return { branch, commitCount, fileChanges };
  } catch (error) {
    console.warn(
      '⚠️  Could not get git information:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return { branch: 'unknown', commitCount: 0, fileChanges: [] };
  }
}

/**
 * Validates multiple artifacts in batch for efficient processing
 * Aggregates results across related artifacts
 *
 * Performance optimization: Runs validation once for entire project
 * then filters results by artifact ID to avoid redundant validation calls
 */
async function validateArtifactBatch(artifactIds: string[]): Promise<{
  allValid: boolean;
  batchResults: BatchValidationResult[];
  summary: string;
}> {
  try {
    // Single validation call for all artifacts (performance optimization)
    const validationEngine = new ValidationEngine();
    const result = await validationEngine.validateAll({
      validateSchema: true,
      validateReadiness: true,
      validateDependencies: true,
      validateRelationships: false,
    });

    const batchResults: BatchValidationResult[] = artifactIds.map(
      (artifactId) => {
        const artifactErrors = result.errors.filter(
          (error: ValidationError) =>
            error.message.includes(artifactId) ||
            error.field?.includes(artifactId),
        );

        return {
          artifactId,
          isValid: artifactErrors.length === 0,
          errors: artifactErrors.map((error: ValidationError) => error.message),
        };
      },
    );

    const allValid = batchResults.every((result) => result.isValid);
    const totalErrors = batchResults.reduce(
      (sum, result) => sum + result.errors.length,
      0,
    );

    const summary = allValid
      ? `✓ Batch validation passed - ${artifactIds.length} artifacts checked`
      : `✗ Batch validation failed - ${totalErrors} errors across ${batchResults.filter((r) => !r.isValid).length} artifacts`;

    return { allValid, batchResults, summary };
  } catch (error: unknown) {
    const batchResults: BatchValidationResult[] = artifactIds.map(
      (artifactId) => ({
        artifactId,
        isValid: false,
        errors: [
          `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      }),
    );

    return {
      allValid: false,
      batchResults,
      summary: '✗ Batch validation engine error',
    };
  }
}

/**
 * Validates artifact before PR submission
 */
async function validateArtifact(artifactId: string): Promise<{
  isValid: boolean;
  errors: string[];
  summary: string;
}> {
  try {
    const validationEngine = new ValidationEngine();
    const result = await validationEngine.validateAll({
      validateSchema: true,
      validateReadiness: true,
      validateDependencies: true,
      validateRelationships: false,
    });

    // Check if our specific artifact has validation errors
    const artifactErrors = result.errors.filter(
      (error: ValidationError) =>
        error.message.includes(artifactId) || error.field?.includes(artifactId),
    );

    const isValid = artifactErrors.length === 0;
    const errors = artifactErrors.map(
      (error: ValidationError) => error.message,
    );

    const summary = isValid
      ? `✓ Validation passed - ${result.totalArtifacts} artifacts checked`
      : `✗ Validation failed - ${artifactErrors.length} errors found`;

    return { isValid, errors, summary };
  } catch (error: unknown) {
    return {
      isValid: false,
      errors: [
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      summary: '✗ Validation engine error',
    };
  }
}

/**
 * Detects if multiple artifacts share the same parent for batch processing
 * Returns grouped artifacts by parent
 */
function detectBatchGroups(artifactIds: string[]): {
  [parent: string]: string[];
} {
  const groups: { [parent: string]: string[] } = {};

  for (const artifactId of artifactIds) {
    const parent = getParentId(artifactId);
    if (!groups[parent]) {
      groups[parent] = [];
    }
    groups[parent].push(artifactId);
  }

  return groups;
}

/**
 * Gets parent ID for batch grouping
 */
function getParentId(artifactId: string): string {
  const parts = artifactId.split('.');
  if (parts.length <= 1) return 'root'; // Initiative has no parent
  return parts.slice(0, -1).join('.'); // Remove last part for parent
}

/**
 * Generates batch branch name following Kodebase conventions:
 * - Batch of issues: add-I.1.3-5 (for I.1.3, I.1.4, I.1.5)
 * - Milestone with issues: add-I.1 (milestone ID only)
 * - Multiple milestones: add-I.1-3 (for I.1, I.2, I.3)
 * - Initiative: add-I
 *
 * Note: This utility function is provided for future CLI integration.
 * Branch creation happens at CLI level, not in submission utilities.
 */
function generateBatchBranchName(artifactIds: string[]): string {
  if (artifactIds.length === 1) {
    const singleId = artifactIds[0];
    return singleId || 'add-artifact'; // Single artifact - use artifact ID
  }

  const groups = detectBatchGroups(artifactIds);
  const groupKeys = Object.keys(groups);

  if (groupKeys.length === 1) {
    // All artifacts under same parent
    const parent = groupKeys[0];

    if (!parent) {
      return 'add-batch'; // Fallback for invalid group data
    }

    const artifacts = groups[parent];

    if (!artifacts) {
      return 'add-batch'; // Fallback for invalid group data
    }

    const firstArtifact = artifacts[0];

    if (!firstArtifact) {
      return 'add-batch'; // Fallback
    }

    const artifactType = determineArtifactType(firstArtifact);

    if (artifactType === 'Issue') {
      // Batch of issues: add-I.1.3-5
      const parts = artifacts.map((id: string) => id.split('.'));
      const lastParts = parts
        .map((p: string[]) => parseInt(p[p.length - 1] || '0'))
        .sort((a: number, b: number) => a - b);
      const min = lastParts[0];
      const max = lastParts[lastParts.length - 1];

      if (!min || !max || min === max) {
        return `add-${firstArtifact}`; // Single issue or invalid data
      }

      const firstPart = parts[0];
      if (!firstPart) {
        return `add-${firstArtifact}`; // Fallback
      }
      const parentPart = firstPart.slice(0, -1).join('.');
      return `add-${parentPart}.${min}-${max}`;
    } else if (artifactType === 'Milestone') {
      // Multiple milestones: add-I.1-3
      const parts = artifacts.map((id: string) => id.split('.'));
      const lastParts = parts
        .map((p: string[]) => parseInt(p[p.length - 1] || '0'))
        .sort((a: number, b: number) => a - b);
      const min = lastParts[0];
      const max = lastParts[lastParts.length - 1];

      if (!min || !max || min === max) {
        return `add-${firstArtifact}`; // Single milestone or invalid data
      }

      const firstPart = parts[0];
      if (!firstPart) {
        return `add-${firstArtifact}`; // Fallback
      }
      const parentPart = firstPart.slice(0, -1).join('.');
      return `add-${parentPart}.${min}-${max}`;
    } else {
      // Initiative: add-I
      return `add-${firstArtifact}`;
    }
  } else {
    // Mixed parents - general batch
    return 'add-batch-mixed';
  }
}

/**
 * Generates PR title supporting both single and batch artifact creation
 */
function generatePRTitle(
  artifactIds: string | string[],
  isNewArtifact: boolean,
): string {
  try {
    const ids = Array.isArray(artifactIds) ? artifactIds : [artifactIds];
    const prefix = isNewArtifact ? 'Add' : 'Update';

    if (ids.length === 1) {
      // Single artifact mode (backward compatible)
      const artifactId = ids[0];
      if (!artifactId) {
        throw new Error('No artifact ID provided');
      }
      const artifactType = determineArtifactType(artifactId);
      return `${prefix} ${artifactType.toLowerCase()} ${artifactId}`;
    } else {
      // Batch mode - group by type and parent
      const groups = detectBatchGroups(ids);
      const groupKeys = Object.keys(groups);

      if (groupKeys.length === 1) {
        // All artifacts share same parent
        const parent = groupKeys[0];
        if (!parent) {
          throw new Error('Invalid parent in batch group');
        }
        const parentGroup = groups[parent];
        if (!parentGroup || parentGroup.length === 0) {
          throw new Error('Invalid batch group structure');
        }
        const firstId = parentGroup[0];
        if (!firstId) {
          throw new Error('Invalid first ID in batch group');
        }
        const artifactType = determineArtifactType(firstId);
        const artifactTypeLabel = `${artifactType.toLowerCase()}s`; // pluralize

        if (ids.length <= 3) {
          return `${prefix} ${artifactTypeLabel} ${ids.join(', ')}`;
        } else {
          return `${prefix} ${ids.length} ${artifactTypeLabel} under ${parent}`;
        }
      } else {
        // Mixed parents - general batch title
        return `${prefix} ${ids.length} artifacts: batch submission`;
      }
    }
  } catch {
    // Fallback title if we can't determine details
    const ids = Array.isArray(artifactIds) ? artifactIds : [artifactIds];
    const prefix = isNewArtifact ? 'Add' : 'Update';
    return ids.length === 1
      ? `${prefix} artifact ${ids[0]}`
      : `${prefix} ${ids.length} artifacts`;
  }
}

/**
 * Generates context-based PR description using get-pr-context.sh patterns
 * Replaces static template approach with artifact data-driven content
 */
function generateContextBasedPRDescription(
  artifactId: string,
  validationSummary: string,
  isNewArtifact: boolean,
): string {
  const artifactData = readArtifactData(artifactId);
  const gitInfo = getGitInfo(artifactId);

  if (!artifactData) {
    // Fallback to basic description if artifact data can't be read
    return generateBasicPRDescription(
      artifactId,
      validationSummary,
      isNewArtifact,
    );
  }

  const { metadata, content, completion_analysis, development_process } =
    artifactData;
  const title = metadata.title || artifactId;

  // Check if completion analysis is available (like get-pr-context.sh validation)
  if (!completion_analysis) {
    console.warn(
      `⚠️  Missing completion analysis for ${artifactId} - PR description will be limited`,
    );
  }

  const sections: string[] = [];

  // Title section
  sections.push(`## ${title}\n`);

  // Acceptance criteria section (following get-pr-context.sh format)
  if (content.acceptance_criteria && content.acceptance_criteria.length > 0) {
    sections.push('### ✅ All Acceptance Criteria Met');
    sections.push(
      content.acceptance_criteria
        .map((criteria) => `- [x] ${criteria}`)
        .join('\n'),
    );
    sections.push('');
  }

  // Key insights section (from completion_analysis)
  if (
    completion_analysis?.key_insights &&
    completion_analysis.key_insights.length > 0
  ) {
    sections.push('### 🔧 Key Enhancements');
    sections.push(
      completion_analysis.key_insights
        .map((insight) => `- ${insight}`)
        .join('\n'),
    );
    sections.push('');
  }

  // Implementation details (from completion_analysis)
  if (completion_analysis?.implementation_approach) {
    sections.push('### 📋 Implementation Details');
    sections.push(completion_analysis.implementation_approach);
    sections.push('');
  }

  // Architecture decisions (from completion_analysis)
  if (
    completion_analysis?.architecture_decisions &&
    completion_analysis.architecture_decisions.length > 0
  ) {
    sections.push('### 🏗️ Architecture Decisions');
    sections.push(
      completion_analysis.architecture_decisions
        .map((decision) => `- ${decision}`)
        .join('\n'),
    );
    sections.push('');
  }

  // Development challenges (from development_process)
  const challenges =
    development_process?.challenges_encountered ||
    completion_analysis?.challenges_encountered;
  if (challenges && challenges.length > 0) {
    sections.push('### 🔄 Development Notes');
    sections.push(challenges.map((challenge) => `- ${challenge}`).join('\n'));
    sections.push('');
  }

  // Testing section (from completion_analysis)
  if (
    completion_analysis?.manual_testing_steps &&
    completion_analysis.manual_testing_steps.length > 0
  ) {
    sections.push('### 🧪 Testing');
    sections.push(
      completion_analysis.manual_testing_steps
        .map((step) => `- ${step}`)
        .join('\n'),
    );
    sections.push('');
  }

  // File changes section (from git info, following get-pr-context.sh)
  if (gitInfo.fileChanges.length > 0) {
    sections.push('### 📁 Files Changed');
    sections.push(
      gitInfo.fileChanges.map((file) => `- \`${file}\``).join('\n'),
    );
    sections.push('');
  }

  // Validation status
  sections.push('### ✅ Validation Status');
  sections.push(validationSummary);
  sections.push('');

  // Footer with creation context
  sections.push(
    `*This ${isNewArtifact ? 'new' : 'updated'} artifact PR was created automatically via \`kodebase --submit\` with context-based description generation.*`,
  );

  return sections.join('\n');
}

/**
 * Fallback to basic PR description when artifact data is unavailable
 */
function generateBasicPRDescription(
  artifactId: string,
  validationSummary: string,
  isNewArtifact: boolean,
): string {
  const artifactType = determineArtifactType(artifactId);
  const action = isNewArtifact ? 'Create new' : 'Update existing';

  return `## ${action} ${artifactType.toLowerCase()}: ${artifactId}

### Validation Status
${validationSummary}

### Guidance for Reviewers
When reviewing this ${artifactType.toLowerCase()}, please consider:
- Does the artifact structure follow the Kodebase schema?
- Are all required fields present and meaningful?
- Do dependencies make sense in the context of the parent artifact?
- Does the content align with the overall initiative goals?

### Impact Assessment
- **Artifact affected:** ${artifactId}
- **Type:** ${artifactType}
- **Validation:** ${validationSummary.includes('✓') ? 'Passed automated checks' : 'Has validation issues - see details above'}

*This PR was created automatically via \`kodebase --submit\` to ensure proper validation before merge.*`;
}

/**
 * Generates PR description with validation summary and dependency impact
 * Supports both single artifact and batch modes
 */
function generatePRDescription(
  artifactIds: string | string[],
  validationSummary: string,
  isNewArtifact: boolean,
  batchResults?: BatchValidationResult[],
): string {
  const ids = Array.isArray(artifactIds) ? artifactIds : [artifactIds];
  const action = isNewArtifact ? 'Create new' : 'Update existing';

  if (ids.length === 1) {
    // Single artifact mode - use context-based description
    const artifactId = ids[0];
    if (!artifactId) {
      throw new Error('No artifact ID provided');
    }

    // Use new context-based PR description generation
    return generateContextBasedPRDescription(
      artifactId,
      validationSummary,
      isNewArtifact,
    );
  } else {
    // Batch mode
    const groups = detectBatchGroups(ids);
    const groupKeys = Object.keys(groups);
    const artifactType = determineArtifactType(ids[0] || '');

    let batchDetails = '';
    if (batchResults && batchResults.length > 0) {
      batchDetails =
        '\n### Individual Artifact Status\n' +
        batchResults
          .map(
            (result) =>
              `- **${result.artifactId}:** ${result.isValid ? '✅ Valid' : `❌ ${result.errors.length} error(s)`}`,
          )
          .join('\n') +
        '\n';
    }

    return `## ${action} artifacts: Batch submission

### Batch Overview
- **Count:** ${ids.length} ${artifactType.toLowerCase()}${ids.length > 1 ? 's' : ''}
- **Parent groups:** ${groupKeys.length}
- **Artifacts:** ${ids.join(', ')}

### Validation Status
${validationSummary}
${batchDetails}
### Guidance for Reviewers
When reviewing this batch submission, please consider:
- Do all artifacts follow the Kodebase schema consistently?
- Are dependencies and relationships between artifacts properly defined?
- Does the batch create a coherent set of related work items?
- Do all artifacts align with their parent's goals and scope?

### Batch Impact Assessment
- **Total artifacts:** ${ids.length}
- **Parents affected:** ${groupKeys.join(', ')}
- **Validation:** ${validationSummary.includes('✓') ? 'All artifacts passed automated checks' : 'Some artifacts have validation issues - see details above'}

*This batch PR was created automatically via \`kodebase --submit\` to ensure proper validation of all related artifacts before merge.*`;
  }
}

/**
 * Simple artifact type determination
 */
function determineArtifactType(artifactId: string): string {
  const dotCount = (artifactId.match(/\./g) || []).length;

  if (dotCount === 0) return 'Initiative';
  if (dotCount === 1) return 'Milestone';
  return 'Issue';
}

/**
 * Determines reviewer assignment based on artifact type and simple rules
 * Following MVP principle: basic assignment logic, not complex reviewer matrix
 */
function getReviewerAssignment(_artifactId: string): string[] {
  // Simple rule-based assignment (expandable in future)
  // For MVP: attempt to get repository owner as default reviewer
  try {
    const repoInfo = execSync('gh repo view --json owner', {
      encoding: 'utf8',
    });
    const parsed = JSON.parse(repoInfo);
    const owner = parsed.owner?.login;

    if (owner) {
      return [owner]; // Assign to repository owner as default
    }
  } catch {
    // Fallback: no reviewer assignment if we can't determine owner
  }

  return []; // No assignment if we can't determine appropriate reviewer
}

/**
 * Creates GitHub PR with error handling and retries
 */
async function createGitHubPR(
  title: string,
  description: string,
  artifactId: string,
  retryCount = 0,
): Promise<{ success: boolean; prUrl?: string; error?: string }> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    // Get reviewer assignment
    const reviewers = getReviewerAssignment(artifactId);

    // Build GitHub CLI command with optional reviewer assignment
    let prCommand = `gh pr create --title "${title}" --body "${description}" --draft`;

    if (reviewers.length > 0) {
      const reviewerList = reviewers.join(',');
      prCommand += ` --reviewer ${reviewerList}`;
    }

    const output = execSync(prCommand, { encoding: 'utf8' });

    // Extract PR URL from output
    const prUrl = output
      .trim()
      .split('\n')
      .find((line) => line.startsWith('https://'));

    return {
      success: true,
      prUrl: prUrl || 'PR created successfully',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Retry logic for network/API errors
    if (
      retryCount < maxRetries &&
      (errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('API'))
    ) {
      const delay = baseDelay * 2 ** retryCount; // Exponential backoff
      console.log(
        `Retrying PR creation in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return createGitHubPR(title, description, artifactId, retryCount + 1);
    }

    return {
      success: false,
      error: `GitHub API error: ${errorMessage}`,
    };
  }
}

/**
 * Main submission function that orchestrates validation and PR creation
 * Supports both single artifact and batch processing
 */
export async function submitArtifact(
  options: SubmissionOptions,
): Promise<SubmissionResult> {
  const {
    artifactId,
    isNewArtifact = false,
    verbose = false,
    batchMode = false,
  } = options;
  const ids = Array.isArray(artifactId) ? artifactId : [artifactId];
  const isBatch = ids.length > 1 || batchMode;

  try {
    if (verbose) {
      if (isBatch) {
        console.log(
          `📋 Starting batch submission process for ${ids.length} artifacts...`,
        );
      } else {
        console.log(`📋 Starting submission process for ${ids[0]}...`);
      }
    }

    // Step 1: Run validation (batch or single)
    if (verbose) {
      console.log('🔍 Running validation...');
    }

    let validationSummary: string;
    let batchResults: BatchValidationResult[] | undefined;
    let validationErrors: string[] = [];

    if (isBatch) {
      const batchValidation = await validateArtifactBatch(ids);

      if (!batchValidation.allValid) {
        // Collect all errors for return
        validationErrors = batchValidation.batchResults.flatMap(
          (r) => r.errors,
        );

        return {
          success: false,
          message: 'Batch validation failed - PR creation blocked',
          validationErrors,
          batchResults: batchValidation.batchResults,
        };
      }

      validationSummary = batchValidation.summary;
      batchResults = batchValidation.batchResults;
    } else {
      const firstId = ids[0];
      if (!firstId) {
        throw new Error('No artifact ID provided');
      }
      const validation = await validateArtifact(firstId);

      if (!validation.isValid) {
        return {
          success: false,
          message: 'Validation failed - PR creation blocked',
          validationErrors: validation.errors,
        };
      }

      validationSummary = validation.summary;
    }

    if (verbose) {
      console.log('✅ Validation passed');
    }

    // Step 2: Generate PR content
    const titleInput = ids.length === 1 ? ids[0] || '' : ids;
    const title = generatePRTitle(titleInput, isNewArtifact);
    const description = generatePRDescription(
      titleInput,
      validationSummary,
      isNewArtifact,
      batchResults,
    );

    if (verbose) {
      console.log(`📝 Generated PR: ${title}`);
    }

    // Step 3: Create PR with retries
    if (verbose) {
      console.log('🚀 Creating GitHub PR...');
    }

    // For batch mode, use first artifact ID for reviewer assignment
    const firstId = ids[0];
    if (!firstId) {
      throw new Error('No artifact ID provided for PR creation');
    }
    const prResult = await createGitHubPR(title, description, firstId);

    if (!prResult.success) {
      return {
        success: false,
        message: 'Failed to create PR',
        error: prResult.error,
      };
    }

    return {
      success: true,
      message: isBatch
        ? `Batch PR created successfully for ${ids.length} artifacts`
        : 'PR created successfully',
      prUrl: prResult.prUrl,
      batchResults,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Submission failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

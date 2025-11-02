import { PRManager } from '@kodebase/git-ops';
import type { Artifact } from '@kodebase/core';
import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import simpleGit from 'simple-git';
import { ensureGitRepository } from '../integrations/git-ops.js';
import { ArtifactLoader } from '../utils/artifact-loader.js';

/**
 * PR Command Component
 *
 * Implements the 'kodebase pr' command for creating and updating pull requests.
 *
 * Command syntax: `kodebase pr [--ready]`
 *
 * @description
 * This command automates the process of creating or updating pull requests for artifact branches by:
 * 1. Detecting the current branch and mapping it to an artifact ID
 * 2. Loading artifact data for context generation
 * 3. Using PRManager from git-ops to handle PR operations
 * 4. Generating PR title from artifact title
 * 5. Creating PR description with artifact context and acceptance criteria
 * 6. Supporting --ready flag to mark PR as ready for review
 * 7. Creating draft PR by default
 * 8. Updating existing PR if one already exists
 * 9. Showing PR URL after creation/update
 *
 * @example
 * ```bash
 * kodebase pr              # Create or update PR as draft
 * kodebase pr --ready      # Create or update PR and mark ready for review
 * ```
 */

export interface PRCommandProps {
  /** Mark PR as ready for review */
  ready?: boolean;
  /** Enable verbose output and error details */
  verbose?: boolean;
}

/**
 * Internal result interface for the PR command execution
 * @internal
 */
interface PRResult {
  /** Whether the PR operation completed successfully */
  success: boolean;
  /** PR URL if successfully created/updated */
  prUrl?: string;
  /** PR number if available */
  prNumber?: number;
  /** Operation performed (create or update) */
  operation?: 'create' | 'update';
  /** Error message if operation failed */
  error?: string;
  /** Artifact ID that was processed */
  artifactId?: string;
}

/**
 * Main PR Command Component
 */
export const PR: FC<PRCommandProps> = ({ ready = false, verbose = false }) => {
  const [result, setResult] = useState<PRResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handlePRCommand = async () => {
      try {
        // Ensure we're in a git repository
        await ensureGitRepository();

        // Initialize git client and PR manager
        const git = simpleGit();
        const prManager = new PRManager();

        // Get current branch and extract artifact ID
        const branchInfo = await git.branchLocal();
        const currentBranch = branchInfo.current;

        if (!currentBranch) {
          setResult({
            success: false,
            error:
              'Could not determine current branch. Make sure you are on a feature branch.',
          });
          return;
        }

        const artifactMatch = currentBranch.match(/^([A-Z]+(?:\.[0-9]+)*)/);

        if (!artifactMatch) {
          setResult({
            success: false,
            error: `Current branch '${currentBranch}' does not match artifact ID pattern (e.g., A.1.5, D.2.4)`,
          });
          return;
        }

        const artifactId = artifactMatch[1];

        if (!artifactId) {
          setResult({
            success: false,
            error: 'Failed to extract artifact ID from branch name',
          });
          return;
        }

        // Load artifact data
        const artifactLoader = new ArtifactLoader();
        const artifact = (await artifactLoader.loadArtifact(
          artifactId,
        )) as Artifact;

        // Generate PR title from artifact title
        const prTitle = `${artifactId}: ${artifact.metadata.title}`;

        // Create basic PR description with artifact context
        let prBody = `## Summary

`;

        // Handle different artifact types for summary
        if ('summary' in artifact.content) {
          prBody += artifact.content.summary;
        } else if ('vision' in artifact.content) {
          prBody += artifact.content.vision;
        } else {
          prBody += 'No summary provided';
        }

        prBody += `

## Acceptance Criteria

`;

        // Handle acceptance criteria for issues
        if (
          'acceptance_criteria' in artifact.content &&
          artifact.content.acceptance_criteria
        ) {
          const criteriaList = artifact.content.acceptance_criteria
            .map((criteria) => {
              if (typeof criteria === 'string') {
                return `- [ ] ${criteria}`;
              }
              // For complex criteria, just stringify for now
              return `- [ ] ${JSON.stringify(criteria)}`;
            })
            .join('\n');
          prBody += criteriaList;
        } else {
          prBody += 'No acceptance criteria defined';
        }

        // Add technical notes if available (from notes field)
        if (
          artifact.notes &&
          typeof artifact.notes === 'object' &&
          'technical_notes' in artifact.notes
        ) {
          prBody += `

## Technical Notes

${artifact.notes.technical_notes}`;
        }

        prBody += `

---
*This PR was generated automatically by the kodebase CLI*`;

        // Get repository path (current working directory)
        const repoPath = process.cwd();

        // Check if PR already exists for this branch
        const existingPRs = await prManager.listPRs(repoPath, {
          branch: currentBranch,
          state: 'open',
        });

        let operation: 'create' | 'update' = 'create';
        let prUrl: string | undefined;
        let prNumber: number | undefined;

        if (existingPRs && existingPRs.length > 0) {
          // Update existing PR
          operation = 'update';
          const existingPR = existingPRs[0];
          if (existingPR) {
            prNumber = existingPR.number;

            const updateResult = await prManager.updatePR({
              prNumber: existingPR.number,
              title: prTitle,
              body: prBody,
              ready,
              repoPath,
            });

            if (!updateResult.success) {
              setResult({
                success: false,
                error: updateResult.error || 'Failed to update PR',
                artifactId,
              });
              return;
            }

            prUrl = existingPR.url;
          }
        } else {
          // Create new PR
          const createResult = await prManager.createDraftPR({
            title: prTitle,
            body: prBody,
            draft: !ready,
            repoPath,
            branch: currentBranch,
          });

          if (!createResult.success) {
            setResult({
              success: false,
              error: createResult.error || 'Failed to create PR',
              artifactId,
            });
            return;
          }

          prUrl = createResult.prUrl;
          prNumber = createResult.prNumber;

          // If --ready flag was used, mark the PR as ready
          if (ready && prNumber) {
            await prManager.updatePR({
              prNumber,
              ready: true,
              repoPath,
            });
          }
        }

        setResult({
          success: true,
          prUrl,
          prNumber,
          operation,
          artifactId,
        });
      } catch (error) {
        setResult({
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      } finally {
        setIsLoading(false);
      }
    };

    handlePRCommand();
  }, [ready]);

  // Loading state
  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text color="blue">🔄 Processing PR operation...</Text>
        <Text color="gray">• Detecting current branch and artifact ID</Text>
        <Text color="gray">• Loading artifact data</Text>
        <Text color="gray">
          •{' '}
          {ready
            ? 'Creating/updating PR as ready for review'
            : 'Creating/updating draft PR'}
        </Text>
      </Box>
    );
  }

  // Error state
  if (!result?.success) {
    return (
      <Box flexDirection="column">
        <Text color="red">✗ PR operation failed</Text>
        <Text color="red">{result?.error || 'Unknown error'}</Text>
        {verbose && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="gray">Debugging information:</Text>
            <Text color="gray">• Branch detection and artifact ID mapping</Text>
            <Text color="gray">• Artifact loading and validation</Text>
            <Text color="gray">• PR creation/update operation</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Success state
  return (
    <Box flexDirection="column">
      <Text color="green">
        ✓ PR {result.operation === 'create' ? 'created' : 'updated'}{' '}
        successfully
      </Text>

      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text color="cyan">Artifact:</Text> {result.artifactId}
        </Text>
        <Text>
          <Text color="cyan">Operation:</Text>{' '}
          {result.operation === 'create'
            ? 'Created new PR'
            : 'Updated existing PR'}
        </Text>
        <Text>
          <Text color="cyan">Status:</Text>{' '}
          {ready ? 'Ready for review' : 'Draft'}
        </Text>
        {result.prNumber && (
          <Text>
            <Text color="cyan">PR Number:</Text> #{result.prNumber}
          </Text>
        )}
        <Text>
          <Text color="cyan">URL:</Text> {result.prUrl}
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="green">Next steps:</Text>
        {ready ? (
          <Text color="gray">• PR is ready for review - wait for approval</Text>
        ) : (
          <>
            <Text color="gray">• Continue working on your implementation</Text>
            <Text color="gray">
              • Use 'kodebase pr --ready' when ready for review
            </Text>
          </>
        )}
        <Text color="gray">
          • PR will be automatically updated with future commits
        </Text>
      </Box>
    </Box>
  );
};

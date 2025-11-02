import { BranchCreator } from '@kodebase/git-ops';
import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import simpleGit from 'simple-git';
import {
  ensureGitRepository,
  withGitOpsErrorHandling,
} from '../integrations/git-ops.js';
import { ArtifactLoader } from '../utils/artifact-loader.js';

/**
 * Start Command Component
 *
 * Implements the 'kodebase start' command for creating feature branches and beginning work on artifacts.
 *
 * Command syntax: `kodebase start <artifact-id>`
 *
 * @description
 * This command automates the process of starting development work on a Kodebase artifact by:
 * 1. Validating the artifact exists and is in 'ready' status
 * 2. Using BranchCreator from git-ops to create a feature branch with validated naming
 * 3. Creating branch with exact artifact ID as name (e.g., 'D.2.2')
 * 4. Automatically checking out to the new branch
 * 5. Triggering post-checkout hooks that update artifact status to 'in_progress'
 * 6. Providing clear next steps for the development workflow
 *
 * @example
 * ```bash
 * kodebase start D.2.2        # Start work on issue D.2.2
 * kodebase start A.1.5        # Start work on issue A.1.5
 * kodebase start D.2.2 --verbose  # Start with detailed output
 * ```
 *
 * @see {@link https://github.com/kodebaseai/kodebase/blob/main/packages/cli/docs/start-command.md} Full documentation
 */

export interface StartCommandProps {
  /** Artifact ID to start work on (e.g., 'A.1.5') */
  artifactId: string;
  /** Enable verbose output and error details */
  verbose?: boolean;
  /** Submit PR after starting work */
  submit?: boolean;
}

/**
 * Internal result interface for the Start command execution
 * @internal
 */
interface StartResult {
  /** Whether the start operation completed successfully */
  success: boolean;
  /** User-facing message to display */
  message: string;
  /** Name of the created branch (on success) */
  branchName?: string;
  /** Error message (on failure) */
  error?: string;
}

export const Start: FC<StartCommandProps> = ({
  artifactId,
  verbose,
  submit,
}) => {
  const [result, setResult] = useState<StartResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleStartCommand = async () => {
      try {
        // Ensure we're in a git repository
        ensureGitRepository();

        // Load and validate artifact
        const loader = new ArtifactLoader();
        const artifact = await loader.loadArtifact(artifactId);

        // Check artifact status - must be 'ready'
        const latestEvent = artifact.metadata.events.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )[0];

        if (!latestEvent || latestEvent.event !== 'ready') {
          throw new Error(
            `Artifact ${artifactId} is not ready. Current status: ${latestEvent?.event || 'unknown'}. ` +
              'Only artifacts with status "ready" can be started.',
          );
        }

        // Create branch using git-ops BranchCreator
        const git = simpleGit();
        const branchCreator = new BranchCreator(git);

        const branchInfo = await withGitOpsErrorHandling(
          () =>
            branchCreator.create({
              artifactId,
              checkout: true, // Switch to the new branch
              push: false, // Don't push immediately - user can do this manually
              track: false, // Don't set up tracking yet
            }),
          'branch creation',
        );

        // Handle --submit flag after successful branch creation
        if (submit) {
          try {
            const { submitArtifact } = await import('../utils/submission.js');

            console.log('\n📋 Starting submission process...');

            const submissionResult = await submitArtifact({
              artifactId,
              isNewArtifact: false,
              verbose: verbose || false,
            });

            if (submissionResult.success) {
              setResult({
                success: true,
                message: `Started work on ${artifactId} and created PR`,
                branchName: branchInfo.name,
              });
              console.log(`✅ ${submissionResult.message}`);
              if (submissionResult.prUrl) {
                console.log(`🔗 PR: ${submissionResult.prUrl}`);
              }
            } else {
              // Branch creation succeeded but PR creation failed
              console.error(`❌ ${submissionResult.message}`);
              if (submissionResult.validationErrors) {
                console.error('Validation errors:');
                submissionResult.validationErrors.forEach((error) =>
                  console.error(`  - ${error}`),
                );
              }
              if (submissionResult.error) {
                console.error(`Error: ${submissionResult.error}`);
              }

              setResult({
                success: true,
                message: `Started work on ${artifactId} (PR creation failed)`,
                branchName: branchInfo.name,
              });
            }
          } catch (error) {
            console.error(
              `Failed to submit PR: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            setResult({
              success: true,
              message: `Started work on ${artifactId} (PR creation failed)`,
              branchName: branchInfo.name,
            });
          }
        } else {
          setResult({
            success: true,
            message: `Started work on ${artifactId}`,
            branchName: branchInfo.name,
          });
        }
      } catch (error) {
        setResult({
          success: false,
          message: `Failed to start work on ${artifactId}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    handleStartCommand();
  }, [artifactId, submit, verbose]);

  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text>Starting work on {artifactId}...</Text>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box flexDirection="column">
        <Text color="red">Unexpected error occurred</Text>
      </Box>
    );
  }

  if (result.success) {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ {result.message}</Text>
        {result.branchName && (
          <>
            <Text>
              Created and switched to branch:{' '}
              <Text color="blue">{result.branchName}</Text>
            </Text>
            <Text></Text>
            <Text color="gray">Next steps:</Text>
            <Text color="gray">1. Make your changes</Text>
            <Text color="gray">
              2. Commit with message: "{artifactId}: feat: ..."
            </Text>
            <Text color="gray">
              3. Push when ready: git push -u origin {result.branchName}
            </Text>
          </>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="red">✗ {result.message}</Text>
      {result.error && <Text color="red">{result.error}</Text>}
      {verbose && result.error && (
        <Box marginTop={1}>
          <Text color="gray">Error details: {result.error}</Text>
        </Box>
      )}
    </Box>
  );
};

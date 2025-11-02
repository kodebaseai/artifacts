import type { ArtifactSchema } from '@kodebase/core';
import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { ReadyCommandProps } from '../types/command.js';
import { ArtifactLoader } from '../utils/artifact-loader.js';

/**
 * Ready Command Component
 *
 * Implements the 'kodebase ready' command for transitioning artifacts from draft to ready status.
 *
 * Command syntax: `kodebase ready <artifact-id>`
 *
 * @description
 * This command validates and transitions a draft artifact to ready status by:
 * 1. Loading and validating the artifact exists and is in 'draft' status
 * 2. Checking for blocking dependencies (blocked_by relationships)
 * 3. Validating all required fields are present
 * 4. Showing confirmation prompt before making changes
 * 5. Updating artifact status to 'ready' with new event
 * 6. Providing clear feedback on success or failure
 *
 * @example
 * ```bash
 * kodebase ready D.2.3        # Mark issue D.2.3 as ready
 * kodebase ready A.1.5        # Mark issue A.1.5 as ready
 * kodebase ready D.2.3 --verbose  # Mark as ready with detailed output
 * ```
 *
 * @see {@link https://github.com/kodebaseai/kodebase/blob/main/packages/cli/docs/ready-command.md} Full documentation
 */

/**
 * Internal result interface for the Ready command execution
 * @internal
 */
interface ReadyResult {
  /** Whether the ready operation completed successfully */
  success: boolean;
  /** User-facing message to display */
  message: string;
  /** Error message (on failure) */
  error?: string;
}

/**
 * Command state for handling confirmation flow
 * @internal
 */
type CommandState =
  | 'loading'
  | 'confirming'
  | 'processing'
  | 'completed'
  | 'error';

interface ConfirmationData {
  artifact: ArtifactSchema;
  artifactId: string;
}

export const Ready: FC<ReadyCommandProps> = ({ artifactId, verbose }) => {
  const [state, setState] = useState<CommandState>('loading');
  const [result, setResult] = useState<ReadyResult | null>(null);
  const [confirmationData, setConfirmationData] =
    useState<ConfirmationData | null>(null);

  // Load and validate artifact on component mount
  useEffect(() => {
    const validateArtifact = async () => {
      try {
        setState('loading');

        // Initialize artifact loader
        const loader = new ArtifactLoader();

        // Load and validate artifact exists
        const artifact = await loader.loadArtifact(artifactId);

        // Check current status - must be 'draft'
        const latestEvent = artifact.metadata.events.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )[0];

        if (!latestEvent || latestEvent.event !== 'draft') {
          throw new Error(
            `Artifact ${artifactId} is not in draft status. Current status: ${latestEvent?.event || 'unknown'}. ` +
              'Only artifacts with status "draft" can be marked as ready.',
          );
        }

        // Check for blocking dependencies
        if (
          artifact.metadata.relationships?.blocked_by &&
          artifact.metadata.relationships.blocked_by.length > 0
        ) {
          throw new Error(
            `Artifact ${artifactId} has blocking dependencies: ${artifact.metadata.relationships.blocked_by.join(', ')}. ` +
              'Resolve these blockers before marking as ready.',
          );
        }

        // Validate required fields are present
        const missingFields: string[] = [];

        if (!artifact.metadata.title || artifact.metadata.title.trim() === '') {
          missingFields.push('title');
        }

        // Check for content-specific required fields based on artifact type
        if (artifact.metadata.schema_version && artifact.content) {
          const content = artifact.content as Record<string, unknown>;

          // For issues, check acceptance criteria
          if (artifactId.split('.').length === 3) {
            // This is an issue (has exactly 3 parts: Initiative.Milestone.Issue)
            if (
              !content.acceptance_criteria ||
              (Array.isArray(content.acceptance_criteria) &&
                content.acceptance_criteria.length === 0)
            ) {
              missingFields.push('acceptance_criteria');
            }
          }
        }

        if (missingFields.length > 0) {
          throw new Error(
            `Artifact ${artifactId} is missing required fields: ${missingFields.join(', ')}. ` +
              'Complete these fields before marking as ready.',
          );
        }

        // All validation passed - show confirmation
        setConfirmationData({ artifact, artifactId });
        setState('confirming');
      } catch (error) {
        setResult({
          success: false,
          message: `Failed to mark ${artifactId} as ready`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setState('error');
      }
    };

    validateArtifact();
  }, [artifactId]);

  // Handle confirmation and processing
  const processReady = async () => {
    if (!confirmationData) return;

    try {
      setState('processing');
      const { artifact } = confirmationData;

      // Get git actor information
      const { execSync } = await import('node:child_process');
      const gitName = execSync('git config user.name', {
        encoding: 'utf8',
      }).trim();
      const gitEmail = execSync('git config user.email', {
        encoding: 'utf8',
      }).trim();
      const actor = `${gitName} (${gitEmail})`;

      // Create the ready event
      const timestamp = new Date().toISOString();

      const readyEvent = {
        event: 'ready' as const,
        timestamp,
        actor,
        trigger: 'manual' as const,
      };

      // Add the event to the artifact
      artifact.metadata.events.push(readyEvent);

      // Save the updated artifact back to filesystem
      const { writeFileSync } = await import('node:fs');
      const { readdir } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const yaml = await import('yaml');

      // Get file path - implement simplified path resolution
      const artifactsRoot = '.kodebase/artifacts';
      const parts = artifactId.split('.');
      let filePath: string;

      if (parts.length === 3) {
        // Issue (e.g., 'D.2.3')
        const [initiativeId, milestoneNumber] = parts;
        const milestoneId = `${initiativeId}.${milestoneNumber}`;

        const folders = await readdir(artifactsRoot);
        const initiativeFolder = folders.find((folder) =>
          folder.startsWith(`${initiativeId}.`),
        );

        if (!initiativeFolder) {
          throw new Error(`Initiative folder not found for ID: ${artifactId}`);
        }

        const milestoneFolders = await readdir(
          join(artifactsRoot, initiativeFolder),
        );
        const milestoneFolder = milestoneFolders.find((folder) =>
          folder.startsWith(`${milestoneId}.`),
        );

        if (!milestoneFolder) {
          throw new Error(`Milestone folder not found for ID: ${artifactId}`);
        }

        filePath = join(
          artifactsRoot,
          initiativeFolder,
          milestoneFolder,
          `${artifactId}.yml`,
        );
      } else {
        throw new Error(
          `Unsupported artifact ID format for saving: ${artifactId}`,
        );
      }

      const yamlContent = yaml.stringify(artifact, {
        indent: 2,
        lineWidth: 0,
        minContentWidth: 0,
      });
      writeFileSync(filePath, yamlContent, 'utf8');

      setResult({
        success: true,
        message: `Artifact ${artifactId} marked as ready`,
      });
      setState('completed');
    } catch (error) {
      setResult({
        success: false,
        message: `Failed to mark ${artifactId} as ready`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setState('error');
    }
  };

  // Handle user input for confirmation
  useInput((input, key) => {
    if (state === 'confirming') {
      if (input === 'y' || input === 'Y' || key.return) {
        processReady();
      } else if (input === 'n' || input === 'N' || key.escape) {
        setResult({
          success: false,
          message: `Operation cancelled by user`,
        });
        setState('error');
      }
    }
  });

  // Loading state
  if (state === 'loading') {
    return (
      <Box flexDirection="column">
        <Text>Validating {artifactId}...</Text>
      </Box>
    );
  }

  // Confirmation state
  if (state === 'confirming' && confirmationData) {
    const { artifact } = confirmationData;
    return (
      <Box flexDirection="column">
        <Text bold>Ready to mark artifact as ready?</Text>
        <Text></Text>
        <Text color="cyan">Artifact: {artifactId}</Text>
        <Text color="gray">Title: {artifact.metadata.title}</Text>
        <Text color="gray">
          Current status:{' '}
          {artifact.metadata.events[artifact.metadata.events.length - 1]
            ?.event || 'unknown'}
        </Text>
        <Text></Text>
        <Text>This will:</Text>
        <Text color="gray">• Change status from 'draft' to 'ready'</Text>
        <Text color="gray">• Add a ready event to the artifact</Text>
        <Text color="gray">• Save the updated artifact file</Text>
        <Text></Text>
        <Text>
          Press <Text color="green">Y</Text> to continue,{' '}
          <Text color="red">N</Text> to cancel:
        </Text>
      </Box>
    );
  }

  // Processing state
  if (state === 'processing') {
    return (
      <Box flexDirection="column">
        <Text>Marking {artifactId} as ready...</Text>
      </Box>
    );
  }

  // Error state
  if (state === 'error' && result) {
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
  }

  // Success state
  if (state === 'completed' && result && result.success) {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ {result.message}</Text>
        <Text></Text>
        <Text color="gray">Next steps:</Text>
        <Text color="gray">
          1. Start work: <Text color="blue">kodebase start {artifactId}</Text>
        </Text>
        <Text color="gray">
          2. Or assign to someone: Update assignee in artifact file
        </Text>
      </Box>
    );
  }

  // Fallback
  return (
    <Box flexDirection="column">
      <Text color="red">Unexpected error occurred</Text>
    </Box>
  );
};

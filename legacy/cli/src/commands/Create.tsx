import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { WizardFlow } from '../components/wizard/WizardFlow.js';
import type { CreateCommandProps } from '../types/command.js';
import { createArtifact } from '../utils/artifact-creator.js';

/**
 * Create Command Component
 *
 * Implements the 'kodebase create' command for creating new artifacts with intelligent type detection.
 *
 * Command syntax: `kodebase create [parent_id] <idea>`
 *
 * @description
 * This command automates artifact creation with proper metadata, events, and file organization:
 * - Intelligently determines artifact type based on parent ID
 * - Generates next available ID in sequence
 * - Creates properly structured YAML files with schema validation
 * - Sets up initial draft event with git user information
 * - Organizes files in milestone-oriented directory structure
 *
 * @example
 * ```bash
 * kodebase create "Build user authentication"        # Creates initiative
 * kodebase create A "API development milestone"       # Creates milestone under A
 * kodebase create A.1 "Implement login endpoint"      # Creates issue under A.1
 * ```
 *
 * **Auto-detection Logic:**
 * - No parent_id → Initiative (A, B, C...)
 * - Initiative ID (A, B, C) → Milestone (A.1, B.2...)
 * - Milestone ID (A.1, B.2) → Issue (A.1.1, B.2.3...)
 *
 * @see {@link https://github.com/kodebaseai/kodebase/blob/main/packages/cli/src/commands/create-command.md} Full documentation
 */
export const Create: FC<CreateCommandProps> = ({
  parentId,
  idea,
  wizard,
  verbose,
  submit,
}) => {
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    filePath?: string;
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(!wizard);

  useEffect(() => {
    // Only run the effect for non-wizard mode when idea is provided
    if (!wizard && idea) {
      const handleCreateArtifact = async () => {
        try {
          const createResult = await createArtifact(parentId, idea, undefined, {
            submit,
          });
          setResult({
            success: true,
            message: `Created ${createResult.type} successfully`,
            filePath: createResult.filePath,
          });
        } catch (error) {
          setResult({
            success: false,
            message: `Failed to create artifact`,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } finally {
          setIsLoading(false);
        }
      };

      handleCreateArtifact();
    }
  }, [parentId, idea, wizard, submit]);

  // If wizard mode is enabled, render the wizard component
  if (wizard) {
    return <WizardFlow verbose={verbose} submit={submit} />;
  }

  // Validate required arguments for normal mode
  if (!idea) {
    return (
      <Box flexDirection="column">
        <Text color="red">
          ✗ Idea description is required for direct creation
        </Text>
        <Text>Use --wizard flag for interactive mode or provide an idea</Text>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text>Creating artifact...</Text>
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
        {result.filePath && <Text>Created file: {result.filePath}</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="red">✗ {result.message}</Text>
      {result.error && <Text color="red">{result.error}</Text>}
    </Box>
  );
};

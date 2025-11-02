import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import { useState } from 'react';
import type { StepComponentProps } from '../types.js';
import {
  createArtifact,
  type WizardArtifactData,
} from '../../../utils/artifact-creator.js';

type ConfirmationState = 'confirming' | 'creating' | 'success' | 'error';

/**
 * Confirmation Step Component
 *
 * Final step of the wizard - handles artifact creation and shows results.
 * Confirms with user before writing to filesystem.
 * Shows creation progress and final success/error state.
 */
export const ConfirmationStep: FC<StepComponentProps> = ({
  state,
  onCancel,
  submit,
}) => {
  const [confirmationState, setConfirmationState] =
    useState<ConfirmationState>('confirming');
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    filePath?: string;
    artifactId?: string;
    error?: string;
  } | null>(null);

  useInput((input, key) => {
    if (confirmationState === 'confirming') {
      if (input === 'y' || input === 'Y' || key.return) {
        handleCreateArtifact();
      } else if (input === 'n' || input === 'N' || key.escape) {
        onCancel();
      }
    } else if (
      confirmationState === 'success' ||
      confirmationState === 'error'
    ) {
      // Exit on any key after completion
      process.exit(confirmationState === 'success' ? 0 : 1);
    }
  });

  const handleCreateArtifact = async () => {
    setConfirmationState('creating');

    try {
      // Convert wizard state to createArtifact parameters
      // Pass wizard data as first parameter (new calling pattern)
      const wizardData: WizardArtifactData = {
        type: state.artifactType || 'issue',
        title: state.title,
        assignee: state.assignee,
        priority: state.priority,
        estimation: state.estimation,
        description: state.description,
        acceptanceCriteria: state.acceptanceCriteria,
        blocks: state.blocks,
        blockedBy: state.blockedBy,
        parentId: state.parentId,
      };

      // Create the artifact using enhanced utility with wizard data
      const createResult = await createArtifact(
        wizardData,
        undefined,
        undefined,
        { submit },
      );

      setResult({
        success: true,
        message: `Created ${createResult.type} successfully`,
        filePath: createResult.filePath,
        artifactId: createResult.id,
      });
      setConfirmationState('success');
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to create artifact',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setConfirmationState('error');
    }
  };

  const getArtifactSummary = () => {
    return `${state.artifactType}: ${state.title}`;
  };

  const renderConfirmation = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Step 6: Create Artifact
      </Text>
      <Text color="gray">Confirm creation and write to filesystem</Text>
      <Text></Text>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="yellow"
        paddingX={1}
        paddingY={1}
      >
        <Text bold color="yellow">
          ⚠️ FINAL CONFIRMATION
        </Text>
        <Text></Text>
        <Text color="white">
          Ready to create:{' '}
          <Text bold color="cyan">
            {getArtifactSummary()}
          </Text>
        </Text>
        <Text></Text>
        <Text color="gray">This will:</Text>
        <Box marginLeft={2}>
          <Text color="white">• Generate a new artifact ID</Text>
          <Text color="white">• Create YAML file in .kodebase/artifacts/</Text>
          <Text color="white">• Set initial status to 'draft'</Text>
          <Text color="white">• Record creation event</Text>
        </Box>
      </Box>

      <Text></Text>
      <Box>
        <Text>Press </Text>
        <Text color="green" bold>
          Y
        </Text>
        <Text> to create, </Text>
        <Text color="red" bold>
          N
        </Text>
        <Text> to cancel: </Text>
      </Box>
    </Box>
  );

  const renderCreating = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Creating Artifact...
      </Text>
      <Text></Text>
      <Box>
        <Text color="yellow">🔄 Generating artifact ID...</Text>
      </Box>
      <Box>
        <Text color="yellow">🔄 Creating directory structure...</Text>
      </Box>
      <Box>
        <Text color="yellow">🔄 Writing YAML file...</Text>
      </Box>
      <Box>
        <Text color="yellow">🔄 Recording creation event...</Text>
      </Box>
    </Box>
  );

  const renderSuccess = () => (
    <Box flexDirection="column">
      <Text bold color="green">
        ✅ Artifact Created Successfully!
      </Text>
      <Text></Text>

      {result && (
        <Box flexDirection="column">
          <Box>
            <Text color="gray">Artifact ID: </Text>
            <Text color="cyan" bold>
              {result.artifactId}
            </Text>
          </Box>
          <Box>
            <Text color="gray">File Path: </Text>
            <Text color="white">{result.filePath}</Text>
          </Box>
          <Text></Text>

          <Text bold color="cyan">
            Next Steps:
          </Text>
          <Box marginLeft={2}>
            <Text color="white">
              1. Review your artifact:{' '}
              <Text color="cyan">kodebase status {result.artifactId}</Text>
            </Text>
            <Text color="white">
              2. Make it ready:{' '}
              <Text color="cyan">kodebase ready {result.artifactId}</Text>
            </Text>
            <Text color="white">
              3. Start working:{' '}
              <Text color="cyan">kodebase start {result.artifactId}</Text>
            </Text>
          </Box>
        </Box>
      )}

      <Text></Text>
      <Text color="gray">Press any key to exit...</Text>
    </Box>
  );

  const renderError = () => (
    <Box flexDirection="column">
      <Text bold color="red">
        ❌ Failed to Create Artifact
      </Text>
      <Text></Text>

      {result && (
        <Box flexDirection="column">
          <Text color="red">{result.message}</Text>
          {result.error && (
            <Box marginTop={1}>
              <Text color="gray">Error details: </Text>
              <Text color="red">{result.error}</Text>
            </Box>
          )}
        </Box>
      )}

      <Text></Text>
      <Text color="gray">Press any key to exit...</Text>
    </Box>
  );

  switch (confirmationState) {
    case 'confirming':
      return renderConfirmation();
    case 'creating':
      return renderCreating();
    case 'success':
      return renderSuccess();
    case 'error':
      return renderError();
    default:
      return <Text color="red">Unknown state</Text>;
  }
};

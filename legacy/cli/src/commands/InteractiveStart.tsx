import type { FC } from 'react';
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ArtifactPicker } from '../components/ArtifactPicker.js';
import { ArtifactPreview } from '../components/ArtifactPreview.js';
import { Start } from './Start.js';
import type { ArtifactSummary } from '../utils/artifact-loader.js';

/**
 * Interactive Start Command Component
 *
 * Demonstrates integration of the ArtifactPicker with existing commands.
 * Shows fuzzy-search artifact selection followed by the Start command execution.
 *
 * This serves as an example of AC5: "Integrates with commands that need artifact selection"
 */

export interface InteractiveStartProps {
  /** Optional filter by artifact type */
  filterType?: 'initiative' | 'milestone' | 'issue';
  /** Only show artifacts with specific statuses */
  filterStatus?: string[];
}

type CommandState = 'selecting' | 'previewing' | 'executing' | 'cancelled';

export const InteractiveStart: FC<InteractiveStartProps> = ({
  filterType,
  filterStatus = ['ready'], // Default to only ready artifacts for start command
}) => {
  const [commandState, setCommandState] = useState<CommandState>('selecting');
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  );
  const [selectedArtifact, setSelectedArtifact] =
    useState<ArtifactSummary | null>(null);

  const handlePreviewChange = (artifact: ArtifactSummary | null) => {
    setSelectedArtifact(artifact);
  };

  const handleArtifactSelect = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setCommandState('previewing');
  };

  const handleCancel = () => {
    setCommandState('cancelled');
  };

  const handleConfirm = () => {
    if (selectedArtifactId) {
      setCommandState('executing');
    }
  };

  const handleBack = () => {
    setCommandState('selecting');
    setSelectedArtifactId(null);
    setSelectedArtifact(null);
  };

  // Handle keyboard input for preview state
  useInput((input, key) => {
    if (commandState === 'previewing') {
      if (key.return) {
        handleConfirm();
      } else if (key.escape || input === 'b') {
        handleBack();
      }
    }
  });

  // Render based on current state
  switch (commandState) {
    case 'selecting':
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan" bold>
              Select an artifact to start working on:
            </Text>
          </Box>
          <Box flexDirection="row" gap={4}>
            <Box flexDirection="column" flexGrow={1}>
              <ArtifactPicker
                onSelect={handleArtifactSelect}
                onCancel={handleCancel}
                filterType={filterType}
                filterStatus={filterStatus}
                placeholder="Search for artifacts to start..."
                maxVisible={8}
                showPreview={true}
                onPreviewChange={handlePreviewChange}
              />
            </Box>

            {selectedArtifact && (
              <Box
                flexDirection="column"
                flexShrink={0}
                width={35}
                borderStyle="single"
                paddingX={1}
              >
                <Text color="yellow" bold>
                  Preview:
                </Text>
                <ArtifactPreview artifact={selectedArtifact} />
              </Box>
            )}
          </Box>
        </Box>
      );

    case 'previewing':
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan" bold>
              Confirm artifact selection:
            </Text>
          </Box>

          <Box flexDirection="row" gap={4}>
            <Box flexDirection="column" flexShrink={0} width={40}>
              <Text color="yellow" bold>
                Selected Artifact:
              </Text>
              {selectedArtifact && (
                <ArtifactPreview artifact={selectedArtifact} />
              )}
              {selectedArtifactId && !selectedArtifact && (
                <Text color="gray">ID: {selectedArtifactId}</Text>
              )}
            </Box>

            <Box flexDirection="column">
              <Text color="gray">
                This will create a new branch and start work on{' '}
                {selectedArtifactId}.
              </Text>
              <Text color="gray">
                The artifact status will be updated to 'in_progress'.
              </Text>
            </Box>
          </Box>

          <Box marginTop={2}>
            <Text color="gray">
              ENTER to start • ESC to go back • B to go back
            </Text>
          </Box>
        </Box>
      );

    case 'executing':
      return selectedArtifactId ? (
        <Start artifactId={selectedArtifactId} verbose={true} />
      ) : (
        <Text color="red">Error: No artifact selected</Text>
      );

    case 'cancelled':
      return (
        <Box>
          <Text color="yellow">Operation cancelled.</Text>
        </Box>
      );

    default:
      return (
        <Box>
          <Text color="red">Unknown command state</Text>
        </Box>
      );
  }
};

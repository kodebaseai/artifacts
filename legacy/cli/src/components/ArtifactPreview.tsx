import type React from 'react';
import { Box, Text } from 'ink';
import type { ArtifactSummary } from '../utils/artifact-loader.js';
import { StatusBadge } from './StatusBadge.js';

export interface ArtifactPreviewProps {
  artifact: ArtifactSummary | null;
}

/**
 * Preview component showing artifact details
 *
 * Displays key information about the selected artifact in a
 * clean, readable format following CLI UI patterns.
 */
export function ArtifactPreview({
  artifact,
}: ArtifactPreviewProps): React.JSX.Element {
  if (!artifact) {
    return (
      <Box>
        <Text color="gray">No artifact selected</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="cyan" bold>
          ID:{' '}
        </Text>
        <Text>{artifact.id}</Text>
      </Box>

      <Box>
        <Text color="cyan" bold>
          Title:{' '}
        </Text>
        <Text>{artifact.title}</Text>
      </Box>

      <Box>
        <Text color="cyan" bold>
          Type:{' '}
        </Text>
        <Text color="yellow">{artifact.type}</Text>
      </Box>

      <Box>
        <Text color="cyan" bold>
          Status:{' '}
        </Text>
        <StatusBadge status={artifact.status} />
      </Box>

      {artifact.assignee && (
        <Box>
          <Text color="cyan" bold>
            Assignee:{' '}
          </Text>
          <Text>{artifact.assignee}</Text>
        </Box>
      )}
    </Box>
  );
}

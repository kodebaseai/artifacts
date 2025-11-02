import { Box, Text } from 'ink';
import type { FC } from 'react';

interface RelationshipListProps {
  blocks: string[];
  blockedBy: string[];
  currentStatus?: string;
}

/**
 * Component for displaying artifact relationships (blocks/blocked_by)
 */
export const RelationshipList: FC<RelationshipListProps> = ({
  blocks,
  blockedBy,
  currentStatus,
}) => {
  if (blocks.length === 0 && blockedBy.length === 0) {
    return (
      <Box marginTop={1}>
        <Text dimColor>No relationships</Text>
      </Box>
    );
  }

  // Determine if dependencies are resolved based on status
  const isBlocked = currentStatus === 'blocked';
  const isCompleted = currentStatus === 'completed';
  const isInProgress =
    currentStatus === 'in_progress' || currentStatus === 'in_review';
  const dependenciesResolved = isCompleted || isInProgress;

  return (
    <Box flexDirection="column" marginTop={1}>
      {blocks.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow" bold>
            Blocks:
          </Text>
          {blocks.map((id) => (
            <Box key={id} marginLeft={2}>
              <Text>• {id}</Text>
            </Box>
          ))}
        </Box>
      )}

      {blockedBy.length > 0 && (
        <Box flexDirection="column">
          <Text
            color={isBlocked ? 'red' : dependenciesResolved ? 'green' : 'gray'}
            bold
          >
            {isBlocked ? 'Blocked by:' : 'Dependencies:'}
            {dependenciesResolved && <Text color="green"> ✓</Text>}
          </Text>
          {blockedBy.map((id) => (
            <Box key={id} marginLeft={2}>
              <Text color={dependenciesResolved ? 'green' : undefined}>
                • {id} {dependenciesResolved && '(resolved)'}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

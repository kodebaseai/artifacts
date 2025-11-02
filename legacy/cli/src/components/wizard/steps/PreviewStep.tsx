import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import type { StepComponentProps } from '../types.js';

/**
 * Preview Step Component
 *
 * Fifth step of the wizard - shows final artifact preview before creation.
 * Displays all collected information in a formatted preview.
 * Allows users to review and make final confirmation.
 */
export const PreviewStep: FC<StepComponentProps> = ({
  state,
  onNext,
  onBack,
  onCancel,
}) => {
  useInput((input, key) => {
    if (key.return || input === 'c' || input === 'C') {
      onNext();
    } else if (key.escape) {
      onCancel();
    } else if (input === 'b' || input === 'B') {
      onBack();
    }
  });

  const getArtifactTypeDescription = () => {
    switch (state.artifactType) {
      case 'initiative':
        return 'High-level goal or project';
      case 'milestone':
        return 'Major deliverable within an initiative';
      case 'issue':
        return 'Specific work item or task';
      default:
        return 'Unknown type';
    }
  };

  const getPriorityColor = () => {
    switch (state.priority) {
      case 'critical':
        return 'red';
      case 'high':
        return 'yellow';
      case 'medium':
        return 'blue';
      case 'low':
        return 'gray';
      default:
        return 'white';
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Step 5: Preview Artifact
      </Text>
      <Text color="gray">Review your artifact before creation</Text>
      <Text></Text>

      {/* Artifact Overview */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        paddingY={1}
      >
        <Text bold color="white">
          📄 {state.artifactType?.toUpperCase()} PREVIEW
        </Text>
        <Text color="gray" dimColor>
          {getArtifactTypeDescription()}
        </Text>
        <Text></Text>

        {/* Basic Information */}
        <Box flexDirection="column">
          <Text bold color="cyan">
            Basic Information
          </Text>
          <Box marginLeft={2}>
            <Text color="gray">Title: </Text>
            <Text color="white" bold>
              {state.title}
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text color="gray">Assignee: </Text>
            <Text color="white">{state.assignee}</Text>
          </Box>
          <Box marginLeft={2}>
            <Text color="gray">Priority: </Text>
            <Text color={getPriorityColor()} bold>
              {state.priority.toUpperCase()}
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text color="gray">Estimation: </Text>
            <Text color="yellow" bold>
              {state.estimation}
            </Text>
          </Box>
        </Box>

        <Text></Text>

        {/* Description */}
        <Box flexDirection="column">
          <Text bold color="cyan">
            Description
          </Text>
          <Box marginLeft={2}>
            <Text color="white">{state.description}</Text>
          </Box>
        </Box>

        <Text></Text>

        {/* Acceptance Criteria */}
        <Box flexDirection="column">
          <Text bold color="cyan">
            Acceptance Criteria ({state.acceptanceCriteria.length} items)
          </Text>
          {state.acceptanceCriteria.length > 0 ? (
            state.acceptanceCriteria.map((criteria, _index) => (
              <Box key={criteria} marginLeft={2}>
                <Text color="green">✓ </Text>
                <Text color="white">{criteria}</Text>
              </Box>
            ))
          ) : (
            <Box marginLeft={2}>
              <Text color="gray" dimColor>
                No acceptance criteria defined
              </Text>
            </Box>
          )}
        </Box>

        {/* Dependencies */}
        {(state.blocks.length > 0 || state.blockedBy.length > 0) && (
          <>
            <Text></Text>
            <Box flexDirection="column">
              <Text bold color="cyan">
                Dependencies
              </Text>

              {state.blockedBy.length > 0 && (
                <Box marginLeft={2}>
                  <Text color="red">⚠ Blocked by: </Text>
                  <Text color="white">{state.blockedBy.join(', ')}</Text>
                </Box>
              )}

              {state.blocks.length > 0 && (
                <Box marginLeft={2}>
                  <Text color="yellow">🔒 Blocks: </Text>
                  <Text color="white">{state.blocks.join(', ')}</Text>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      <Text></Text>

      {/* Validation Summary */}
      <Box flexDirection="column">
        <Text bold color="green">
          ✓ Validation Summary
        </Text>
        <Box marginLeft={2}>
          <Text color="green">• All required fields completed</Text>
          <Text color="green">• No validation errors</Text>
          <Text color="green">• Ready for creation</Text>
        </Box>
      </Box>

      <Text></Text>

      {/* Next Steps */}
      <Box flexDirection="column">
        <Text bold color="yellow">
          📝 What happens next?
        </Text>
        <Box marginLeft={2}>
          <Text color="white">1. Artifact will be created with a new ID</Text>
          <Text color="white">
            2. Files will be written to .kodebase/artifacts/
          </Text>
          <Text color="white">3. Initial 'draft' event will be recorded</Text>
          <Text color="white">
            4. You can use 'kodebase ready &lt;id&gt;' to start work
          </Text>
        </Box>
      </Box>

      <Text></Text>

      <Box>
        <Text color="green" bold>
          Press C to confirm and create
        </Text>
        <Text color="gray">, </Text>
        <Text color="yellow">B to go back</Text>
        <Text color="gray">, or </Text>
        <Text color="red">ESC to cancel</Text>
      </Box>
    </Box>
  );
};

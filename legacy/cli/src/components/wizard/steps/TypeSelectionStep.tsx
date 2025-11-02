import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import { useState } from 'react';
import type { ArtifactType } from '@kodebase/core';
import type { StepComponentProps } from '../types.js';

interface TypeOption {
  type: ArtifactType;
  label: string;
  description: string;
  example: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'initiative',
    label: 'Initiative',
    description: 'High-level goal or project (e.g., A, B, C)',
    example: 'Build user authentication system',
  },
  {
    type: 'milestone',
    label: 'Milestone',
    description: 'Major deliverable within an initiative (e.g., A.1, B.2)',
    example: 'API development milestone',
  },
  {
    type: 'issue',
    label: 'Issue',
    description: 'Specific work item or task (e.g., A.1.5, B.2.3)',
    example: 'Implement login endpoint',
  },
];

/**
 * Type Selection Step Component
 *
 * First step of the wizard - allows users to select artifact type.
 * Uses arrow keys for navigation and Enter to select.
 * Follows existing CLI interaction patterns.
 */
export const TypeSelectionStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
  onCancel,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_input, key) => {
    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < TYPE_OPTIONS.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (key.return) {
      const selectedOption = TYPE_OPTIONS[selectedIndex];
      if (selectedOption) {
        onUpdate({
          artifactType: selectedOption.type,
          // Clear parent ID when changing type
          parentId: undefined,
          errors: { ...state.errors, artifactType: '' },
        });
        onNext();
      }
    } else if (key.escape) {
      onCancel();
    }
  });

  const selectedType = TYPE_OPTIONS[selectedIndex];

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Step 1: Select Artifact Type
      </Text>
      <Text color="gray">Choose the type of artifact you want to create</Text>
      <Text></Text>

      {TYPE_OPTIONS.map((option, index) => (
        <Box key={option.type} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={index === selectedIndex ? 'green' : 'white'}>
              {index === selectedIndex ? '› ' : '  '}
            </Text>
            <Text
              bold={index === selectedIndex}
              color={index === selectedIndex ? 'green' : 'white'}
            >
              {option.label}
            </Text>
          </Box>
          <Box marginLeft={4}>
            <Text color="gray" dimColor>
              {option.description}
            </Text>
          </Box>
          <Box marginLeft={4}>
            <Text color="blue" italic>
              Example: {option.example}
            </Text>
          </Box>
        </Box>
      ))}

      <Text></Text>
      <Text color="gray">
        Use ↑↓ arrows to navigate, Enter to select, ESC to cancel
      </Text>

      {selectedType && (
        <Box marginTop={1}>
          <Text color="yellow">
            Selected: {selectedType.label} - {selectedType.description}
          </Text>
        </Box>
      )}
    </Box>
  );
};

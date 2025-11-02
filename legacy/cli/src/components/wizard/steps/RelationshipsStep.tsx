import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { FC } from 'react';
import { useState } from 'react';
import type { StepComponentProps } from '../types.js';

type Field = 'blocks' | 'blocked_by' | 'acceptance_criteria';

/**
 * Relationships Step Component
 *
 * Fourth step of the wizard - collects dependencies and acceptance criteria.
 * Allows users to specify blocking relationships and acceptance criteria.
 * Optional step - users can skip if no dependencies or simple criteria.
 */
export const RelationshipsStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
  onBack,
  onCancel,
}) => {
  const [currentField, setCurrentField] = useState<Field>(
    'acceptance_criteria',
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editingListIndex, setEditingListIndex] = useState(-1);

  const fields: Array<{
    key: Field;
    label: string;
    placeholder: string;
    type: 'list' | 'text_list';
    hint: string;
  }> = [
    {
      key: 'acceptance_criteria',
      label: 'Acceptance Criteria',
      placeholder: 'Add acceptance criteria...',
      type: 'text_list',
      hint: 'Specific, testable requirements (one per line)',
    },
    {
      key: 'blocks',
      label: 'Blocks (Optional)',
      placeholder: 'Add artifact IDs this blocks...',
      type: 'list',
      hint: 'Artifact IDs that depend on this (e.g., A.1.2, B.3.1)',
    },
    {
      key: 'blocked_by',
      label: 'Blocked By (Optional)',
      placeholder: 'Add artifact IDs this is blocked by...',
      type: 'list',
      hint: 'Artifact IDs this depends on (e.g., A.1.1, B.2.3)',
    },
  ];

  const currentFieldIndex = fields.findIndex((f) => f.key === currentField);
  const _currentFieldData = fields.find((f) => f.key === currentField);

  const getCurrentList = (field: Field): string[] => {
    switch (field) {
      case 'blocks':
        return state.blocks;
      case 'blocked_by':
        return state.blockedBy;
      case 'acceptance_criteria':
        return state.acceptanceCriteria;
    }
  };

  const updateList = (field: Field, newList: string[]) => {
    const updates: Partial<typeof state> = {
      errors: { ...state.errors, [field]: '' },
    };
    switch (field) {
      case 'blocks':
        updates.blocks = newList;
        break;
      case 'blocked_by':
        updates.blockedBy = newList;
        break;
      case 'acceptance_criteria':
        updates.acceptanceCriteria = newList;
        break;
    }
    onUpdate(updates);
  };

  useInput((input, key) => {
    if (!isEditing) {
      // Handle navigation mode
      if (key.upArrow && currentFieldIndex > 0) {
        const prevField = fields[currentFieldIndex - 1];
        if (prevField) setCurrentField(prevField.key);
      } else if (key.downArrow && currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        if (nextField) setCurrentField(nextField.key);
      } else if (key.return) {
        // Start editing - add new item to current list
        setEditValue('');
        setEditingListIndex(-1);
        setIsEditing(true);
      } else if (input === 'd' || input === 'D') {
        // Delete last item from current list
        const currentList = getCurrentList(currentField);
        if (currentList.length > 0) {
          const newList = currentList.slice(0, -1);
          updateList(currentField, newList);
        }
      } else if (key.tab) {
        // Move to next field or proceed if ready
        if (currentFieldIndex < fields.length - 1) {
          const nextField = fields[currentFieldIndex + 1];
          if (nextField) setCurrentField(nextField.key);
        } else if (isValidToNext()) {
          onNext();
        }
      } else if (key.escape) {
        onCancel();
      } else if (input === 'b' || input === 'B') {
        onBack();
      } else if (input === 'n' || input === 'N') {
        if (isValidToNext()) {
          onNext();
        }
      }
    }
  });

  const handleSubmit = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      const currentList = getCurrentList(currentField);
      let newList: string[];

      if (editingListIndex >= 0) {
        // Edit existing item
        newList = [...currentList];
        newList[editingListIndex] = trimmedValue;
      } else {
        // Add new item
        newList = [...currentList, trimmedValue];
      }

      updateList(currentField, newList);
    }
    setIsEditing(false);
    setEditValue('');
    setEditingListIndex(-1);
  };

  const isValidToNext = (): boolean => {
    // At minimum, need at least one acceptance criteria
    return state.acceptanceCriteria.length > 0;
  };

  const hasError = (field: Field): boolean => {
    return Boolean(state.errors[field]);
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Step 4: Relationships & Criteria
      </Text>
      <Text color="gray">
        Define acceptance criteria and optional dependencies
      </Text>
      <Text></Text>

      {fields.map((field) => {
        const currentList = getCurrentList(field.key);
        const isRequired = field.key === 'acceptance_criteria';

        return (
          <Box key={field.key} flexDirection="column" marginBottom={2}>
            <Box>
              <Text color={currentField === field.key ? 'green' : 'white'}>
                {currentField === field.key ? '› ' : '  '}
              </Text>
              <Text
                bold={currentField === field.key}
                color={
                  hasError(field.key)
                    ? 'red'
                    : currentField === field.key
                      ? 'green'
                      : 'white'
                }
              >
                {field.label}:
              </Text>
              {isRequired && <Text color="red"> *</Text>}
              <Text color="gray"> ({currentList.length} items)</Text>
            </Box>

            {/* Show current list items */}
            <Box flexDirection="column" marginLeft={4}>
              {currentList.length > 0 ? (
                currentList.map((item, _index) => (
                  <Text key={item} color="white">
                    • {item}
                  </Text>
                ))
              ) : (
                <Text color="gray" dimColor>
                  No items added yet
                </Text>
              )}
            </Box>

            {/* Show input area when editing current field */}
            {isEditing && currentField === field.key && (
              <Box marginLeft={4} marginTop={1}>
                <Text color="yellow">+ </Text>
                <TextInput
                  value={editValue}
                  onChange={setEditValue}
                  onSubmit={handleSubmit}
                  placeholder={field.placeholder}
                />
              </Box>
            )}

            {hasError(field.key) && (
              <Box marginLeft={4}>
                <Text color="red">✗ {state.errors[field.key]}</Text>
              </Box>
            )}

            {/* Show hint for current field when not editing */}
            {currentField === field.key && !isEditing && (
              <Box marginLeft={4} marginTop={1}>
                <Text color="blue" dimColor>
                  💡 {field.hint}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      <Text></Text>

      {isEditing ? (
        <Text color="gray">Type to add item, Enter to save, ESC to cancel</Text>
      ) : (
        <>
          <Text color="gray">
            Use ↑↓ arrows to navigate, Enter to add item, D to delete last item
          </Text>
          <Text color="gray">
            Press B to go back, N to continue
            {!isValidToNext() ? ' (add acceptance criteria)' : ''}
          </Text>
        </>
      )}

      {isValidToNext() && (
        <Box marginTop={1}>
          <Text color="green">✓ Ready to continue</Text>
        </Box>
      )}
    </Box>
  );
};

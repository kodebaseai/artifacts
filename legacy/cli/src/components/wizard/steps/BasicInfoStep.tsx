import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { FC } from 'react';
import { useState } from 'react';
import type { StepComponentProps } from '../types.js';

type Field = 'title' | 'assignee';

/**
 * Basic Information Step Component
 *
 * Second step of the wizard - collects title and assignee.
 * Uses tab/arrows to navigate between fields, Enter to proceed.
 * Includes live validation following CLI error patterns.
 */
export const BasicInfoStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
  onBack,
  onCancel,
}) => {
  const [currentField, setCurrentField] = useState<Field>('title');
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(state.title);
  const [assigneeValue, setAssigneeValue] = useState(state.assignee);

  const fields: Array<{
    key: Field;
    label: string;
    placeholder: string;
    required: boolean;
    hint: string;
  }> = [
    {
      key: 'title',
      label: 'Title',
      placeholder: 'Enter a descriptive title...',
      required: true,
      hint: '3-100 characters, clear and descriptive',
    },
    {
      key: 'assignee',
      label: 'Assignee',
      placeholder: 'Enter assignee email...',
      required: true,
      hint: 'Valid email address (e.g., user@domain.com)',
    },
  ];

  const currentFieldIndex = fields.findIndex((f) => f.key === currentField);

  useInput((input, key) => {
    if (!isEditing) {
      // Handle navigation mode only when not editing
      if (key.upArrow && currentFieldIndex > 0) {
        const prevField = fields[currentFieldIndex - 1];
        if (prevField) setCurrentField(prevField.key);
      } else if (key.downArrow && currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        if (nextField) setCurrentField(nextField.key);
      } else if (key.return) {
        setIsEditing(true);
      } else if (key.tab) {
        // Move to next field or proceed if all fields completed
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
      const error = validateField(currentField, trimmedValue);
      onUpdate({
        [currentField]: trimmedValue,
        errors: { ...state.errors, [currentField]: error },
      });
    }
    setIsEditing(false);
  };

  const validateField = (field: Field, value: string): string => {
    switch (field) {
      case 'title':
        if (!value.trim()) return 'Title is required';
        if (value.trim().length < 3)
          return 'Title must be at least 3 characters';
        if (value.trim().length > 100)
          return 'Title must be less than 100 characters';
        return '';
      case 'assignee': {
        if (!value.trim()) return 'Assignee is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim()))
          return 'Please enter a valid email address';
        return '';
      }
      default:
        return '';
    }
  };

  const isValidToNext = (): boolean => {
    const titleError = validateField('title', state.title);
    const assigneeError = validateField('assignee', state.assignee);
    return !titleError && !assigneeError;
  };

  const getFieldValue = (field: Field): string => {
    return state[field];
  };

  const hasError = (field: Field): boolean => {
    return Boolean(state.errors[field]);
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Step 2: Basic Information
      </Text>
      <Text color="gray">
        Enter the basic details for your {state.artifactType}
      </Text>
      <Text></Text>

      {fields.map((field) => (
        <Box key={field.key} flexDirection="column" marginBottom={1}>
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
            <Text color={field.required ? 'red' : 'gray'}>
              {' '}
              {field.required ? '*' : ''}
            </Text>
          </Box>

          <Box marginLeft={4}>
            {isEditing && currentField === field.key ? (
              <TextInput
                value={field.key === 'title' ? titleValue : assigneeValue}
                onChange={(value) => {
                  if (field.key === 'title') {
                    setTitleValue(value);
                  } else {
                    setAssigneeValue(value);
                  }
                }}
                onSubmit={() =>
                  handleSubmit(
                    field.key === 'title' ? titleValue : assigneeValue,
                  )
                }
                placeholder={field.placeholder}
              />
            ) : (
              <Text
                color={getFieldValue(field.key) ? 'white' : 'gray'}
                dimColor={!getFieldValue(field.key)}
              >
                {getFieldValue(field.key) || field.placeholder}
              </Text>
            )}
          </Box>

          {hasError(field.key) ? (
            <Box marginLeft={4}>
              <Text color="red">✗ {state.errors[field.key]}</Text>
            </Box>
          ) : (
            currentField === field.key &&
            !isEditing && (
              <Box marginLeft={4}>
                <Text color="blue" dimColor>
                  💡 {field.hint}
                </Text>
              </Box>
            )
          )}
        </Box>
      ))}

      <Text></Text>

      {isEditing ? (
        <Text color="gray">Type to edit, Enter to save, ESC to cancel</Text>
      ) : (
        <>
          <Text color="gray">
            Use ↑↓ arrows to navigate, Enter to edit field, Tab to continue
          </Text>
          <Text color="gray">
            Direct typing starts edit mode. B=back, N=continue
            {!isValidToNext() ? ' (complete required fields)' : ''}
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

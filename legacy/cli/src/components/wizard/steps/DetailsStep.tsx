import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { FC } from 'react';
import { useState } from 'react';
import type { StepComponentProps, Priority, Estimation } from '../types.js';
import { PRIORITY_OPTIONS, ESTIMATION_OPTIONS } from '../types.js';

type Field = 'priority' | 'estimation' | 'description';

interface SelectOption {
  value: string;
  label: string;
  description: string;
}

/**
 * Details Step Component
 *
 * Third step of the wizard - collects priority, estimation, and description.
 * Uses Ink Select pattern with arrow keys for option selection.
 * Includes multi-line text input for description field.
 */
export const DetailsStep: FC<StepComponentProps> = ({
  state,
  onUpdate,
  onNext,
  onBack,
  onCancel,
}) => {
  const [currentField, setCurrentField] = useState<Field>('priority');
  const [isEditing, setIsEditing] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(state.description);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);

  const fields: Array<{
    key: Field;
    label: string;
    placeholder: string;
    type: 'select' | 'text';
  }> = [
    {
      key: 'priority',
      label: 'Priority',
      placeholder: 'Select priority level...',
      type: 'select',
    },
    {
      key: 'estimation',
      label: 'Estimation',
      placeholder: 'Select effort estimate...',
      type: 'select',
    },
    {
      key: 'description',
      label: 'Description',
      placeholder: 'Enter detailed description...',
      type: 'text',
    },
  ];

  const currentFieldIndex = fields.findIndex((f) => f.key === currentField);
  const currentFieldData = fields.find((f) => f.key === currentField);

  const getPriorityOptions = (): SelectOption[] => {
    return PRIORITY_OPTIONS.map((priority) => ({
      value: priority,
      label: priority.charAt(0).toUpperCase() + priority.slice(1),
      description: getPriorityDescription(priority),
    }));
  };

  const getEstimationOptions = (): SelectOption[] => {
    return ESTIMATION_OPTIONS.map((estimation) => ({
      value: estimation,
      label: estimation,
      description: getEstimationDescription(estimation),
    }));
  };

  const getPriorityDescription = (priority: Priority): string => {
    switch (priority) {
      case 'critical':
        return 'Urgent, blocks other work';
      case 'high':
        return 'Important, should be done soon';
      case 'medium':
        return 'Normal priority';
      case 'low':
        return 'Nice to have, can wait';
    }
  };

  const getEstimationDescription = (estimation: Estimation): string => {
    switch (estimation) {
      case 'XS':
        return '< 1 day';
      case 'S':
        return '1-3 days';
      case 'M':
        return '3-7 days';
      case 'L':
        return '1-2 weeks';
      case 'XL':
        return '2+ weeks';
    }
  };

  const getCurrentOptions = (): SelectOption[] => {
    switch (currentField) {
      case 'priority':
        return getPriorityOptions();
      case 'estimation':
        return getEstimationOptions();
      default:
        return [];
    }
  };

  const getCurrentValue = (field: Field): string => {
    switch (field) {
      case 'priority':
        return state.priority;
      case 'estimation':
        return state.estimation;
      case 'description':
        return state.description;
    }
  };

  useInput((input, key) => {
    if (isEditing) {
      // Handle editing mode
      if (currentFieldData?.type === 'select') {
        // Handle select navigation
        const options = getCurrentOptions();
        if (key.upArrow && selectedOptionIndex > 0) {
          setSelectedOptionIndex(selectedOptionIndex - 1);
        } else if (key.downArrow && selectedOptionIndex < options.length - 1) {
          setSelectedOptionIndex(selectedOptionIndex + 1);
        } else if (key.return) {
          const selectedOption = options[selectedOptionIndex];
          if (selectedOption) {
            onUpdate({
              [currentField]: selectedOption.value,
              errors: { ...state.errors, [currentField]: '' },
            });
          }
          setIsEditing(false);
        } else if (key.escape) {
          setIsEditing(false);
        }
      } else if (currentFieldData?.type === 'text') {
        // Text input is handled by TextInput component, only handle escape
        if (key.escape) {
          setIsEditing(false);
          setDescriptionValue(state.description); // Reset to saved value
        }
      }
    } else {
      // Handle navigation mode
      if (key.upArrow && currentFieldIndex > 0) {
        const prevField = fields[currentFieldIndex - 1];
        if (prevField) setCurrentField(prevField.key);
      } else if (key.downArrow && currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        if (nextField) setCurrentField(nextField.key);
      } else if (key.return) {
        if (currentFieldData?.type === 'select') {
          // Initialize selection index for current value
          const options = getCurrentOptions();
          const currentValue = getCurrentValue(currentField);
          const currentIndex = options.findIndex(
            (opt) => opt.value === currentValue,
          );
          setSelectedOptionIndex(currentIndex >= 0 ? currentIndex : 0);
        }
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

  const handleDescriptionSubmit = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      onUpdate({
        description: trimmedValue,
        errors: { ...state.errors, description: '' },
      });
    }
    setIsEditing(false);
  };

  const isValidToNext = (): boolean => {
    return (
      state.priority.length > 0 &&
      state.estimation.length > 0 &&
      state.description.trim() !== ''
    );
  };

  const getFieldValue = (field: Field): string => {
    return getCurrentValue(field);
  };

  const hasError = (field: Field): boolean => {
    return Boolean(state.errors[field]);
  };

  const renderSelectOptions = () => {
    if (!isEditing || currentFieldData?.type !== 'select') return null;

    const options = getCurrentOptions();

    return (
      <Box flexDirection="column" marginLeft={4} marginTop={1}>
        {options.map((option, index) => (
          <Box key={option.value} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={index === selectedOptionIndex ? 'green' : 'white'}>
                {index === selectedOptionIndex ? '› ' : '  '}
              </Text>
              <Text
                bold={index === selectedOptionIndex}
                color={index === selectedOptionIndex ? 'green' : 'white'}
              >
                {option.label}
              </Text>
            </Box>
            <Box marginLeft={4}>
              <Text color="gray" dimColor>
                {option.description}
              </Text>
            </Box>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text color="gray">
            Use ↑↓ arrows to navigate, Enter to select, ESC to cancel
          </Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Step 3: Details
      </Text>
      <Text color="gray">
        Configure priority, effort estimation, and description
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
            <Text color="red"> *</Text>
          </Box>

          <Box marginLeft={4}>
            {isEditing &&
            currentField === field.key &&
            field.type === 'text' ? (
              <TextInput
                value={descriptionValue}
                onChange={setDescriptionValue}
                onSubmit={handleDescriptionSubmit}
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

          {hasError(field.key) && (
            <Box marginLeft={4}>
              <Text color="red">✗ {state.errors[field.key]}</Text>
            </Box>
          )}

          {currentField === field.key && renderSelectOptions()}
        </Box>
      ))}

      <Text></Text>

      {isEditing ? (
        currentFieldData?.type === 'select' ? (
          <Text color="gray">
            Use ↑↓ arrows to navigate options, Enter to select, ESC to cancel
          </Text>
        ) : (
          <Text color="gray">Type to edit, Enter to save, ESC to cancel</Text>
        )
      ) : (
        <>
          <Text color="gray">
            Use ↑↓ arrows to navigate, Enter to edit field, Tab to continue
          </Text>
          <Text color="gray">
            Direct typing starts edit mode. B=back, N=continue
            {!isValidToNext() ? ' (complete all fields)' : ''}
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

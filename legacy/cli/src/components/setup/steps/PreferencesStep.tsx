import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { FC } from 'react';
import { useState } from 'react';

interface SelectItem {
  label: string;
  value: string;
}

interface PreferencesStepProps {
  onComplete: (preferences: {
    outputFormat?: 'formatted' | 'json';
    verbosity?: 'quiet' | 'normal' | 'verbose';
    defaultEditor?: string;
  }) => void;
  onSkip: () => void;
  onExit: () => void;
}

type PreferenceField = 'outputFormat' | 'verbosity' | 'editor' | 'done';

/**
 * Preferences configuration step
 * Allows users to set default CLI behavior preferences
 */
export const PreferencesStep: FC<PreferencesStepProps> = ({
  onComplete,
  onSkip,
  onExit,
}) => {
  const [currentField, setCurrentField] =
    useState<PreferenceField>('outputFormat');
  const [outputFormat, setOutputFormat] = useState<'formatted' | 'json'>(
    'formatted',
  );
  const [verbosity, setVerbosity] = useState<'quiet' | 'normal' | 'verbose'>(
    'normal',
  );
  const [editor, setEditor] = useState<string>(process.env.EDITOR || 'vi');

  useInput((input, key) => {
    if (key.escape) {
      onExit();
      return;
    }

    if (key.ctrl && input === 's') {
      onSkip();
    }

    if (currentField === 'done' && key.return) {
      handleComplete();
    }
  });

  const handleComplete = () => {
    onComplete({
      outputFormat,
      verbosity,
      defaultEditor: editor,
    });
  };

  const outputFormatItems = [
    { label: 'Formatted (colored, human-readable)', value: 'formatted' },
    { label: 'JSON (machine-readable)', value: 'json' },
  ];

  const verbosityItems = [
    { label: 'Quiet (minimal output)', value: 'quiet' },
    { label: 'Normal (standard output)', value: 'normal' },
    { label: 'Verbose (detailed output)', value: 'verbose' },
  ];

  const editorItems = [
    { label: 'Visual Studio Code', value: 'code' },
    { label: 'Vim', value: 'vim' },
    { label: 'Neovim', value: 'nvim' },
    { label: 'Emacs', value: 'emacs' },
    { label: 'Nano', value: 'nano' },
    {
      label: `System default (${process.env.EDITOR || 'vi'})`,
      value: process.env.EDITOR || 'vi',
    },
  ];

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>Set Default Preferences</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          Configure default CLI behavior (can be changed later):
        </Text>
      </Box>

      {/* Output Format */}
      <Box marginBottom={1}>
        <Text bold={currentField === 'outputFormat'}>Output Format:</Text>
      </Box>
      {currentField === 'outputFormat' ? (
        <Box marginLeft={2} marginBottom={1}>
          <SelectInput
            items={outputFormatItems}
            initialIndex={outputFormatItems.findIndex(
              (item) => item.value === outputFormat,
            )}
            onSelect={(item: SelectItem) => {
              setOutputFormat(item.value as 'formatted' | 'json');
              setCurrentField('verbosity');
            }}
          />
        </Box>
      ) : (
        <Box marginLeft={2} marginBottom={1}>
          <Text color="green">
            ✓ {outputFormat === 'formatted' ? 'Formatted' : 'JSON'}
          </Text>
        </Box>
      )}

      {/* Verbosity */}
      <Box marginBottom={1}>
        <Text bold={currentField === 'verbosity'}>Verbosity Level:</Text>
      </Box>
      {currentField === 'verbosity' ? (
        <Box marginLeft={2} marginBottom={1}>
          <SelectInput
            items={verbosityItems}
            initialIndex={verbosityItems.findIndex(
              (item) => item.value === verbosity,
            )}
            onSelect={(item: SelectItem) => {
              setVerbosity(item.value as 'quiet' | 'normal' | 'verbose');
              setCurrentField('editor');
            }}
          />
        </Box>
      ) : (
        <Box marginLeft={2} marginBottom={1}>
          <Text
            color={
              currentField === 'done' || currentField === 'editor'
                ? 'green'
                : 'gray'
            }
          >
            {currentField === 'done' || currentField === 'editor' ? '✓' : '○'}{' '}
            {verbosity.charAt(0).toUpperCase() + verbosity.slice(1)}
          </Text>
        </Box>
      )}

      {/* Default Editor */}
      <Box marginBottom={1}>
        <Text bold={currentField === 'editor'}>Default Editor:</Text>
      </Box>
      {currentField === 'editor' ? (
        <Box marginLeft={2} marginBottom={1}>
          <SelectInput
            items={editorItems}
            initialIndex={editorItems.findIndex(
              (item) => item.value === editor,
            )}
            onSelect={(item: SelectItem) => {
              setEditor(item.value);
              setCurrentField('done');
            }}
          />
        </Box>
      ) : (
        <Box marginLeft={2} marginBottom={1}>
          <Text color={currentField === 'done' ? 'green' : 'gray'}>
            {currentField === 'done' ? '✓' : '○'} {editor}
          </Text>
        </Box>
      )}

      {currentField === 'done' && (
        <Box marginTop={1}>
          <Text>
            Press{' '}
            <Text bold color="green">
              Enter
            </Text>{' '}
            to save preferences
          </Text>
        </Box>
      )}

      {currentField !== 'done' && (
        <Box marginTop={1}>
          <Text dimColor>
            Press <Text bold>Ctrl+S</Text> to skip with defaults •{' '}
            <Text bold>Esc</Text> to exit
          </Text>
        </Box>
      )}
    </Box>
  );
};

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { FC } from 'react';
import { useState } from 'react';

interface GitConfigStepProps {
  initialName?: string;
  initialEmail?: string;
  onComplete: (gitConfig: { userName: string; userEmail: string }) => void;
  onSkip: () => void;
  onExit: () => void;
}

type Field = 'name' | 'email';

/**
 * Git configuration step
 * Helps users set up their Git identity for artifact tracking
 */
export const GitConfigStep: FC<GitConfigStepProps> = ({
  initialName = '',
  initialEmail = '',
  onComplete,
  onSkip,
  onExit,
}) => {
  const [currentField, setCurrentField] = useState<Field>('name');
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [showSkipPrompt, setShowSkipPrompt] = useState(false);

  const hasExistingConfig = Boolean(initialName && initialEmail);

  useInput((input, key) => {
    if (key.escape) {
      onExit();
      return;
    }

    if (showSkipPrompt) {
      const normalized = input.trim().toLowerCase();

      if (normalized === 'y') {
        setShowSkipPrompt(false);
        onSkip();
      } else if (normalized === 'n') {
        setShowSkipPrompt(false);
      }
      return;
    }

    if (key.tab) {
      if (currentField === 'name' && name.trim()) {
        setCurrentField('email');
      } else if (currentField === 'email' && email.trim()) {
        handleSubmit();
      }
    }

    if (key.return) {
      if (currentField === 'name' && name.trim()) {
        setCurrentField('email');
      } else if (currentField === 'email' && email.trim()) {
        handleSubmit();
      }
    }

    // Ctrl+S to skip
    if (key.ctrl && input === 's') {
      if (!hasExistingConfig) {
        setShowSkipPrompt(true);
      } else {
        onSkip();
      }
    }
  });

  const handleSubmit = () => {
    if (name.trim() && email.trim()) {
      onComplete({
        userName: name.trim(),
        userEmail: email.trim(),
      });
    }
  };

  if (showSkipPrompt) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="yellow">
          ⚠️ Git identity is recommended for proper artifact tracking.
        </Text>
        <Text>Skip this step? (y/n)</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>Configure Git Identity</Text>
      </Box>

      {hasExistingConfig && (
        <Box marginBottom={1}>
          <Text color="green">✓ Found existing Git configuration</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text dimColor>
          This information will be used to track who creates and modifies
          artifacts.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Box marginRight={1}>
          <Text>Name: </Text>
        </Box>
        {currentField === 'name' ? (
          <TextInput value={name} onChange={setName} placeholder="John Doe" />
        ) : (
          <Text color={name ? 'green' : 'gray'}>{name || '(not set)'}</Text>
        )}
      </Box>

      <Box marginBottom={1}>
        <Box marginRight={1}>
          <Text>Email: </Text>
        </Box>
        {currentField === 'email' ? (
          <TextInput
            value={email}
            onChange={setEmail}
            placeholder="john@example.com"
          />
        ) : (
          <Text color={email ? 'green' : 'gray'}>{email || '(not set)'}</Text>
        )}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>
          Press <Text bold>Tab</Text> or <Text bold>Enter</Text> to move between
          fields
        </Text>
        <Text dimColor>
          Press <Text bold>Ctrl+S</Text> to skip • <Text bold>Esc</Text> to exit
        </Text>
      </Box>
    </Box>
  );
};

import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import { useState } from 'react';

interface WelcomeStepProps {
  onNext: () => void;
}

/**
 * Welcome step for the setup wizard
 * Introduces users to Kodebase and explains the setup process
 */
export const WelcomeStep: FC<WelcomeStepProps> = ({ onNext }) => {
  const [hasAdvanced, setHasAdvanced] = useState(false);

  useInput((_, key) => {
    if (key.return && !hasAdvanced) {
      setHasAdvanced(true);
      onNext();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Welcome to Kodebase! 🚀
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          Kodebase is a structured knowledge management system for software
          projects.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>This setup wizard will help you configure:</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        <Text>• Git identity for artifact tracking</Text>
        <Text>• Shell completion for better CLI experience</Text>
        <Text>• Default preferences for your workflow</Text>
        <Text>• Optional interactive tutorial</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          This will only take a minute and you can change these settings later.
        </Text>
      </Box>

      <Box>
        <Text>
          Press{' '}
          <Text bold color="green">
            Enter
          </Text>{' '}
          to begin setup
        </Text>
      </Box>
    </Box>
  );
};

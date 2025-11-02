import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import { useState } from 'react';
import type { UserConfig } from '../../../utils/config.js';

interface CompletionStepProps {
  config: UserConfig;
  skipTutorial?: boolean;
  onComplete: (launchTutorial?: boolean) => void;
}

/**
 * Final step of the setup wizard
 * Shows summary and offers to launch tutorial
 */
export const CompletionStep: FC<CompletionStepProps> = ({
  config,
  skipTutorial = false,
  onComplete,
}) => {
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(!skipTutorial);

  useInput((input, key) => {
    if (!showTutorialPrompt && key.return) {
      onComplete();
      return;
    }

    if (showTutorialPrompt) {
      const normalized = input.trim().toLowerCase();

      if (normalized === 'y') {
        // Indicate that tutorial should be launched
        onComplete(true);
      } else if (normalized === 'n') {
        setShowTutorialPrompt(false);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          ✨ Setup Complete!
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Your Kodebase CLI is now configured:</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        {config.gitConfig?.userName && (
          <Text>
            <Text color="green">✓</Text> Git identity:{' '}
            {config.gitConfig.userName} ({config.gitConfig.userEmail})
          </Text>
        )}
        {config.shellCompletion?.installed && (
          <Text>
            <Text color="green">✓</Text> Shell completion:{' '}
            {config.shellCompletion.shell || 'installed'}
          </Text>
        )}
        {config.preferences && (
          <>
            <Text>
              <Text color="green">✓</Text> Output format:{' '}
              {config.preferences.outputFormat}
            </Text>
            <Text>
              <Text color="green">✓</Text> Verbosity:{' '}
              {config.preferences.verbosity}
            </Text>
            <Text>
              <Text color="green">✓</Text> Editor:{' '}
              {config.preferences.defaultEditor}
            </Text>
          </>
        )}
      </Box>

      {showTutorialPrompt ? (
        <>
          <Box marginTop={1}>
            <Text bold>Would you like to start the interactive tutorial?</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Learn Kodebase concepts and practice commands in a safe
              environment.
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text>
              Start tutorial? <Text color="cyan">(Y/n)</Text>
            </Text>
          </Box>
        </>
      ) : (
        <>
          <Box marginTop={1}>
            <Text dimColor>
              Configuration saved to ~/.config/kodebase/config.json
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Run 'kodebase setup' anytime to reconfigure.</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Run 'kodebase tutorial' to learn the basics.</Text>
          </Box>
          <Box marginTop={1}>
            <Text>
              Press{' '}
              <Text bold color="green">
                Enter
              </Text>{' '}
              to start using Kodebase
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
};

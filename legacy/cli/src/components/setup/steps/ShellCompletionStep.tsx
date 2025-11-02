import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type { FC } from 'react';
import { useState } from 'react';

interface ShellCompletionStepProps {
  onComplete: (config: { installed: boolean; shell?: 'bash' | 'zsh' }) => void;
  onSkip: () => void;
  onExit: () => void;
}

/**
 * Shell completion installation step
 * Offers to install tab completion for better CLI experience
 */
export const ShellCompletionStep: FC<ShellCompletionStepProps> = ({
  onComplete,
  onSkip,
  onExit,
}) => {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [detectedShell, setDetectedShell] = useState<'bash' | 'zsh' | null>(
    null,
  );

  // Detect shell on mount
  useState(() => {
    try {
      const shell = process.env.SHELL || '';
      if (shell.includes('zsh')) {
        setDetectedShell('zsh');
      } else if (shell.includes('bash')) {
        setDetectedShell('bash');
      }
    } catch {
      // Unable to detect shell
    }
  });

  useInput((input, key) => {
    if (key.escape) {
      onExit();
      return;
    }

    if (error || success) {
      if (key.return) {
        if (success) {
          onComplete({ installed: true, shell: detectedShell || undefined });
        } else {
          onSkip();
        }
      }
      return;
    }

    // Only process y/n input when not in any other state
    if (!installing && !error && !success) {
      if (input.toLowerCase() === 'y') {
        handleInstall();
      } else if (input.toLowerCase() === 'n') {
        onSkip();
      }
    }
  });

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);

    try {
      // Try to detect which shell the user is using
      const shell = process.env.SHELL || '';
      const isZsh = shell.includes('zsh');
      const isBash = shell.includes('bash');

      // Debug: log shell detection
      console.error(
        `[DEBUG] Shell: ${shell}, isZsh: ${isZsh}, isBash: ${isBash}`,
      );

      if (isZsh) {
        // Generate and install zsh completion
        // Try to use the current process to generate completion
        const completionScript = execSync('npx kodebase __complete-zsh', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        const completionDir = `${process.env.HOME}/.zsh/completions`;
        execSync(`mkdir -p ${completionDir}`, { stdio: 'pipe' });

        writeFileSync(`${completionDir}/_kodebase`, completionScript);

        setDetectedShell('zsh');
      } else if (isBash) {
        // Generate and install bash completion
        // Try to use the current process to generate completion
        const completionScript = execSync('npx kodebase __complete-bash', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        const completionDir = `${process.env.HOME}/.bash_completion.d`;
        execSync(`mkdir -p ${completionDir}`, { stdio: 'pipe' });

        writeFileSync(
          `${completionDir}/kodebase-completion.bash`,
          completionScript,
        );

        setDetectedShell('bash');
      } else {
        throw new Error('Unable to detect shell type (bash or zsh)');
      }

      setSuccess(true);
      setInstalling(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
      setInstalling(false);
    }
  };

  if (installing) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>{' '}
          Installing shell completion...
        </Text>
      </Box>
    );
  }

  if (success) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green">✓ Shell completion installed successfully!</Text>
        <Box marginTop={1}>
          <Text dimColor>
            Restart your terminal or run 'source ~/.{detectedShell}rc' to enable
            completion.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text>
            Press{' '}
            <Text bold color="green">
              Enter
            </Text>{' '}
            to continue
          </Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">✗ Failed to install shell completion</Text>
        <Box marginTop={1}>
          <Text dimColor>You can install it manually later by running:</Text>
          <Text color="cyan">
            curl -sL
            https://github.com/kodebaseai/kodebase/raw/main/packages/cli/scripts/install-completion.sh
            | bash
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text>
            Press{' '}
            <Text bold color="green">
              Enter
            </Text>{' '}
            to continue
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>Install Shell Completion</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          Shell completion enables tab completion for commands and artifact IDs.
        </Text>
      </Box>

      {detectedShell && (
        <Box marginBottom={1}>
          <Text>
            Detected shell: <Text color="cyan">{detectedShell}</Text>
          </Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text dimColor>
          This will install completion scripts for better CLI experience:
        </Text>
      </Box>

      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        <Text>
          • Tab complete commands:{' '}
          <Text color="green">kodebase st{'<TAB>'}</Text> → status
        </Text>
        <Text>
          • Tab complete artifact IDs:{' '}
          <Text color="green">kb s A.1{'<TAB>'}</Text> → A.1.5
        </Text>
        <Text>
          • Tab complete options: <Text color="green">kb list --{'<TAB>'}</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          Install shell completion? <Text color="cyan">(Y/n)</Text>
        </Text>
      </Box>
    </Box>
  );
};

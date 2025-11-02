import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { TutorialCommandProps } from '../types/command.js';
import { TutorialFlow } from '../components/tutorial/TutorialFlow.js';

/**
 * Tutorial Command Component
 *
 * Implements the 'kodebase tutorial' command for guided onboarding of new users.
 *
 * Command syntax: `kodebase tutorial`
 *
 * @description
 * This command provides an interactive tutorial that teaches users:
 * - Core kodebase concepts and terminology
 * - Artifact creation workflow (Initiative → Milestone → Issue)
 * - Git integration patterns
 * - Essential CLI commands
 * All performed in a safe sandbox environment that doesn't affect real projects.
 *
 * @example
 * ```bash
 * kodebase tutorial     # Start interactive tutorial
 * kb tutorial           # Same command with alias
 * ```
 *
 * **Tutorial Features:**
 * - Safe sandbox environment for experimentation
 * - Step-by-step guidance through core workflows
 * - Progress tracking and resumable sessions
 * - Automatic cleanup on completion
 */
export const Tutorial: FC<TutorialCommandProps> = ({ verbose }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      setIsExiting(true);
      process.exit(0);
    }
    if (!isStarted && (input === 'y' || key.return)) {
      setIsStarted(true);
    }
    if (!isStarted && input === 'n') {
      setIsExiting(true);
      process.exit(0);
    }
  });

  useEffect(() => {
    if (isExiting) {
      process.exit(0);
    }
  }, [isExiting]);

  if (!isStarted) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Welcome to Kodebase Tutorial! 🎓
        </Text>
        <Text></Text>
        <Text>
          This interactive tutorial will guide you through the core concepts
        </Text>
        <Text>of Kodebase in a safe sandbox environment. You'll learn:</Text>
        <Text></Text>
        <Text color="green">
          {' '}
          • Creating initiatives, milestones, and issues
        </Text>
        <Text color="green"> • Understanding artifact relationships</Text>
        <Text color="green"> • Git workflow integration</Text>
        <Text color="green"> • Essential CLI commands</Text>
        <Text></Text>
        <Text color="yellow">
          ⚠️ This tutorial creates temporary files that will be cleaned up
        </Text>
        <Text color="yellow"> automatically when you finish.</Text>
        <Text></Text>
        <Text bold>Ready to start? (y/N)</Text>
        <Text color="gray">Press Escape or Ctrl+C to exit anytime</Text>
      </Box>
    );
  }

  return <TutorialFlow verbose={verbose} />;
};

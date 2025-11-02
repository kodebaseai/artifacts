import { Box } from 'ink';
import type { FC } from 'react';
import { useState } from 'react';
import { SetupWizard } from '../components/setup/SetupWizard.js';
import { Tutorial } from './Tutorial.js';
import { measurePerformance } from '../utils/performance.js';

export interface SetupProps {
  verbose?: boolean;
}

/**
 * Setup command for Kodebase CLI
 *
 * Launches the interactive setup wizard to configure:
 * - Git identity
 * - Shell completion
 * - Default preferences
 * - Tutorial launch
 *
 * Can be run manually with 'kodebase setup' or automatically on first run
 */
export const Setup: FC<SetupProps> = ({ verbose }) => {
  const [launchTutorial, setLaunchTutorial] = useState(false);

  const handleComplete = async (shouldLaunchTutorial?: boolean) => {
    if (shouldLaunchTutorial) {
      setLaunchTutorial(true);
    } else {
      await measurePerformance('setup-complete', async () => {
        // Exit gracefully after setup
        process.exit(0);
      });
    }
  };

  if (launchTutorial) {
    return <Tutorial verbose={verbose} />;
  }

  return (
    <Box paddingY={1}>
      <SetupWizard onComplete={handleComplete} />
    </Box>
  );
};

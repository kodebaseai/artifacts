import { Box, Text } from 'ink';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import Spinner from 'ink-spinner';
import { execSync } from 'node:child_process';
import {
  saveConfig,
  updateConfig,
  type UserConfig,
  DEFAULT_CONFIG,
} from '../../utils/config.js';
import { measurePerformance } from '../../utils/performance.js';

// Import wizard steps
import { WelcomeStep } from './steps/WelcomeStep.js';
import { GitConfigStep } from './steps/GitConfigStep.js';
import { ShellCompletionStep } from './steps/ShellCompletionStep.js';
import { PreferencesStep } from './steps/PreferencesStep.js';
import { CompletionStep } from './steps/CompletionStep.js';

export type SetupStep =
  | 'welcome'
  | 'git-config'
  | 'shell-completion'
  | 'preferences'
  | 'completion';

export interface SetupWizardProps {
  onComplete: (launchTutorial?: boolean) => void;
  skipTutorial?: boolean;
}

/**
 * First-run setup wizard for Kodebase CLI
 *
 * Guides new users through initial configuration:
 * - Welcome message
 * - Git identity setup
 * - Shell completion installation
 * - Default preferences
 * - Tutorial launch option
 */
export const SetupWizard: FC<SetupWizardProps> = ({
  onComplete,
  skipTutorial = false,
}) => {
  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
  const [config, setConfig] = useState<UserConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [exitRequested, setExitRequested] = useState(false);

  // Check existing Git config on mount
  useEffect(() => {
    try {
      const userName = execSync('git config user.name', {
        encoding: 'utf-8',
      }).trim();
      const userEmail = execSync('git config user.email', {
        encoding: 'utf-8',
      }).trim();

      if (userName && userEmail) {
        setConfig((prev) => ({
          ...prev,
          gitConfig: { userName, userEmail },
        }));
      }
    } catch {
      // Git config not set, will be configured in wizard
    }
  }, []);

  const handleStepComplete = async (updates?: Partial<UserConfig>) => {
    if (updates) {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
    }

    // Progress through steps
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('git-config');
        break;
      case 'git-config':
        setCurrentStep('shell-completion');
        break;
      case 'shell-completion':
        setCurrentStep('preferences');
        break;
      case 'preferences':
        // Save configuration
        setSaving(true);
        await measurePerformance('setup-wizard-save', async () => {
          const finalConfig = {
            ...config,
            ...updates,
            setupCompleted: true,
          };
          await saveConfig(finalConfig);
        });
        setSaving(false);
        setCurrentStep('completion');
        break;
      case 'completion':
        onComplete();
        break;
    }
  };

  const handleSkip = () => {
    // Skip to next step without saving changes for current step
    switch (currentStep) {
      case 'git-config':
        setCurrentStep('shell-completion');
        break;
      case 'shell-completion':
        setCurrentStep('preferences');
        break;
      case 'preferences':
        handleStepComplete();
        break;
    }
  };

  const handleExit = async () => {
    setExitRequested(true);
    // Save partial progress
    await updateConfig({
      ...config,
      setupCompleted: false, // Mark as incomplete
    });
    process.exit(0);
  };

  if (exitRequested) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="yellow">
          Setup wizard cancelled. Run 'kodebase setup' to continue later.
        </Text>
      </Box>
    );
  }

  if (saving) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>{' '}
          Saving configuration...
        </Text>
      </Box>
    );
  }

  // Progress indicator
  const steps = [
    'welcome',
    'git-config',
    'shell-completion',
    'preferences',
    'completion',
  ];
  const currentIndex = steps.indexOf(currentStep);
  const progress = `${currentIndex + 1}/${steps.length}`;

  return (
    <Box flexDirection="column">
      {currentStep !== 'welcome' && currentStep !== 'completion' && (
        <Box marginBottom={1}>
          <Text dimColor>Step {progress}</Text>
        </Box>
      )}

      {currentStep === 'welcome' && (
        <WelcomeStep onNext={() => handleStepComplete()} />
      )}

      {currentStep === 'git-config' && (
        <GitConfigStep
          initialName={config.gitConfig?.userName}
          initialEmail={config.gitConfig?.userEmail}
          onComplete={(gitConfig) => handleStepComplete({ gitConfig })}
          onSkip={handleSkip}
          onExit={handleExit}
        />
      )}

      {currentStep === 'shell-completion' && (
        <ShellCompletionStep
          onComplete={(shellCompletion) =>
            handleStepComplete({ shellCompletion })
          }
          onSkip={handleSkip}
          onExit={handleExit}
        />
      )}

      {currentStep === 'preferences' && (
        <PreferencesStep
          onComplete={(preferences) => handleStepComplete({ preferences })}
          onSkip={handleSkip}
          onExit={handleExit}
        />
      )}

      {currentStep === 'completion' && (
        <CompletionStep
          config={config}
          skipTutorial={skipTutorial}
          onComplete={onComplete}
        />
      )}
    </Box>
  );
};

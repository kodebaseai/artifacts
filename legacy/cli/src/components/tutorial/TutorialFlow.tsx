import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { TutorialStep } from './TutorialStep.js';
import { createSandbox, cleanupSandbox } from '../../utils/sandbox.js';
import type { TutorialState } from './types.js';
import { TUTORIAL_STEPS, DEFAULT_TUTORIAL_STATE } from './types.js';
import {
  saveTutorialState,
  loadTutorialState,
  clearTutorialState,
  hasSavedTutorialState,
  getSavedProgressDescription,
} from '../../utils/tutorial-state.js';

export interface TutorialFlowProps {
  verbose?: boolean;
}

/**
 * Interactive Tutorial Flow Component
 *
 * Guides new users through kodebase concepts and workflows in a safe sandbox environment.
 * Implements step-by-step progression with progress tracking and cleanup.
 *
 * Tutorial Structure:
 * 1. Welcome & Setup - Create sandbox environment
 * 2. Learn Concepts - Explain artifacts and relationships
 * 3. Create Initiative - Guide through first initiative creation
 * 4. Create Milestone - Add milestone under initiative
 * 5. Create Issue - Add issue under milestone
 * 6. Git Integration - Demonstrate branch workflow
 * 7. Complete & Cleanup - Summarize learnings and clean up
 */
export const TutorialFlow: FC<TutorialFlowProps> = ({ verbose = false }) => {
  const [tutorialState, setTutorialState] = useState<TutorialState>(
    DEFAULT_TUTORIAL_STATE,
  );
  const [isExiting, setIsExiting] = useState(false);
  const [sandboxPath, setSandboxPath] = useState<string>('');
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgressDescription, setSavedProgressDescription] = useState<
    string | null
  >(null);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      handleCleanupAndExit();
      return;
    }

    // Handle resume prompt input
    if (showResumePrompt) {
      if (input === 'y' || key.return) {
        // Resume from saved state
        const savedState = loadTutorialState();
        if (savedState) {
          setTutorialState(savedState);
          setSandboxPath(savedState.sandboxPath);
          setShowResumePrompt(false);

          if (verbose) {
            console.log('Resuming from saved tutorial state');
          }
        }
      } else if (input === 'n') {
        // Start fresh
        clearTutorialState();
        setShowResumePrompt(false);

        // Initialize new sandbox
        initNewTutorial();
      }
    }
  });

  const initNewTutorial = useCallback(async () => {
    try {
      const path = await createSandbox();
      setSandboxPath(path);
      setTutorialState((prev) => ({
        ...prev,
        sandboxPath: path,
        isReady: true,
      }));
    } catch (error) {
      console.error('Failed to create sandbox environment:', error);
      process.exit(1);
    }
  }, []);

  const handleCleanupAndExit = async () => {
    const isCompleting = tutorialState.currentStep === 'completion';

    // Save current state before exit (unless tutorial is complete)
    if (!isCompleting && tutorialState.isReady) {
      saveTutorialState(tutorialState);
      if (verbose) {
        console.log('✓ Tutorial progress saved for resumption');
      }
    } else {
      // Clear saved state if tutorial is complete
      clearTutorialState();
      if (verbose) {
        console.log('✓ Tutorial state cleared (tutorial complete)');
      }
    }

    if (sandboxPath) {
      try {
        await cleanupSandbox(sandboxPath);
        if (isCompleting || verbose) {
          console.log('🧹 Tutorial environment cleaned up successfully');
          console.log(`   Removed sandbox: ${sandboxPath}`);
        }
      } catch (error) {
        console.warn('Warning: Failed to cleanup tutorial sandbox:', error);
      }
    }

    if (isCompleting) {
      console.log('\n🎉 Tutorial completed! Thank you for learning Kodebase!');
      console.log(
        '   Run "kodebase --help" to start using it in your projects.',
      );
    }

    setIsExiting(true);
    process.exit(0);
  };

  useEffect(() => {
    if (isExiting) {
      process.exit(0);
    }
  }, [isExiting]);

  // Check for saved state and initialize tutorial on mount
  useEffect(() => {
    const initTutorial = async () => {
      // Check if there's a saved tutorial state
      if (hasSavedTutorialState()) {
        const description = getSavedProgressDescription();
        setSavedProgressDescription(description);
        setShowResumePrompt(true);
      } else {
        // Start fresh tutorial
        await initNewTutorial();
      }
    };

    initTutorial().catch(console.error);

    // Cleanup on unmount
    return () => {
      if (sandboxPath) {
        cleanupSandbox(sandboxPath).catch((error) => {
          // Log cleanup issues during unmount for debugging
          console.warn('Cleanup during unmount failed:', error);
        });
      }
    };
  }, [sandboxPath, initNewTutorial]);

  const handleNext = () => {
    const currentIndex = TUTORIAL_STEPS.indexOf(tutorialState.currentStep);
    const nextIndex = currentIndex + 1;

    if (nextIndex < TUTORIAL_STEPS.length) {
      const nextStep = TUTORIAL_STEPS[nextIndex];
      if (nextStep) {
        const newState = {
          ...tutorialState,
          currentStep: nextStep,
          completedSteps: [
            ...tutorialState.completedSteps,
            tutorialState.currentStep,
          ],
        };
        setTutorialState(newState);

        // Save progress
        saveTutorialState(newState);
      }
    } else {
      // Tutorial complete
      handleCleanupAndExit();
    }
  };

  const handleBack = () => {
    const currentIndex = TUTORIAL_STEPS.indexOf(tutorialState.currentStep);
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      const prevStep = TUTORIAL_STEPS[prevIndex];
      if (prevStep) {
        const newCompleted = tutorialState.completedSteps.filter(
          (step) => step !== prevStep,
        );
        const newState = {
          ...tutorialState,
          currentStep: prevStep,
          completedSteps: newCompleted,
        };
        setTutorialState(newState);

        // Save progress
        saveTutorialState(newState);
      }
    }
  };

  // Show resume prompt if saved state exists
  if (showResumePrompt) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Welcome back to Kodebase Tutorial! 👋
        </Text>
        <Text></Text>
        <Text>Found previous tutorial progress:</Text>
        <Text color="yellow">{savedProgressDescription}</Text>
        <Text></Text>
        <Text bold color="green">
          Would you like to resume where you left off?
        </Text>
        <Text></Text>
        <Text color="cyan">y</Text>
        <Text> - Resume from saved progress</Text>
        <Text color="cyan">n</Text>
        <Text> - Start fresh tutorial</Text>
        <Text></Text>
        <Text color="gray">Press 'y' to resume or 'n' to start over</Text>
      </Box>
    );
  }

  if (!tutorialState.isReady) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          🔧 Setting up tutorial environment...
        </Text>
        <Text color="gray">Creating safe sandbox for experimentation</Text>
      </Box>
    );
  }

  const currentStepIndex = TUTORIAL_STEPS.indexOf(tutorialState.currentStep);
  const totalSteps = TUTORIAL_STEPS.length;
  const progress = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  // Create progress bar visualization
  const renderProgressBar = () => {
    const barWidth = 20;
    const filledWidth = Math.round((progress / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;

    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color="cyan">
            Kodebase Tutorial{' '}
          </Text>
          <Text color="gray">
            ({currentStepIndex + 1}/{totalSteps} - {progress}%)
          </Text>
        </Box>
        <Box marginTop={0}>
          <Text color="green">{filled}</Text>
          <Text color="gray">{empty}</Text>
          <Text color="gray"> {progress}%</Text>
        </Box>

        {/* Step completion indicators */}
        <Box marginTop={0}>
          {TUTORIAL_STEPS.map((step, index) => {
            const isCompleted = tutorialState.completedSteps.includes(step);
            const isCurrent = step === tutorialState.currentStep;
            const stepNum = index + 1;

            if (isCompleted) {
              return (
                <Text key={step} color="green">
                  ✓{stepNum}{' '}
                </Text>
              );
            } else if (isCurrent) {
              return (
                <Text key={step} color="cyan">
                  ▶{stepNum}{' '}
                </Text>
              );
            } else {
              return (
                <Text key={step} color="gray">
                  ○{stepNum}{' '}
                </Text>
              );
            }
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {renderProgressBar()}

      <TutorialStep
        step={tutorialState.currentStep}
        tutorialState={tutorialState}
        onNext={handleNext}
        onBack={handleBack}
        verbose={verbose}
      />

      <Box marginTop={1}>
        <Text color="gray">
          Press Escape or Ctrl+C to exit (sandbox will be cleaned up
          automatically)
        </Text>
      </Box>
    </Box>
  );
};

/**
 * Tutorial State Persistence
 *
 * Handles saving and restoring tutorial progress to allow resumption
 * after interruption or exit.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { TutorialState } from '../components/tutorial/types.js';
import { DEFAULT_TUTORIAL_STATE } from '../components/tutorial/types.js';

const TUTORIAL_STATE_DIR = join(homedir(), '.kodebase', 'tutorial');
const TUTORIAL_STATE_FILE = join(TUTORIAL_STATE_DIR, 'progress.json');

/**
 * Saves the current tutorial state to disk
 */
export function saveTutorialState(state: TutorialState): void {
  try {
    // Create directory if it doesn't exist
    mkdirSync(TUTORIAL_STATE_DIR, { recursive: true });

    // Save state with timestamp
    const stateWithTimestamp = {
      ...state,
      lastSaved: new Date().toISOString(),
      version: '1.0.0', // For future compatibility
    };

    writeFileSync(
      TUTORIAL_STATE_FILE,
      JSON.stringify(stateWithTimestamp, null, 2),
      'utf8',
    );
  } catch (_error) {
    // Silent fail - tutorial state saving is not critical
    // User will just start from beginning if save fails
  }
}

/**
 * Loads tutorial state from disk if it exists
 */
export function loadTutorialState(): TutorialState | null {
  try {
    if (!existsSync(TUTORIAL_STATE_FILE)) {
      return null;
    }

    const savedData = readFileSync(TUTORIAL_STATE_FILE, 'utf8');
    const parsedState = JSON.parse(savedData);

    // Validate the loaded state has required fields
    if (
      parsedState.currentStep &&
      Array.isArray(parsedState.completedSteps) &&
      parsedState.sandboxPath
    ) {
      // Remove the metadata fields we added for saving
      const {
        lastSaved: _lastSaved,
        version: _version,
        ...tutorialState
      } = parsedState;
      return tutorialState as TutorialState;
    }

    return null;
  } catch (_error) {
    // If loading fails, return null so user starts fresh
    return null;
  }
}

/**
 * Clears saved tutorial state from disk
 */
export function clearTutorialState(): void {
  try {
    if (existsSync(TUTORIAL_STATE_FILE)) {
      // Instead of deleting, move to backup for potential recovery
      const backupFile = `${TUTORIAL_STATE_FILE}.backup`;
      writeFileSync(backupFile, readFileSync(TUTORIAL_STATE_FILE));

      // Clear the current state file
      writeFileSync(TUTORIAL_STATE_FILE, '{}', 'utf8');
    }
  } catch (_error) {
    // Silent fail - not critical
  }
}

/**
 * Checks if there's a saved tutorial state that can be resumed
 */
export function hasSavedTutorialState(): boolean {
  const saved = loadTutorialState();
  return (
    saved !== null && saved.currentStep !== DEFAULT_TUTORIAL_STATE.currentStep
  );
}

/**
 * Gets a user-friendly description of saved progress
 */
export function getSavedProgressDescription(): string | null {
  const saved = loadTutorialState();
  if (!saved) return null;

  const stepNames: Record<string, string> = {
    welcome: 'Welcome & Setup',
    concepts: 'Learning Concepts',
    'create-initiative': 'Creating Initiative',
    'create-milestone': 'Creating Milestone',
    'create-issue': 'Creating Issue',
    'git-integration': 'Git Workflow Demo',
    completion: 'Tutorial Complete',
  };

  const currentStepName = stepNames[saved.currentStep] || saved.currentStep;
  const completedCount = saved.completedSteps.length;

  return `Resume from: ${currentStepName} (${completedCount} steps completed)`;
}

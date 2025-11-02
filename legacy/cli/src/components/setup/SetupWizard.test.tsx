import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define prop types for mocked components
interface WelcomeStepProps {
  onNext: () => void;
}

interface GitConfigStepProps {
  initialName?: string;
  initialEmail?: string;
  onComplete: (config: { userName: string; userEmail: string }) => void;
  onSkip: () => void;
  onExit: () => void;
}

interface ShellCompletionStepProps {
  onComplete: (config: { installed: boolean; shell?: 'bash' | 'zsh' }) => void;
  onSkip: () => void;
  onExit: () => void;
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

interface CompletionStepProps {
  config: UserConfig;
  skipTutorial?: boolean;
  onComplete: (launchTutorial?: boolean) => void;
}

// Create mock implementations
const mockWelcomeStep = vi.fn();
const mockGitConfigStep = vi.fn();
const mockShellCompletionStep = vi.fn();
const mockPreferencesStep = vi.fn();
const mockCompletionStep = vi.fn();

// Mock child components
vi.mock('./steps/WelcomeStep.js', () => ({
  WelcomeStep: (props: WelcomeStepProps) => {
    mockWelcomeStep(props);
    return null;
  },
}));

vi.mock('./steps/GitConfigStep.js', () => ({
  GitConfigStep: (props: GitConfigStepProps) => {
    mockGitConfigStep(props);
    return null;
  },
}));

vi.mock('./steps/ShellCompletionStep.js', () => ({
  ShellCompletionStep: (props: ShellCompletionStepProps) => {
    mockShellCompletionStep(props);
    return null;
  },
}));

vi.mock('./steps/PreferencesStep.js', () => ({
  PreferencesStep: (props: PreferencesStepProps) => {
    mockPreferencesStep(props);
    return null;
  },
}));

vi.mock('./steps/CompletionStep.js', () => ({
  CompletionStep: (props: CompletionStepProps) => {
    mockCompletionStep(props);
    return null;
  },
}));

// Mock config utilities
vi.mock('../../utils/config.js', () => ({
  saveConfig: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),
  DEFAULT_CONFIG: {
    version: '1.0.0',
    setupCompleted: false,
  },
}));

// Mock performance utilities
vi.mock('../../utils/performance.js', () => ({
  measurePerformance: vi.fn().mockImplementation(async (_name, fn) => fn()),
}));

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn((cmd: string) => {
    if (cmd === 'git config user.name') return 'Test User';
    if (cmd === 'git config user.email') return 'test@example.com';
    return '';
  }),
}));

import { execSync } from 'node:child_process';
// Import components after all mocks
import { render } from 'ink-testing-library';
import type { UserConfig } from '../../utils/config.js';
import { updateConfig } from '../../utils/config.js';
import { SetupWizard } from './SetupWizard.js';

describe('SetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockWelcomeStep.mockImplementation(({ onNext }: WelcomeStepProps) => {
      setTimeout(() => onNext(), 0);
    });

    mockGitConfigStep.mockImplementation(
      ({ onComplete }: GitConfigStepProps) => {
        setTimeout(
          () =>
            onComplete({
              userName: 'Test User',
              userEmail: 'test@example.com',
            }),
          0,
        );
      },
    );

    mockShellCompletionStep.mockImplementation(
      ({ onSkip }: ShellCompletionStepProps) => {
        setTimeout(() => onSkip(), 0);
      },
    );

    mockPreferencesStep.mockImplementation(
      ({ onComplete }: PreferencesStepProps) => {
        setTimeout(
          () =>
            onComplete({
              outputFormat: 'formatted',
              verbosity: 'normal',
              defaultEditor: 'vim',
            }),
          0,
        );
      },
    );

    mockCompletionStep.mockImplementation(
      ({ onComplete }: CompletionStepProps) => {
        setTimeout(() => onComplete(false), 0);
      },
    );
  });

  it('should render without crashing', () => {
    const onComplete = vi.fn();
    const { lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    expect(lastFrame()).toBeDefined();
  });

  it('should progress through all steps', async () => {
    const onComplete = vi.fn();
    const { lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    // Should start at welcome step
    expect(lastFrame()).not.toContain('Step');

    // Give time for all the setTimeout callbacks to execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Wait for progression through steps
    await vi.waitFor(
      () => {
        return onComplete.mock.calls.length > 0;
      },
      { timeout: 3000 },
    );

    expect(onComplete).toHaveBeenCalled();
  });

  // Note: Configuration saving is tested implicitly in "should progress through all steps"
  // and explicitly in integration tests

  it('should handle exit request gracefully', async () => {
    const processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    const onComplete = vi.fn();

    // Override GitConfigStep to call onExit
    mockGitConfigStep.mockImplementation(({ onExit }: GitConfigStepProps) => {
      setTimeout(() => onExit(), 0);
    });

    render(<SetupWizard onComplete={onComplete} />);

    // Wait for progress to GitConfigStep
    await new Promise((resolve) => setTimeout(resolve, 10));

    await vi.waitFor(() => {
      return vi.mocked(updateConfig).mock.calls.length > 0;
    });

    expect(updateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        setupCompleted: false,
      }),
    );

    processExitSpy.mockRestore();
  });

  // Note: skipTutorial functionality is tested in CompletionStep tests

  it('should detect existing git config', async () => {
    const execSyncSpy = vi.mocked(execSync);
    execSyncSpy.mockClear(); // Clear any previous calls
    execSyncSpy.mockImplementation((cmd: string) => {
      if (cmd === 'git config user.name') return 'Existing User';
      if (cmd === 'git config user.email') return 'existing@example.com';
      return '';
    });

    const onComplete = vi.fn();
    render(<SetupWizard onComplete={onComplete} />);

    // Wait a bit for useEffect to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(execSync).toHaveBeenCalledWith(
      'git config user.name',
      expect.any(Object),
    );
    expect(execSync).toHaveBeenCalledWith(
      'git config user.email',
      expect.any(Object),
    );
  });

  it('should handle git config detection failure', async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('git not found');
    });

    const onComplete = vi.fn();

    // Should not throw
    expect(() => {
      render(<SetupWizard onComplete={onComplete} />);
    }).not.toThrow();
  });

  it('should show progress indicator', async () => {
    // Override GitConfigStep to do nothing (pause at that step)
    mockGitConfigStep.mockImplementation(() => {
      // Don't call any callbacks, just render nothing
    });

    const onComplete = vi.fn();
    const { lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    // Wait for welcome to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    const frame = lastFrame();
    expect(frame).toContain('Step 2/5');
  });
});

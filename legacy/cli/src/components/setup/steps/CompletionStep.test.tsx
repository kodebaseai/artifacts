import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { UserConfig } from '../../../utils/config.js';
import { CompletionStep } from './CompletionStep.js';

describe('CompletionStep', () => {
  const mockConfig: UserConfig = {
    version: '1.0.0',
    setupCompleted: true,
    gitConfig: {
      userName: 'Test User',
      userEmail: 'test@example.com',
    },
    shellCompletion: {
      installed: true,
      shell: 'zsh',
    },
    preferences: {
      outputFormat: 'formatted',
      verbosity: 'normal',
      defaultEditor: 'vim',
    },
  };

  it('should render completion message', () => {
    const onComplete = vi.fn();

    const { lastFrame } = render(
      <CompletionStep config={mockConfig} onComplete={onComplete} />,
    );

    const frame = lastFrame();
    expect(frame).toContain('✨ Setup Complete!');
    expect(frame).toContain('Your Kodebase CLI is now configured:');
  });

  it('should display configuration summary', () => {
    const onComplete = vi.fn();

    const { lastFrame } = render(
      <CompletionStep config={mockConfig} onComplete={onComplete} />,
    );

    const frame = lastFrame();
    expect(frame).toContain('✓ Git identity: Test User (test@example.com)');
    expect(frame).toContain('✓ Shell completion: zsh');
    expect(frame).toContain('✓ Output format: formatted');
    expect(frame).toContain('✓ Verbosity: normal');
    expect(frame).toContain('✓ Editor: vim');
  });

  it('should show tutorial prompt by default', () => {
    const onComplete = vi.fn();

    const { lastFrame } = render(
      <CompletionStep config={mockConfig} onComplete={onComplete} />,
    );

    const frame = lastFrame();
    expect(frame).toContain(
      'Would you like to start the interactive tutorial?',
    );
    expect(frame).toContain('Learn Kodebase concepts and practice commands');
    expect(frame).toContain('Start tutorial? (Y/n)');
  });

  it('should skip tutorial prompt when skipTutorial is true', () => {
    const onComplete = vi.fn();

    const { lastFrame } = render(
      <CompletionStep
        config={mockConfig}
        skipTutorial={true}
        onComplete={onComplete}
      />,
    );

    const frame = lastFrame();
    expect(frame).not.toContain(
      'Would you like to start the interactive tutorial?',
    );
    expect(frame).toContain(
      'Configuration saved to ~/.config/kodebase/config.json',
    );
    expect(frame).toContain("Run 'kodebase setup' anytime to reconfigure");
    expect(frame).toContain("Run 'kodebase tutorial' to learn the basics");
  });

  it('should launch tutorial when y is pressed', async () => {
    const onComplete = vi.fn();

    const { stdin } = render(
      <CompletionStep config={mockConfig} onComplete={onComplete} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('y');

    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(true);
    });
  });

  it('should not launch tutorial when n is pressed', async () => {
    const onComplete = vi.fn();

    const { stdin, lastFrame } = render(
      <CompletionStep config={mockConfig} onComplete={onComplete} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('n');

    await vi.waitFor(() => {
      const frame = lastFrame();
      expect(frame).toContain('Press');
      expect(frame).toContain('Enter');
      expect(frame).toContain('to start using Kodebase');
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should complete without tutorial after n then Enter', async () => {
    const onComplete = vi.fn();

    const { stdin } = render(
      <CompletionStep config={mockConfig} onComplete={onComplete} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('n'); // Skip tutorial

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('\r'); // Press Enter

    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith();
    });
  });

  it('should handle partial configuration', () => {
    const partialConfig: UserConfig = {
      version: '1.0.0',
      setupCompleted: true,
      gitConfig: {
        userName: 'Test User',
        userEmail: 'test@example.com',
      },
      // No shell completion or preferences
    };

    const onComplete = vi.fn();

    const { lastFrame } = render(
      <CompletionStep config={partialConfig} onComplete={onComplete} />,
    );

    const frame = lastFrame();
    expect(frame).toContain('✓ Git identity: Test User (test@example.com)');
    expect(frame).not.toContain('Shell completion');
    expect(frame).not.toContain('Output format');
  });

  it('should handle empty git config', () => {
    const configWithoutGit: UserConfig = {
      version: '1.0.0',
      setupCompleted: true,
      preferences: {
        outputFormat: 'formatted',
        verbosity: 'normal',
        defaultEditor: 'vim',
      },
    };

    const onComplete = vi.fn();

    const { lastFrame } = render(
      <CompletionStep config={configWithoutGit} onComplete={onComplete} />,
    );

    const frame = lastFrame();
    expect(frame).not.toContain('Git identity');
    expect(frame).toContain('✓ Output format: formatted');
  });

  it('should ignore non-y/n input when showing tutorial prompt', () => {
    const onComplete = vi.fn();

    const { stdin, lastFrame } = render(
      <CompletionStep config={mockConfig} onComplete={onComplete} />,
    );

    stdin.write('x'); // Invalid input
    stdin.write('1'); // Invalid input

    const frame = lastFrame();
    expect(frame).toContain('Start tutorial? (Y/n)'); // Still showing prompt
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should handle Enter key correctly based on state', async () => {
    const onComplete = vi.fn();

    const { stdin } = render(
      <CompletionStep
        config={mockConfig}
        skipTutorial={true}
        onComplete={onComplete}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('\r'); // Press Enter directly (no tutorial prompt)

    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith();
    });
  });

  it('should handle shell completion without specific shell', () => {
    const configWithGenericShell: UserConfig = {
      ...mockConfig,
      shellCompletion: {
        installed: true,
        // No specific shell
      },
    };

    const onComplete = vi.fn();

    const { lastFrame } = render(
      <CompletionStep
        config={configWithGenericShell}
        onComplete={onComplete}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain('✓ Shell completion: installed');
  });
});

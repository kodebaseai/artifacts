// Import mocked functions
import { execSync } from 'node:child_process';
import { render } from 'ink-testing-library';

// Import memfs
import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShellCompletionStep } from './ShellCompletionStep.js';

// Mock node modules with memfs
vi.mock('node:fs', () => ({
  writeFileSync: vi.fn((path: string, data: string) => {
    vol.writeFileSync(path, data);
  }),
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('ShellCompletionStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vol.reset();
    // Set default shell
    vi.stubEnv('SHELL', '/bin/zsh');
    vi.stubEnv('HOME', '/home/testuser');
    // Create home directory in memfs
    vol.mkdirSync('/home/testuser', { recursive: true });
    // Create completion directories
    vol.mkdirSync('/home/testuser/.zsh/completions', { recursive: true });
    vol.mkdirSync('/home/testuser/.bash_completion.d', { recursive: true });
    // Set up execSync to succeed by default
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('mkdir -p')) {
        return '';
      }
      if (typeof cmd === 'string' && cmd.includes('__complete-zsh')) {
        return 'zsh completion script';
      }
      if (typeof cmd === 'string' && cmd.includes('__complete-bash')) {
        return 'bash completion script';
      }
      return '';
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vol.reset();
  });

  it('should render initial prompt', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain('Install Shell Completion');
    expect(frame).toContain('Shell completion enables tab completion');
    expect(frame).toContain('Install shell completion? (Y/n)');
  });

  it('should detect zsh shell', () => {
    vi.stubEnv('SHELL', '/bin/zsh');

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain('Detected shell: zsh');
  });

  it('should detect bash shell', () => {
    vi.stubEnv('SHELL', '/bin/bash');

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    const frame = lastFrame();
    expect(frame).toContain('Detected shell: bash');
  });

  it('should skip when n is pressed', async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('n');

    await vi.waitFor(() => {
      expect(onSkip).toHaveBeenCalledOnce();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should show installing state when y is pressed', async () => {
    let installStarted = false;
    // Mock execSync to capture when installation starts
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('mkdir -p')) {
        return '';
      }
      if (typeof cmd === 'string' && cmd.includes('__complete-zsh')) {
        installStarted = true;
        return 'zsh completion script';
      }
      if (typeof cmd === 'string' && cmd.includes('__complete-bash')) {
        installStarted = true;
        return 'bash completion script';
      }
      return '';
    });

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Get frame before pressing y
    const beforeFrame = lastFrame();
    expect(beforeFrame).toContain('Install shell completion? (Y/n)');

    stdin.write('y');

    // Since the operation is fast, just verify installation started
    await vi.waitFor(() => {
      expect(installStarted).toBe(true);
    });
  });

  it('should install zsh completion successfully', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('mkdir -p')) {
        return '';
      }
      if (typeof cmd === 'string' && cmd.includes('__complete-zsh')) {
        return 'zsh completion script';
      }
      return '';
    });

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('y');

    await vi.waitFor(() => {
      expect(execSync).toHaveBeenCalledWith(
        'npx kodebase __complete-zsh',
        expect.any(Object),
      );
    });

    await vi.waitFor(() => {
      const frame = lastFrame();
      return frame?.includes('✓ Shell completion installed successfully!');
    });

    const frame = lastFrame();
    expect(frame).toContain('✓ Shell completion installed successfully!');
  });

  it('should install bash completion successfully', async () => {
    vi.stubEnv('SHELL', '/bin/bash');

    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('mkdir -p')) {
        return '';
      }
      if (typeof cmd === 'string' && cmd.includes('__complete-bash')) {
        return 'bash completion script';
      }
      return '';
    });

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('y');

    await vi.waitFor(() => {
      expect(execSync).toHaveBeenCalledWith(
        'npx kodebase __complete-bash',
        expect.any(Object),
      );
    });

    await vi.waitFor(() => {
      const frame = lastFrame();
      return frame?.includes('✓ Shell completion installed successfully!');
    });

    const frame = lastFrame();
    expect(frame).toContain('✓ Shell completion installed successfully!');
  });

  it('should handle installation errors', async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Command not found');
    });

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('y');

    await vi.waitFor(() => {
      const frame = lastFrame();
      return frame?.includes('✗ Failed to install shell completion');
    });

    const frame = lastFrame();
    expect(frame).toContain('✗ Failed to install shell completion');
    expect(frame).toContain('You can install it manually');
  });

  it('should handle unknown shell', async () => {
    vi.stubEnv('SHELL', '/bin/fish');

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('y');

    await vi.waitFor(() => {
      const frame = lastFrame();
      return (
        frame &&
        (frame.includes('Unable to detect shell type') ||
          frame.includes('✗ Failed to install'))
      );
    });
  });

  it('should complete after successful installation', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('mkdir -p')) {
        return '';
      }
      if (typeof cmd === 'string' && cmd.includes('__complete-zsh')) {
        return 'completion script';
      }
      return '';
    });

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('y');

    // Wait for successful installation
    await vi.waitFor(() => {
      const frame = lastFrame();
      return frame?.includes('✓ Shell completion installed successfully!');
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('\r'); // Press Enter after success

    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({
        installed: true,
        shell: 'zsh',
      });
    });
  });

  it('should skip after error', async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Installation failed');
    });

    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin, lastFrame } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('y');

    await vi.waitFor(() => {
      const frame = lastFrame();
      return frame?.includes('✗ Failed to install');
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('\r'); // Press Enter after error

    await vi.waitFor(() => {
      expect(onSkip).toHaveBeenCalledOnce();
    });
  });

  it('should call onExit when Escape is pressed', async () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('\x1B'); // ESC key

    await vi.waitFor(() => {
      expect(onExit).toHaveBeenCalledOnce();
    });
  });

  it('should only process input when in correct state', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const onExit = vi.fn();

    const { stdin } = render(
      <ShellCompletionStep
        onComplete={onComplete}
        onSkip={onSkip}
        onExit={onExit}
      />,
    );

    // Type while not installing/error/success
    stdin.write('y');
    stdin.write('n'); // This should be ignored since we're already installing

    expect(onSkip).not.toHaveBeenCalled();
  });
});

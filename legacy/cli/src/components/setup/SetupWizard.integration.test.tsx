import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fs module with memfs
vi.mock('node:fs', async () => {
  const memfs = await vi.importActual<{ fs: any }>('memfs');
  return {
    ...memfs.fs,
    promises: memfs.fs.promises,
  };
});

// Mock os module
vi.mock('node:os', () => ({
  homedir: () => '/home/testuser',
}));

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn((cmd: string) => {
    if (cmd === 'git config user.name') return 'Test User';
    if (cmd === 'git config user.email') return 'test@example.com';
    if (cmd === 'npx kodebase __complete-bash')
      return '# bash completion script';
    if (cmd === 'npx kodebase __complete-zsh') return '# zsh completion script';
    if (cmd.includes('mkdir')) return '';
    return '';
  }),
}));

// Mock ink-select-input
vi.mock('ink-select-input', () => ({
  default: () => null,
}));

// Mock config utils
vi.mock('../../utils/config.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/config.js')>(
    '../../utils/config.js',
  );
  const { vol } = await import('memfs');
  const path = await import('node:path');
  const os = await import('node:os');

  return {
    ...actual,
    updateConfig: vi.fn(async (updates) => {
      // Simulate the actual updateConfig behavior
      const configDir = path.join(os.homedir(), '.config', 'kodebase');
      const configPath = path.join(configDir, 'config.json');

      try {
        vol.mkdirSync(configDir, { recursive: true });
      } catch {}

      const existingConfig = vol.existsSync(configPath)
        ? JSON.parse(vol.readFileSync(configPath, 'utf8') as string)
        : actual.DEFAULT_CONFIG;

      const newConfig = { ...existingConfig, ...updates };
      vol.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    }),
  };
});

// Import everything after mocks
import { render } from 'ink-testing-library';
import { vol } from 'memfs';
import { execSync } from 'node:child_process';
import { SetupWizard } from './SetupWizard.js';

describe('SetupWizard Integration', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
    // Create home directory
    vol.mkdirSync('/home/testuser', { recursive: true });
  });

  afterEach(() => {
    vol.reset();
  });

  it('should render and be interactive', () => {
    const onComplete = vi.fn();
    const { lastFrame, stdin } = render(
      <SetupWizard onComplete={onComplete} />,
    );

    // Should show welcome screen
    const frame = lastFrame();
    expect(frame).toContain('Welcome to Kodebase!');
    expect(frame).toContain('This setup wizard will help you configure');
  });

  it('should handle exit gracefully', async () => {
    const onComplete = vi.fn();
    const processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    const { stdin } = render(<SetupWizard onComplete={onComplete} />);

    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Press Enter to move past welcome screen
    stdin.write('\r');

    // Wait for git config step
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Press escape to exit from git config step
    stdin.write('\x1B');

    await vi.waitFor(
      () => {
        expect(processExitSpy).toHaveBeenCalledWith(0);
      },
      { timeout: 2000 },
    );

    processExitSpy.mockRestore();
  });

  it('should save partial progress on exit', async () => {
    const onComplete = vi.fn();
    const processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    const { stdin } = render(<SetupWizard onComplete={onComplete} />);

    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Press Enter to go to git config step
    stdin.write('\r');

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Press escape to exit
    stdin.write('\x1B');

    await vi.waitFor(
      () => {
        expect(processExitSpy).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Check that config was saved with setupCompleted: false
    const configPath = '/home/testuser/.config/kodebase/config.json';
    expect(vol.existsSync(configPath)).toBe(true);

    const savedConfig = JSON.parse(
      vol.readFileSync(configPath, 'utf8') as string,
    );
    expect(savedConfig.setupCompleted).toBe(false);

    processExitSpy.mockRestore();
  });

  it('should detect existing git config', async () => {
    const onComplete = vi.fn();

    // Clear mocks before this test
    vi.clearAllMocks();

    render(<SetupWizard onComplete={onComplete} />);

    // Wait for useEffect to run
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

  it('should handle git config detection failure gracefully', async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('git not found');
    });

    const onComplete = vi.fn();

    // Should not throw
    expect(() => {
      render(<SetupWizard onComplete={onComplete} />);
    }).not.toThrow();
  });
});

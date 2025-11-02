import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import {
  loadConfig,
  saveConfig,
  updateConfig,
  configExists,
  isFirstRun,
  DEFAULT_CONFIG,
  type UserConfig,
} from './config.js';

// Mock fs module with memfs
vi.mock('node:fs/promises', async () => {
  const memfs = await vi.importActual<{ fs: { promises: any } }>('memfs');
  return memfs.fs.promises;
});

// Mock os module
vi.mock('node:os', () => ({
  homedir: () => '/home/testuser',
}));

describe('Config utilities', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
    // Create home directory
    vol.mkdirSync('/home/testuser', { recursive: true });
  });

  afterEach(() => {
    vol.reset();
  });

  describe('configExists', () => {
    it('should return false when config does not exist', async () => {
      const exists = await configExists();
      expect(exists).toBe(false);
    });

    it('should return true when config exists', async () => {
      const configPath = '/home/testuser/.config/kodebase/config.json';
      vol.mkdirSync('/home/testuser/.config/kodebase', { recursive: true });
      vol.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG));

      const exists = await configExists();
      expect(exists).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should return null when config does not exist', async () => {
      const config = await loadConfig();
      expect(config).toBeNull();
    });

    it('should load config when it exists', async () => {
      const testConfig: UserConfig = {
        ...DEFAULT_CONFIG,
        gitConfig: {
          userName: 'Test User',
          userEmail: 'test@example.com',
        },
      };

      const configPath = '/home/testuser/.config/kodebase/config.json';
      vol.mkdirSync('/home/testuser/.config/kodebase', { recursive: true });
      vol.writeFileSync(configPath, JSON.stringify(testConfig));

      const config = await loadConfig();
      expect(config).toEqual(testConfig);
    });

    it('should handle invalid JSON gracefully', async () => {
      const configPath = '/home/testuser/.config/kodebase/config.json';
      vol.mkdirSync('/home/testuser/.config/kodebase', { recursive: true });
      vol.writeFileSync(configPath, 'invalid json');

      const config = await loadConfig();
      expect(config).toBeNull();
    });
  });

  describe('saveConfig', () => {
    it('should create config directory if it does not exist', async () => {
      const testConfig: UserConfig = {
        ...DEFAULT_CONFIG,
        setupCompleted: true,
      };

      await saveConfig(testConfig);

      expect(vol.existsSync('/home/testuser/.config/kodebase')).toBe(true);
      expect(
        vol.existsSync('/home/testuser/.config/kodebase/config.json'),
      ).toBe(true);
    });

    it('should save config with proper formatting', async () => {
      const testConfig: UserConfig = {
        ...DEFAULT_CONFIG,
        gitConfig: {
          userName: 'Test User',
          userEmail: 'test@example.com',
        },
        setupCompleted: true,
      };

      await saveConfig(testConfig);

      const savedContent = vol.readFileSync(
        '/home/testuser/.config/kodebase/config.json',
        'utf8',
      );
      const savedConfig = JSON.parse(savedContent as string);
      expect(savedConfig).toEqual(testConfig);
      // Check formatting (2 space indentation)
      expect(savedContent).toContain('  "version"');
    });
  });

  describe('updateConfig', () => {
    it('should update existing config', async () => {
      const initialConfig: UserConfig = {
        ...DEFAULT_CONFIG,
        setupCompleted: false,
      };

      // Save initial config
      vol.mkdirSync('/home/testuser/.config/kodebase', { recursive: true });
      vol.writeFileSync(
        '/home/testuser/.config/kodebase/config.json',
        JSON.stringify(initialConfig),
      );

      // Update config
      await updateConfig({
        setupCompleted: true,
        gitConfig: {
          userName: 'Updated User',
          userEmail: 'updated@example.com',
        },
      });

      const updatedConfig = await loadConfig();
      expect(updatedConfig?.setupCompleted).toBe(true);
      expect(updatedConfig?.gitConfig?.userName).toBe('Updated User');
      expect(updatedConfig?.version).toBe(DEFAULT_CONFIG.version); // Should preserve version
    });

    it('should create new config if none exists', async () => {
      await updateConfig({
        setupCompleted: true,
      });

      const config = await loadConfig();
      expect(config?.setupCompleted).toBe(true);
      expect(config?.version).toBe(DEFAULT_CONFIG.version);
    });
  });

  describe('isFirstRun', () => {
    it('should return true when config does not exist', async () => {
      const firstRun = await isFirstRun();
      expect(firstRun).toBe(true);
    });

    it('should return true when setupCompleted is false', async () => {
      const config: UserConfig = {
        ...DEFAULT_CONFIG,
        setupCompleted: false,
      };

      await saveConfig(config);

      const firstRun = await isFirstRun();
      expect(firstRun).toBe(true);
    });

    it('should return false when setupCompleted is true', async () => {
      const config: UserConfig = {
        ...DEFAULT_CONFIG,
        setupCompleted: true,
      };

      await saveConfig(config);

      const firstRun = await isFirstRun();
      expect(firstRun).toBe(false);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CONFIG.version).toBe('1.0.0');
      expect(DEFAULT_CONFIG.setupCompleted).toBe(false);
      expect(DEFAULT_CONFIG.gitConfig).toBeUndefined();
      expect(DEFAULT_CONFIG.shellCompletion).toBeUndefined();
      expect(DEFAULT_CONFIG.preferences).toEqual({
        outputFormat: 'formatted',
        verbosity: 'normal',
      });
    });
  });
});

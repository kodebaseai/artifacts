import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  readFile,
  writeFile,
  mkdir,
  access,
  constants,
} from 'node:fs/promises';

/**
 * User configuration interface for Kodebase CLI
 */
export interface UserConfig {
  setupCompleted: boolean;
  version: string;
  preferences?: {
    outputFormat?: 'formatted' | 'json';
    verbosity?: 'quiet' | 'normal' | 'verbose';
    defaultEditor?: string;
  };
  gitConfig?: {
    userName?: string;
    userEmail?: string;
  };
  shellCompletion?: {
    installed: boolean;
    shell?: 'bash' | 'zsh';
  };
  tutorialCompleted?: boolean;
}

/**
 * Default configuration for new users
 */
export const DEFAULT_CONFIG: UserConfig = {
  setupCompleted: false,
  version: '1.0.0',
  preferences: {
    outputFormat: 'formatted',
    verbosity: 'normal',
  },
};

/**
 * Configuration paths
 */
export const CONFIG_PATHS = {
  DIR: join(homedir(), '.config', 'kodebase'),
  FILE: join(homedir(), '.config', 'kodebase', 'config.json'),
};

/**
 * Check if configuration file exists
 */
export async function configExists(): Promise<boolean> {
  try {
    await access(CONFIG_PATHS.FILE, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load user configuration
 */
export async function loadConfig(): Promise<UserConfig | null> {
  try {
    const data = await readFile(CONFIG_PATHS.FILE, 'utf-8');
    return JSON.parse(data) as UserConfig;
  } catch {
    return null;
  }
}

/**
 * Save user configuration
 */
export async function saveConfig(config: UserConfig): Promise<void> {
  // Ensure config directory exists
  await mkdir(CONFIG_PATHS.DIR, { recursive: true });

  // Write config file
  await writeFile(CONFIG_PATHS.FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Check if this is the first run (no config exists)
 */
export async function isFirstRun(): Promise<boolean> {
  const exists = await configExists();
  if (!exists) {
    return true;
  }

  // Check if setup was completed
  const config = await loadConfig();
  return !config?.setupCompleted;
}

/**
 * Update specific config values
 */
export async function updateConfig(
  updates: Partial<UserConfig>,
): Promise<void> {
  const current = await loadConfig();
  const updated = {
    ...DEFAULT_CONFIG,
    ...current,
    ...updates,
  };
  await saveConfig(updated);
}

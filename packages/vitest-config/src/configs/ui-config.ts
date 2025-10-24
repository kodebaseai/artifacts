import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineProject, mergeConfig } from 'vitest/config';
import { baseConfig } from './base-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const uiConfig = mergeConfig(
  baseConfig,
  defineProject({
    test: {
      environment: 'jsdom',
      setupFiles: [join(__dirname, '../setup/react-setup.js')],
      globals: true,
    },
  }),
);

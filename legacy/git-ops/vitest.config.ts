import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '@kodebase/vitest-config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          'examples/**',
          'dist/**',
          '**/*.test.ts',
          '**/*.config.ts',
          '**/test/**',
        ],
      },
    },
  }),
);

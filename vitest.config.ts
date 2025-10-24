import { sharedConfig } from '@kodebase/vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...sharedConfig,
  test: {
    projects: [
      'packages/*',
      {
        extends: true,
        test: {
          ...sharedConfig.test,
          // Project-specific configuration for shared
        },
      },
      'apps/*',
      {
        extends: true,
        test: {
          ...sharedConfig.test,
          // Project-specific configuration for shared
          setupFiles: ['./vitest-setup.ts'],
          globals: true,
          environment: 'jsdom',
          css: true,
        },
      },
    ],
  },
});

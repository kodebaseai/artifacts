import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'branch/index': 'src/branch/index.ts',
    'automation/index': 'src/automation/index.ts',
    'installer/index': 'src/installer/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@kodebase/core'],
});

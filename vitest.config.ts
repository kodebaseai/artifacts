import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: true,
    environment: "node",
    coverage: {
      provider: "istanbul",
      reporter: ["text", "text-summary", "lcov", "html"],
      enabled: true,
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.integration.test.ts",
        "test/**/*",
        "**/node_modules/**",
        "**/dist/**",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
});

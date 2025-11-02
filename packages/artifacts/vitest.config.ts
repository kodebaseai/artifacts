import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "text-summary", "lcov"],
      enabled: true,
      thresholds: {
        lines: 95,
        functions: 100,
        branches: 83,
        statements: 95,
      },
    },
  },
});

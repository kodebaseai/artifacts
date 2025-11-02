import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/test/smoke/**", // Smoke tests run separately with tsx/tsc
    ],
    coverage: {
      provider: "istanbul",
      reporter: [
        "text",
        "text-summary",
        "lcov",
        [
          "json",
          {
            file: "../coverage.json",
          },
        ],
      ],
      enabled: true,
      // Thresholds set to current coverage levels - coverage should never go down
      thresholds: {
        lines: 95,
        functions: 100,
        branches: 85,
        statements: 95,
      },
    },
  },
});

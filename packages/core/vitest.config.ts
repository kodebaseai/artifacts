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
        [
          "json",
          {
            file: "../coverage.json",
          },
        ],
      ],
      enabled: true,
    },
  },
});

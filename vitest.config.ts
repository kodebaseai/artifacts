import { defineConfig } from "vitest/config";

// Minimal root config – keep it simple to avoid TS overload issues with projects
export default defineConfig({
  test: {
    setupFiles: ["./vitest-setup.ts"],
    globals: true,
    environment: "jsdom",
    css: true,
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json"],
      enabled: true,
    },
  },
});

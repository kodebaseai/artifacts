import { join } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      enabled: true,
    },
  },
  resolve: {
    alias: {
      "@": join(__dirname, "./"),
    },
  },
});

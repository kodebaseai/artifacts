import { join } from "node:path";
import { uiConfig } from "@kodebase/vitest-config/ui";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  uiConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": join(__dirname, "./"),
      },
    },
  }),
);

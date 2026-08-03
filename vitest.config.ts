import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    exclude: [".git/**", "e2e/**", "node_modules/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});

import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

loadEnvConfig(process.cwd());

process.env.CLERK_PUBLISHABLE_KEY ??=
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const nixosChromePath = "/etc/profiles/per-user/sherry/bin/google-chrome";
const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  (existsSync(nixosChromePath) ? nixosChromePath : undefined);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  workers: process.env.CI ? 1 : 2,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: chromiumExecutablePath,
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: "http://localhost:3000/sign-in",
      },
});

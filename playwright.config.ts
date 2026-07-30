import { defineConfig, devices } from "@playwright/test";

/**
 * Split-VPC E2E: FE and API are separate origins — never assume same-origin.
 * Defaults match local dual-server setup (FE :3000, BE :3001).
 */
const FE_BASE_URL = process.env.FE_BASE_URL ?? "http://localhost:3000";
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

// Expose for tests (CORS smoke, direct API checks).
process.env.FE_BASE_URL = FE_BASE_URL;
process.env.API_BASE_URL = API_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: FE_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /global\.setup\.ts/,
    },
  ],
});

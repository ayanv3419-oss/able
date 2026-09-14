import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const port = process.env.PORT || "3106";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  expect: { timeout: 30_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalSetup: "./tests/global-setup.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["list"], ["html", { open: "never" }]],
  retries: 0,
  testDir: "./tests/e2e",
  // Cold Next compilation can take several minutes on an 8 GB development PC.
  timeout: 240_000,
  use: { actionTimeout: 30_000, baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `node node_modules/next/dist/bin/next dev --port ${port} --hostname 127.0.0.1`,
    reuseExistingServer: false,
    timeout: 180_000,
    url: `${baseURL}/api/auth/csrf`,
  },
  workers: 1,
});

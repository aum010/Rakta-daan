import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end journeys for the public site and the frontend-only demo flows.
 *
 * The app uses a local PostgreSQL instance for its pre-existing "live" flows,
 * so the web server is expected to be started with the normal `.env.local`.
 * Port 3100 is used because 3000 may be occupied on this machine.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-GB",
    timezoneId: "Asia/Kathmandu",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // When E2E_BASE_URL is set, tests run against an already-running server
  // (e.g. the preview on 3010); Next.js only allows one dev server per project.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm exec next dev -p 3100",
        url: "http://localhost:3100/en",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});

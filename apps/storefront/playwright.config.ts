import { defineConfig, devices } from "@playwright/test";

const testPort = Number(process.env.PLAYWRIGHT_PORT ?? 4100);
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? "line" : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `NEXT_DIST_DIR=.next-e2e pnpm exec next dev --turbopack -p ${testPort}`,
        url: `${baseURL}/robots.txt`,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});

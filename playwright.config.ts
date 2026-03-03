import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: '.env.test' });
dotenv.config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* E2E specs to run (auth journey + match reveal/check-in). Omit testMatch to run all specs in tests/e2e. */
  testMatch: [
    /tests\/e2e\/auth-journey\.spec\.ts/,
    /tests\/e2e\/match-reveal-and-checkin\.spec\.ts/,
    /tests\/e2e\/match-incremental-late-arrivals\.spec\.ts/,
    /tests\/e2e\/chat-after-reveal\.spec\.ts/,
    /tests\/e2e\/messages-request-cap\.spec\.ts/,
    /tests\/e2e\/event-payment-flow\.spec\.ts/,
  ],
  /* Keep deterministic order for shared fixtures/storage states */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  /* Test and assertion timeouts: 30s max */
  timeout: 30_000,
  expect: { timeout: 30_000 },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
    /* Viewport */
    viewport: { width: 1280, height: 720 },
    /* Timeout for each action */
    actionTimeout: 30_000,
    /* Navigation timeout */
    navigationTimeout: 30_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});


import { defineConfig, devices } from '@playwright/test';

const isCI = process.env['CI'] !== undefined;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,

  /* Retry on CI only */
  retries: isCI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: isCI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list']
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers and devices */
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'iPhone 14',
      use: {
        ...devices['iPhone 14'],
      },
    },

    {
      name: 'iPhone 14 Pro Max',
      use: {
        ...devices['iPhone 14 Pro Max'],
      },
    },

    {
      name: 'Pixel 7',
      use: {
        ...devices['Pixel 7'],
      },
    },

    {
      name: 'iPad Pro',
      use: {
        ...devices['iPad Pro'],
      },
    },

    {
      name: 'Samsung Galaxy S9+',
      use: {
        ...devices['Galaxy S9+'],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});

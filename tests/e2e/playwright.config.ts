import { defineConfig, devices } from '@playwright/test';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4200';

export default defineConfig({
  testDir: './run',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once locally to catch flaky tests
  workers: process.env.CI ? 4 : undefined, // undefined = use all available CPUs locally
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  use: {
    baseURL: APP_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // ==========================================================================
    // CHROMIUM - Full test suite (functional + visual)
    // ==========================================================================
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /feature.*\.spec\.ts/,
    },
    // Feature flag tests run sequentially after main tests
    {
      name: 'chromium-features',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /features\.spec\.ts/,
      dependencies: ['chromium'],
    },
    {
      name: 'chromium-feature-toggles',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /feature-toggles\.spec\.ts/,
      dependencies: ['chromium-features'],
    },

  ],
  webServer: {
    command: 'kill $(lsof -ti:4200) $(lsof -ti:4201) 2>/dev/null || true; npm run dev',
    url: APP_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: '../..',
  },
  outputDir: './screenshots/test-results',
  snapshotDir: './screenshots',
});

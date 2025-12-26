import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4200';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  testDir: './run',
  testIgnore: /smoke\.spec\.ts/, // Smoke tests run separately against deployed environments
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once locally to catch flaky tests
  workers: process.env.CI ? 2 : undefined, // Reduce CI workers to avoid Supabase rate limiting
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['./flow-reporter.ts', { outputDir: 'playwright-report' }],
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
      testIgnore: [/feature.*\.spec\.ts/, /smoke\.spec\.ts/],
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
    command: 'kill $(lsof -ti:4200) $(lsof -ti:4201) 2>/dev/null || true; npm run start:e2e',
    url: APP_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: '../..',
  },
  outputDir: path.join(__dirname, 'screenshots/test-results'),
  snapshotDir: path.join(__dirname, 'screenshots'),
});

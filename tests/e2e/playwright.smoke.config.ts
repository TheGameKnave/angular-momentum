import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Smoke test configuration for deployed environments.
 *
 * Usage:
 *   APP_BASE_URL=https://dev.angularmomentum.app npx playwright test -c playwright.smoke.config.ts
 *   APP_BASE_URL=https://staging.angularmomentum.app npx playwright test -c playwright.smoke.config.ts
 */

const APP_BASE_URL = process.env.APP_BASE_URL;
if (!APP_BASE_URL) {
  throw new Error('APP_BASE_URL environment variable is required for smoke tests');
}

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  testDir: './run',
  testMatch: 'smoke.spec.ts',
  fullyParallel: false, // Run serially for predictable state
  retries: 1,
  workers: 1,
  timeout: 30000,
  reporter: [
    ['list'],
  ],
  use: {
    baseURL: APP_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer - we're testing against a deployed environment
  outputDir: path.join(__dirname, 'screenshots/smoke-results'),
});

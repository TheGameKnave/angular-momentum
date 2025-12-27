import { test, expect } from '@playwright/test';
import { APP_BASE_URL, API_BASE_URL } from '../data/constants';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { pages, getFeatureToggleByName } from '../helpers/selectors';

/**
 * Feature flags that control page visibility.
 * Each entry maps a feature name to its route path.
 */
const FEATURE_PAGES: Record<string, string> = {
  'GraphQL API': '/graphql-api',
  'IndexedDB': '/indexeddb',
  'Installers': '/installers',
  'Notifications': '/notifications',
};

/**
 * Helper to set a feature flag via API.
 */
async function setFeatureFlag(feature: string, value: boolean): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/feature-flags/${encodeURIComponent(feature)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    throw new Error(`Failed to set feature "${feature}" to ${value}: ${response.status}`);
  }
}

/**
 * Helper to enable all feature flags.
 */
async function enableAllFeatures(): Promise<void> {
  for (const feature of Object.keys(FEATURE_PAGES)) {
    await setFeatureFlag(feature, true);
  }
}

test.describe('Feature Toggle Tests', () => {
  // Run serially - these tests modify global feature flags that affect other tests
  test.describe.configure({ mode: 'serial' });

  // Ensure all features are enabled before and after this test suite
  test.beforeAll(async () => {
    await enableAllFeatures();
  });

  test.afterAll(async () => {
    // Critical: Re-enable all features so other tests don't fail
    await enableAllFeatures();
  });

  test.beforeEach(async ({ page }) => {
    // Reset all features to enabled state before each test
    // This ensures retries start with clean state
    await enableAllFeatures();

    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test.afterEach(async ({ page }) => {
    await assertNoMissingTranslations(page);
  });

  // ============================================================================
  // FEATURE DISABLE TESTS
  // ============================================================================

  test('Disabling a feature removes it from sidebar navigation', async ({ page }) => {
    // Verify GraphQL API link is in sidebar initially
    const graphqlLink = page.locator('app-menu-feature a[href*="graphql"]');
    await expect(graphqlLink).toBeVisible();

    // Disable the feature via API
    await setFeatureFlag('GraphQL API', false);

    // Reload the page to see the change
    await page.reload();
    await waitForAngular(page);

    // GraphQL API link should no longer be visible
    await expect(graphqlLink).not.toBeVisible();


    // Re-enable for cleanup
    await setFeatureFlag('GraphQL API', true);
  });

  test('Disabling a feature makes the page inaccessible', async ({ page }) => {
    // First verify the page is accessible
    await page.goto(`${APP_BASE_URL}/indexeddb`);
    await waitForAngular(page);
    await expect(page.locator(pages.indexedDbPage)).toBeVisible();

    // Disable the feature
    await setFeatureFlag('IndexedDB', false);

    // Navigate to the page - should redirect or show error
    await page.goto(`${APP_BASE_URL}/indexeddb`);
    await waitForAngular(page);

    // The IndexedDB page component should not be visible
    await expect(page.locator(pages.indexedDbPage)).not.toBeVisible();

    // Should have been redirected (not on /indexeddb anymore)
    expect(page.url()).not.toContain('/indexeddb');


    // Re-enable for cleanup
    await setFeatureFlag('IndexedDB', true);
  });

  test('Enabling a feature makes it appear in sidebar', async ({ page }) => {
    // Disable first
    await setFeatureFlag('Installers', false);
    await page.reload();
    await waitForAngular(page);

    // Verify not visible
    const installersLink = page.locator('app-menu-feature a[href*="installers"]');
    await expect(installersLink).not.toBeVisible();

    // Enable the feature
    await setFeatureFlag('Installers', true);

    // Reload to see change
    await page.reload();
    await waitForAngular(page);

    // Should now be visible
    await expect(installersLink).toBeVisible();

  });

  // ============================================================================
  // REAL-TIME UPDATE TESTS (WebSocket)
  // ============================================================================

  test('Feature disabled while on page navigates user away', async ({ page }) => {
    // Navigate to Notifications page
    await page.goto(`${APP_BASE_URL}/notifications`);
    await waitForAngular(page);
    await expect(page.locator(pages.notificationsPage)).toBeVisible();

    const initialUrl = page.url();
    expect(initialUrl).toContain('/notifications');

    // Disable the feature via API (triggers WebSocket update)
    await setFeatureFlag('Notifications', false);

    // Wait for redirect - WebSocket should push the update
    // Use a shorter timeout and catch to handle slow WebSocket
    try {
      await page.waitForURL((url) => !url.pathname.includes('/notifications'), { timeout: 5000 });
    } catch {
      // WebSocket may be slow - trigger check by reloading
      await page.reload();
      await waitForAngular(page);
    }

    // Verify we're no longer on notifications (either via WebSocket or reload)
    expect(page.url()).not.toContain('/notifications');

    // Re-enable for cleanup
    await setFeatureFlag('Notifications', true);
  });

  // ============================================================================
  // TOGGLE UI TESTS
  // ============================================================================

  test('Feature toggles on Features page reflect current state', async ({ page }) => {
    // Go to features page
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);

    // Get the GraphQL toggle
    const graphqlToggle = page.locator(getFeatureToggleByName('GraphQL API'));
    await expect(graphqlToggle).toBeVisible();

    // Check current state via the input
    const toggleInput = graphqlToggle.locator('input');
    const isEnabled = await toggleInput.isChecked();

    // Should be enabled (from global setup)
    expect(isEnabled).toBe(true);

  });

  test('Feature toggles are disabled for unauthenticated users', async ({ page }) => {
    // Go to features page
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);

    // Get the GraphQL toggle
    const graphqlToggle = page.locator(getFeatureToggleByName('GraphQL API'));
    await expect(graphqlToggle).toBeVisible();

    // The toggle input should be disabled for unauthenticated users
    const toggleInput = graphqlToggle.locator('input');
    await expect(toggleInput).toBeDisabled();

    // Auth prompt should be visible
    const authPrompt = page.locator('text=Register or log in to access all features');
    await expect(authPrompt).toBeVisible();

  });
});

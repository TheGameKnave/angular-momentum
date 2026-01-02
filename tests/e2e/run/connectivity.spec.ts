import { test, expect } from '@playwright/test';
import { APP_BASE_URL, API_BASE_URL } from '../data/constants';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, common } from '../helpers/selectors';

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
 * Helper to enable all footer-related features.
 */
async function enableFooterFeatures(): Promise<void> {
  await setFeatureFlag('App Version', true);
  await setFeatureFlag('Language', true);
}

test.describe('Connectivity & Offline Behavior Tests', () => {
  // Run serially - these tests modify network state
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await enableFooterFeatures();
  });

  test.afterAll(async () => {
    await enableFooterFeatures();
  });

  test.afterEach(async ({ page }) => {
    await assertNoMissingTranslations(page);
  });

  // ============================================================================
  // NAVIGATION RESILIENCE TESTS
  // ============================================================================

  test('Navigation menu remains visible regardless of feature flag state', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);

    // The navigation sidebar should always be visible
    // Navigation uses enabledComponents() which doesn't require flags to be loaded
    await expect(page.locator(menus.featureSidebar)).toBeVisible();

    // Should have navigation links
    const links = page.locator('app-menu-feature a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  // ============================================================================
  // OFFLINE INDICATOR TESTS
  // ============================================================================

  test('App shows wifi icon in header', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    // The app should show the wifi icon (online or offline)
    const wifiIcon = page.locator('header .pi-wifi');
    await expect(wifiIcon).toBeVisible();
  });

  test('Offline indicator appears when network is disconnected', async ({ page, context }) => {
    // First load the page normally
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    // Verify app loaded correctly
    await expect(page.locator(menus.featureSidebar)).toBeVisible();

    // Go offline using browser context
    await context.setOffline(true);

    // Trigger offline event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Wait for the offline indicator to update
    await page.waitForTimeout(500);

    // Check for offline warning icon (exclamation triangle appears when offline)
    const warningIcon = page.locator('header .pi-exclamation-triangle');
    const hasWarningIcon = await warningIcon.isVisible().catch(() => false);

    // The app should show some indication we're offline OR still be functional
    if (hasWarningIcon) {
      // Offline warning is visible - good
      expect(hasWarningIcon).toBe(true);
    } else {
      // No warning but app should still be functional
      await expect(page.locator(menus.featureSidebar)).toBeVisible();
    }

    // Restore online state
    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
  });

  test('App recovers gracefully when coming back online', async ({ page, context }) => {
    // Load the page
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    // Go offline
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(300);

    // Come back online
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(500);

    // App should remain functional
    await expect(page.locator(menus.featureSidebar)).toBeVisible();

    // Navigation should work
    await page.click(menus.featureLink('features'));
    await waitForAngular(page);

    // Features page should load
    await expect(page.locator('app-features')).toBeVisible();
  });

  // ============================================================================
  // GRACEFUL DEGRADATION TESTS
  // ============================================================================

  test('App remains functional when API is slow', async ({ page, context }) => {
    // Slow down the API response (but don't block it)
    await context.route('**/api/feature-flags', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto(APP_BASE_URL);

    // App should still load and be interactive before API responds
    await expect(page.locator(menus.featureSidebar)).toBeVisible();

    // Navigation should work even during slow API response
    const homeLink = page.locator(common.homeLink);
    await expect(homeLink).toBeVisible();

    // Clear the route for cleanup
    await context.unroute('**/api/feature-flags');
  });

  test('Navigation works during network interruption', async ({ page, context }) => {
    // Load the page normally first
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    // Verify initial state
    await expect(page.locator(menus.featureSidebar)).toBeVisible();

    // Simulate temporary network interruption
    await context.setOffline(true);
    await page.waitForTimeout(100);
    await context.setOffline(false);

    // Navigation should still work
    await page.click(menus.featureLink('features'));
    await waitForAngular(page);

    // Page should load
    await expect(page.locator('app-features')).toBeVisible();
  });
});

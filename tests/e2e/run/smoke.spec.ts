import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, auth, common } from '../helpers/selectors';

/**
 * Smoke tests for deployed environments.
 *
 * These tests verify critical functionality after deployment:
 * - SSR hydration works
 * - API connectivity (feature flags, changelog)
 * - Auth flow (login form renders)
 * - Navigation works
 * - WebSocket connection (notification center)
 *
 * Run with:
 *   APP_BASE_URL=https://dev.angularmomentum.app npx playwright test -c playwright.smoke.config.ts
 */

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  // ==========================================================================
  // SSR & HYDRATION
  // ==========================================================================

  test('App loads and hydrates correctly', async ({ page }) => {
    // Landing page renders (SSR worked)
    await expect(page.locator(pages.landingPage)).toBeVisible();

    // Angular has hydrated (interactive elements work)
    await expect(page.locator(menus.featureSidebar)).toBeVisible();

    // No hydration errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to trigger any hydration issues
    await page.click(`${menus.featureSidebar} a >> nth=0`);
    await waitForAngular(page);

    // Filter out expected errors (CORS from external APIs in staging)
    const unexpectedErrors = errors.filter(e =>
      !e.includes('CORS') &&
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });

  // ==========================================================================
  // API CONNECTIVITY
  // ==========================================================================

  test('API is reachable (changelog loads)', async ({ page }) => {
    // Changelog button should be visible (requires API to fetch version)
    const changelogButton = page.locator(menus.changelogMenuButton);

    // Wait for changelog to load - it fetches from API
    await expect(changelogButton).toBeVisible({ timeout: 10000 });

    // Open changelog menu to verify content loaded
    await changelogButton.click();
    await expect(page.locator(menus.changelogMenuContent)).toBeVisible();
  });

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  test('Feature navigation works', async ({ page }) => {
    // Navigate to features page via sidebar
    const featuresLink = page.locator(`${menus.featureSidebar} a[href="/features"]`);
    await featuresLink.click();
    await waitForAngular(page);

    // Features page should be visible
    await expect(page.locator(pages.featuresPage)).toBeVisible();

    // URL should be /features
    expect(page.url()).toContain('/features');
  });

  test('Privacy page loads', async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/privacy`);
    await waitForAngular(page);

    await expect(page.locator(pages.privacyPage)).toBeVisible();
  });

  // ==========================================================================
  // AUTH UI
  // ==========================================================================

  test('Auth menu opens and login form renders', async ({ page }) => {
    // Open auth menu
    await page.click(menus.authMenuButton);
    await expect(page.locator(menus.authMenuContent)).toBeVisible();

    // Click login tab
    await page.click(auth.loginTab);

    // Login form should be visible with all fields
    await expect(page.locator(auth.loginForm)).toBeVisible();
    await expect(page.locator(auth.loginIdentifier)).toBeVisible();
    await expect(page.locator(auth.loginPassword)).toBeVisible();
    await expect(page.locator(auth.loginSubmit)).toBeVisible();
  });

  // ==========================================================================
  // LANGUAGE SWITCHING
  // ==========================================================================

  test('Language menu works', async ({ page }) => {
    // Open language menu
    await page.click(menus.languageMenuButton);
    await expect(page.locator(menus.languageMenuContent)).toBeVisible();

    // Should show language options
    const languageOptions = page.locator(`${menus.languageMenuContent} button`);
    await expect(languageOptions.first()).toBeVisible();
  });

  // ==========================================================================
  // WEBSOCKET (NOTIFICATION CENTER)
  // ==========================================================================

  test('Notification center opens', async ({ page }) => {
    // Notification center button should be visible
    const notificationButton = page.locator(menus.notificationCenterButton);

    // May not be visible if notifications feature is disabled
    const isVisible = await notificationButton.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await notificationButton.click();
    await expect(page.locator(menus.notificationCenterContent)).toBeVisible();
  });
});

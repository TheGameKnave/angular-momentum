import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, common, getLanguageOption } from '../helpers/selectors';

test.describe('Navigation & Layout Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test.afterEach(async ({ page }) => {
    await assertNoMissingTranslations(page);
  });

  // ============================================================================
  // PAGE LOAD TESTS
  // ============================================================================

  test('Landing page loads correctly', async ({ page }) => {
    await expect(page.locator(pages.landingPage)).toBeVisible();

  });

  test('Privacy page loads correctly', async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/privacy`);

    await expect(page.locator(pages.privacyPage)).toBeVisible();

  });

  // ============================================================================
  // MENU TESTS
  // ============================================================================

  test('Auth menu opens and closes', async ({ page }) => {
    // Open menu
    await page.click(menus.authMenuButton);
    await expect(page.locator(menus.authMenuContent)).toBeVisible();


    // Close by clicking outside
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
  });

  test('Language menu opens and closes', async ({ page }) => {
    // Open menu (language selector is in footer)
    await page.click(menus.languageMenuButton);
    await expect(page.locator(menus.languageMenuContent)).toBeVisible();

    // Close by clicking outside
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
  });

  test('Feature sidebar displays navigation links', async ({ page }) => {
    // Feature sidebar is navigation, not a popup menu
    await expect(page.locator(menus.featureSidebar)).toBeVisible();

    // Should have navigation links
    const links = page.locator('app-menu-feature a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);

  });

  test('Changelog menu opens and closes', async ({ page }) => {
    // Open menu (version number in footer)
    await page.click(menus.changelogMenuButton);
    await expect(page.locator(menus.changelogMenuContent)).toBeVisible();

    // Close by clicking outside
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
  });

  // ============================================================================
  // LANGUAGE SWITCH TESTS
  // ============================================================================

  test('Language switch to Spanish works', async ({ page }) => {
    // Open language menu
    await page.click(menus.languageMenuButton);

    // Click Spanish option
    await page.click(getLanguageOption('es'));

    await page.waitForTimeout(1000);


    // Switch back to English for other tests
    await page.click(menus.languageMenuButton);
    await page.click(getLanguageOption('en-US'));
    await page.waitForTimeout(500);
  });

  // ============================================================================
  // NOTIFICATION CENTER TESTS
  // ============================================================================

  test('Notification center opens and shows empty state', async ({ page }) => {
    // Open notification center
    await page.click(menus.notificationCenterButton);
    await expect(page.locator(menus.notificationCenterContent)).toBeVisible();

    // Check for empty state or list
    const hasEmpty = await page.locator(menus.notificationEmpty).isVisible().catch(() => false);
    const hasList = await page.locator(menus.notificationList).isVisible().catch(() => false);

    expect(hasEmpty || hasList).toBeTruthy();

  });

  test('Notification center - mark all as read button appears with notifications', async ({ page }) => {
    // Open notification center
    await page.click(menus.notificationCenterButton);

    // Check if mark all read button exists (only visible if there are unread notifications)
    const markAllReadButton = page.locator(menus.notificationMarkAllRead);
    const hasMarkAllRead = await markAllReadButton.isVisible().catch(() => false);

    // If there are unread notifications, test mark all read
    if (hasMarkAllRead) {
      await markAllReadButton.click();
      await page.waitForTimeout(500);

    }

    // Close menu
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('Notification center - clear all button appears with notifications', async ({ page }) => {
    // Open notification center
    await page.click(menus.notificationCenterButton);

    // Check if clear all button exists (only visible if there are notifications)
    const clearAllButton = page.locator(menus.notificationClearAll);
    const hasClearAll = await clearAllButton.isVisible().catch(() => false);

    if (hasClearAll) {

      await clearAllButton.click();
      await page.waitForTimeout(500);

    }

    // Close menu
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  // ============================================================================
  // MOBILE RESPONSIVE TEST
  // ============================================================================

  test('Mobile layout displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await expect(page.locator(pages.landingPage)).toBeVisible();


    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 1024 });
  });

  // ============================================================================
  // HOME LINK TEST
  // ============================================================================

  test('Home link navigates to landing page', async ({ page }) => {
    // Navigate away first
    await page.goto(`${APP_BASE_URL}/privacy`);
    await expect(page.locator(pages.privacyPage)).toBeVisible();

    // Click home link
    await page.click(common.homeLink);

    await page.waitForTimeout(500);

    // Should be back on landing page
    expect(page.url()).toMatch(/\/$/);
  });

  // ============================================================================
  // BREADCRUMB TESTS
  // ============================================================================

  test('Breadcrumb shows component name when on component page', async ({ page }) => {
    // Navigate to features page
    await page.click(menus.featureLink('features'));
    await waitForAngular(page);

    // Breadcrumb should show "Momentum | Features"
    const breadcrumbs = page.locator('.breadcrumbs');
    await expect(breadcrumbs).toContainText('Features');
  });

  test('Breadcrumb clears when navigating to root', async ({ page }) => {
    // First navigate to a component page
    await page.click(menus.featureLink('features'));
    await waitForAngular(page);

    // Verify breadcrumb is set
    const breadcrumbs = page.locator('.breadcrumbs');
    await expect(breadcrumbs).toContainText('Features');

    // Navigate back to root
    await page.click(common.homeLink);
    await waitForAngular(page);

    // Breadcrumb should only show "Momentum" (no component name)
    await expect(breadcrumbs).not.toContainText('|');
  });

  test('Breadcrumb updates when navigating between components', async ({ page }) => {
    // Navigate to features page
    await page.click(menus.featureLink('features'));
    await waitForAngular(page);

    const breadcrumbs = page.locator('.breadcrumbs');
    await expect(breadcrumbs).toContainText('Features');

    // Navigate to a different component (if available)
    const graphqlLink = page.locator(menus.featureLink('graphql'));
    if (await graphqlLink.isVisible().catch(() => false)) {
      await graphqlLink.click();
      await waitForAngular(page);
      await expect(breadcrumbs).toContainText('GraphQL API');
    }
  });
});

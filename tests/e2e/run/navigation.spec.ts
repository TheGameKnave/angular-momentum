import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, common, getLanguageOption } from '../helpers/selectors';

// Helper to seed one unread notification via the notifications page.
// Requires the notifications permission (granted below) so the local send succeeds.
async function seedNotification(page: any): Promise<void> {
  await page.goto(`${APP_BASE_URL}/notifications`);
  await waitForAngular(page);
  const sendLocalButton = page.locator(pages.sendLocalButton).first();
  await expect(sendLocalButton).toBeVisible();
  await sendLocalButton.click();
  // Unread badge confirms the notification landed in the notification center
  await expect(page.locator(menus.notificationBadge)).toHaveText('1');
}

test.describe('Navigation & Layout Tests', () => {
  // Grant the browser notification permission so notification-center tests can
  // deterministically seed notifications via local sends.
  test.use({ permissions: ['notifications'] });

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
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible();
  });

  test('Language menu opens and closes', async ({ page }) => {
    // Open menu (language selector is in footer)
    await page.click(menus.languageMenuButton);
    await expect(page.locator(menus.languageMenuContent)).toBeVisible();

    // Close by clicking outside
    await page.click('body', { position: { x: 10, y: 10 } });
    await expect(page.locator(menus.languageMenuContent)).not.toBeVisible();
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

    // Close by clicking outside — the panel is a full-height left rail, so
    // click the CDK backdrop itself (its clickable area is right of the panel)
    await page.click('.app-overlay-backdrop', { position: { x: 500, y: 10 } });
    await expect(page.locator(menus.changelogMenuContent)).not.toBeVisible();
  });

  // ============================================================================
  // LANGUAGE SWITCH TESTS
  // ============================================================================

  test('Language switch to Spanish works', async ({ page }) => {
    // Open language menu
    await page.click(menus.languageMenuButton);

    // Click Spanish option
    await page.click(getLanguageOption('es'));

    // Verify Spanish flag is shown
    await expect(page.locator(`${menus.languageMenuButton} .fi-es`)).toBeVisible();

    // Switch back to English for other tests
    await page.click(menus.languageMenuButton);
    await page.click(getLanguageOption('en-US'));
    await expect(page.locator(`${menus.languageMenuButton} .fi-us`)).toBeVisible();
  });

  // ============================================================================
  // NOTIFICATION CENTER TESTS
  // ============================================================================

  test('Notification center opens and shows empty state', async ({ page }) => {
    // Open notification center
    await page.click(menus.notificationCenterButton);
    await expect(page.locator(menus.notificationCenterContent)).toBeVisible();

    // Fresh session has no notifications, so the empty state shows (not the list)
    await expect(page.locator(menus.notificationEmpty)).toBeVisible();
    await expect(page.locator(menus.notificationList)).toHaveCount(0);

  });

  test('Notification center - mark all as read button appears with notifications', async ({ page }) => {
    // Seed an unread notification so the button is guaranteed to render
    await seedNotification(page);

    // Open notification center
    await page.click(menus.notificationCenterButton);
    await expect(page.locator(menus.notificationCenterContent)).toBeVisible();

    // One unread notification exists, so mark all read must be offered
    const markAllReadButton = page.locator(menus.notificationMarkAllRead);
    await expect(markAllReadButton).toBeVisible();
    await markAllReadButton.click();

    // Everything is read: the button and the unread badge disappear
    await expect(markAllReadButton).toHaveCount(0);
    await expect(page.locator(menus.notificationBadge)).toHaveCount(0);

    // Notification center should still be open
    await expect(page.locator(menus.notificationCenterContent)).toBeVisible();

    // Close menu
    await page.click('body', { position: { x: 10, y: 10 } });
  });

  test('Notification center - clear all button appears with notifications', async ({ page }) => {
    // Seed a notification so the button is guaranteed to render
    await seedNotification(page);

    // Open notification center
    await page.click(menus.notificationCenterButton);
    await expect(page.locator(menus.notificationCenterContent)).toBeVisible();

    // A notification exists, so clear all must be offered
    const clearAllButton = page.locator(menus.notificationClearAll);
    await expect(clearAllButton).toBeVisible();
    await clearAllButton.click();

    // The list empties back to the empty state and the button disappears
    await expect(page.locator(menus.notificationEmpty)).toBeVisible();
    await expect(clearAllButton).toHaveCount(0);

    // Notification center should still be open
    await expect(page.locator(menus.notificationCenterContent)).toBeVisible();

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

    // Should be back on landing page
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(pages.landingPage)).toBeVisible();
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

    // Navigate to the GraphQL API page — its feature flag is enabled by
    // global-setup for e2e runs, so the link must be present
    const graphqlLink = page.locator(menus.featureLink('graphql'));
    await expect(graphqlLink).toBeVisible();
    await graphqlLink.click();
    await waitForAngular(page);
    await expect(breadcrumbs).toContainText('GraphQL API');
  });
});

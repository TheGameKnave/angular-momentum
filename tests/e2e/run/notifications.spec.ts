import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser, TestUser } from '../data/test-users';
import { createTestUser, deleteTestUser } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, auth } from '../helpers/selectors';

// Shared test user for notification tests
let sharedUser: TestUser;
let sharedUserId: string;

// Helper to navigate to notifications page
async function navigateToNotifications(page: any): Promise<void> {
  await page.goto(`${APP_BASE_URL}/notifications`);
  await page.waitForSelector(pages.notificationsPage, { timeout: 5000 });
  await waitForAngular(page);
}

test.describe('Notifications Tests', () => {
  // Grant the browser notification permission for the whole context so
  // permission-dependent UI (status grid, local sends) behaves deterministically.
  test.use({ permissions: ['notifications'] });

  test.beforeAll(async () => {
    // Create a shared user for tests
    sharedUser = generateTestUser();
    const result = await createTestUser(sharedUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    sharedUserId = result.userId!;
    console.log(`Created shared test user for notifications: ${sharedUser.email}`);
    // Delay to ensure user is fully propagated in Supabase
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test.afterAll(async () => {
    // Clean up shared user
    if (sharedUser) {
      await deleteTestUser({ email: sharedUser.email });
      console.log(`Deleted shared test user: ${sharedUser.email}`);
    }
  });

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

  test('Notifications page loads correctly', async ({ page }) => {
    await navigateToNotifications(page);

    // Verify notifications page is visible
    await expect(page.locator(pages.notificationsPage)).toBeVisible();

  });

  // ============================================================================
  // PERMISSION TESTS
  // ============================================================================

  test('Notification permission status shows granted', async ({ page }) => {
    await navigateToNotifications(page);

    // The page has no permission request button (that lives in the notification
    // center footer and only renders when permission is missing). With the
    // permission granted via context, the status grid must report Granted.
    await expect(page.locator(pages.notificationPermissionGranted)).toBeVisible();

    // Page should still be on notifications route
    await expect(page).toHaveURL(/\/notifications/);
  });

  // ============================================================================
  // NOTIFICATION TEMPLATE TESTS
  // ============================================================================

  test('Notification templates are displayed', async ({ page }) => {
    await navigateToNotifications(page);

    // All four predefined templates render, each with its send buttons
    await expect(page.locator(pages.notificationTemplates)).toBeVisible();
    await expect(page.locator(pages.notificationTemplateCard)).toHaveCount(4);
    await expect(page.locator(pages.sendLocalButton)).toHaveCount(4);
    await expect(page.locator(pages.sendBroadcastButton)).toHaveCount(4);

  });

  test('Send local notification succeeds', async ({ page }) => {
    await navigateToNotifications(page);

    // Send the first predefined notification locally
    const sendLocalButton = page.locator(pages.sendLocalButton).first();
    await expect(sendLocalButton).toBeVisible();
    await sendLocalButton.click();

    // Permission is granted, so the page reports success
    await expect(page.locator(pages.localNotificationStatus)).toContainText('successfully');

    // The notification is also recorded in the notification center (unread badge)
    await expect(page.locator(menus.notificationBadge)).toHaveText('1');

    // Page should still be on notifications route
    await expect(page).toHaveURL(/\/notifications/);
  });

  // ============================================================================
  // SERVER NOTIFICATION TESTS (requires authentication)
  // ============================================================================

  test('Server notification requires authentication', async ({ page }) => {
    await navigateToNotifications(page);

    // Broadcast goes through the server, so it renders disabled for anonymous users
    const sendBroadcastButton = page.locator(pages.sendBroadcastButton).first();
    await expect(sendBroadcastButton).toBeVisible();
    await expect(sendBroadcastButton.locator('button')).toBeDisabled();

    // Page should still be on notifications route
    await expect(page).toHaveURL(/\/notifications/);
  });

  test('Server notification works when authenticated', async ({ page }) => {
    // Login first
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);
    await page.click(auth.loginSubmit);

    // Wait for login to complete (profile view appears in menu)
    await page.waitForSelector(auth.profileMenu, { timeout: 15000 });
    // Close the menu and wait for the panel to disappear
    await page.keyboard.press('Escape');
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible();

    await navigateToNotifications(page);

    // Broadcast button is enabled for authenticated users
    const sendBroadcastButton = page.locator(pages.sendBroadcastButton).first();
    await expect(sendBroadcastButton).toBeVisible();
    await expect(sendBroadcastButton.locator('button')).toBeEnabled();
    await sendBroadcastButton.click();

    // Server acknowledges the broadcast
    await expect(page.locator(pages.serverNotificationStatus)).toContainText('✅', { timeout: 10000 });

    // The broadcast is delivered back over WebSocket into the notification center
    await expect(page.locator(menus.notificationBadge)).toBeVisible({ timeout: 10000 });
    await page.click(menus.notificationCenterButton);
    await expect(page.locator(menus.notificationItem).first()).toBeVisible();

    // Close notification center and wait for the panel to disappear
    await page.keyboard.press('Escape');
    await expect(page.locator(menus.notificationCenterContent)).not.toBeVisible();

    // Logout - open menu and wait for profile to appear
    await page.click(menus.authMenuButton);
    await page.waitForSelector(auth.profileMenu, { timeout: 5000 });
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.click();
    // Wait for menu panel to close (logout triggers menu close)
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });
  });
});

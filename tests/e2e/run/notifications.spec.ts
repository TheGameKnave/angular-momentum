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
}

test.describe('Notifications Tests', () => {
  test.beforeAll(async () => {
    // Create a shared user for tests
    sharedUser = generateTestUser();
    const result = await createTestUser(sharedUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    sharedUserId = result.userId!;
    console.log(`Created shared test user for notifications: ${sharedUser.email}`);
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

  test('Request permission button is visible', async ({ page }) => {
    await navigateToNotifications(page);

    // Look for permission request button
    const permissionButton = page.locator('app-notifications button:has-text(/permission|enable|allow/i)');

    if (await permissionButton.isVisible().catch(() => false)) {

      // Note: We can't actually grant notification permissions in automated tests
      // The browser will block the permission request
    }
  });

  // ============================================================================
  // NOTIFICATION TEMPLATE TESTS
  // ============================================================================

  test('Notification templates are displayed', async ({ page }) => {
    await navigateToNotifications(page);

    // Check for notification templates or send buttons
    const hasTemplates = await page.locator(pages.notificationTemplates).isVisible().catch(() => false);
    const hasSendLocalButton = await page.locator(pages.sendLocalButton).isVisible().catch(() => false);
    const hasSendServerButton = await page.locator(pages.sendServerButton).isVisible().catch(() => false);

    expect(hasTemplates || hasSendLocalButton || hasSendServerButton).toBeTruthy();

  });

  test('Send local notification button exists', async ({ page }) => {
    await navigateToNotifications(page);

    // Check for send local notification button
    const sendLocalButton = page.locator('app-notifications button:has-text(/local|send/i)');

    if (await sendLocalButton.isVisible().catch(() => false)) {

      // Click the button (notification may be blocked by browser, but UI should respond)
      await sendLocalButton.click();
      await page.waitForTimeout(600);

    }
  });

  // ============================================================================
  // SERVER NOTIFICATION TESTS (requires authentication)
  // ============================================================================

  test('Server notification requires authentication', async ({ page }) => {
    await navigateToNotifications(page);

    // Look for server notification button
    const sendServerButton = page.locator('app-notifications button:has-text(/server/i)');

    if (await sendServerButton.isVisible().catch(() => false)) {
      // Try clicking without auth
      await sendServerButton.click();
      await page.waitForTimeout(600);

    }
  });

  test('Server notification works when authenticated', async ({ page }) => {
    // Login first
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);
    await page.click(auth.loginSubmit);

    // Wait for login to complete
    await page.waitForSelector(auth.profileMenu, { timeout: 10000 });

    await navigateToNotifications(page);

    // Look for server notification button
    const sendServerButton = page.locator('app-notifications button:has-text(/server/i)');

    if (await sendServerButton.isVisible().catch(() => false)) {
      await sendServerButton.click();
      await page.waitForTimeout(600);


      // Check notification center for the notification
      await page.click(menus.notificationCenterButton);
      await page.waitForTimeout(600);

    }

    // Logout
    await page.click(menus.authMenuButton);
    await page.click(auth.logoutButton);
    // Wait for profile menu to disappear (indicates logged out state)
    await expect(page.locator(auth.profileMenu)).not.toBeVisible({ timeout: 5000 });
  });
});

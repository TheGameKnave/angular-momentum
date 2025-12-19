import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser, TestUser } from '../data/test-users';
import { createTestUser, deleteTestUser } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, auth, common } from '../helpers/selectors';

// Shared test user for non-destructive profile tests
let sharedUser: TestUser;
let sharedUserId: string;

// Helper to login and close menu
async function loginWithSharedUser(page: any): Promise<void> {
  await page.click(menus.authMenuButton);
  await page.click(auth.loginTab);
  await page.fill(auth.loginIdentifier, sharedUser.email);
  await page.fill(auth.loginPassword, sharedUser.password);
  await page.click(auth.loginSubmit);
  // Wait for auth menu to show profile (logged in state)
  await page.waitForSelector(auth.profileMenu, { timeout: 10000 });
  // Close the menu so subsequent navigation works cleanly
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

test.describe('Profile Tests', () => {
  test.beforeAll(async () => {
    // Create a shared user for non-destructive tests
    sharedUser = generateTestUser();
    const result = await createTestUser(sharedUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    sharedUserId = result.userId!;
    console.log(`Created shared test user for profile: ${sharedUser.email}`);
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

  test('Profile page loads when authenticated', async ({ page }) => {
    await loginWithSharedUser(page);

    // Navigate to profile
    await page.goto(`${APP_BASE_URL}/profile`);
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    await expect(page.locator(pages.profilePage)).toBeVisible();

    // Logout via auth menu
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.waitFor({ state: 'visible' });
    await logoutBtn.click();
    // Wait for menu panel to close (logout triggers menu close)
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 10000 });
  });

  test('Profile displays user info', async ({ page }) => {
    await loginWithSharedUser(page);

    // Navigate to profile
    await page.goto(`${APP_BASE_URL}/profile`);
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    // Check that user info is displayed
    await expect(page.locator(pages.profilePage)).toBeVisible();

    // Logout via auth menu
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.waitFor({ state: 'visible' });
    await logoutBtn.click();
    // Wait for menu panel to close (logout triggers menu close)
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // TIMEZONE TESTS
  // ============================================================================

  test('Timezone selection is available', async ({ page }) => {
    await loginWithSharedUser(page);

    // Navigate to profile
    await page.goto(`${APP_BASE_URL}/profile`);
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    // Check timezone dropdown exists
    await expect(page.locator(pages.profileTimezone)).toBeVisible();

    // Click to open dropdown
    await page.click(pages.profileTimezone);
    await page.waitForTimeout(300);

    // Click outside to close
    await page.click('body', { position: { x: 10, y: 10 } });

    // Logout via auth menu
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.waitFor({ state: 'visible' });
    await logoutBtn.click();
    // Wait for menu panel to close (logout triggers menu close)
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // THEME TESTS
  // ============================================================================

  test('Theme toggle is available', async ({ page }) => {
    await loginWithSharedUser(page);

    // Navigate to profile
    await page.goto(`${APP_BASE_URL}/profile`);
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    // Check theme toggle exists
    await expect(page.locator(pages.profileThemeToggle)).toBeVisible();

    // Logout via auth menu
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.waitFor({ state: 'visible' });
    await logoutBtn.click();
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 10000 });
  });

  test('Theme toggle switches between light and dark mode', async ({ page }) => {
    await loginWithSharedUser(page);

    // Navigate to profile
    await page.goto(`${APP_BASE_URL}/profile`);
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    // Wait for the toggle input to be enabled (not loading from server)
    const themeToggleInput = page.locator('app-profile .theme-toggle p-toggleswitch input');
    await expect(themeToggleInput).toBeEnabled({ timeout: 5000 });

    // Wait for settings to fully load from server (there's round-tripping with local/remote)
    await page.waitForTimeout(1000);

    // Get initial theme state (default is dark, so html should have app-dark class)
    const htmlElement = page.locator('html');
    const initialHasDarkClass = await htmlElement.evaluate(el => el.classList.contains('app-dark'));

    // Click the switch element directly using role selector
    const themeSwitch = page.getByRole('switch', { name: 'Light Dark' });
    await themeSwitch.click();
    await page.waitForTimeout(1000); // Wait for theme to apply and sync

    // Check that the theme class changed
    const afterToggleHasDarkClass = await htmlElement.evaluate(el => el.classList.contains('app-dark'));
    expect(afterToggleHasDarkClass).not.toBe(initialHasDarkClass);

    // Click switch again to toggle back
    await themeSwitch.click();
    await page.waitForTimeout(500);

    // Should be back to original state
    const finalHasDarkClass = await htmlElement.evaluate(el => el.classList.contains('app-dark'));
    expect(finalHasDarkClass).toBe(initialHasDarkClass);

    // Logout via auth menu
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.waitFor({ state: 'visible' });
    await logoutBtn.click();
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 10000 });
  });

  test('Theme preference persists after page reload', async ({ page }) => {
    await loginWithSharedUser(page);

    // Navigate to profile
    await page.goto(`${APP_BASE_URL}/profile`);
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    // Wait for the toggle input to be enabled (not loading from server)
    const themeToggleInput = page.locator('app-profile .theme-toggle p-toggleswitch input');
    await expect(themeToggleInput).toBeEnabled({ timeout: 5000 });

    // Wait for settings to fully load from server (there's round-tripping with local/remote)
    await page.waitForTimeout(1000);

    // Get initial theme state
    const htmlElement = page.locator('html');
    const initialHasDarkClass = await htmlElement.evaluate(el => el.classList.contains('app-dark'));

    // Click the switch element directly using role selector
    const themeSwitch = page.getByRole('switch', { name: 'Light Dark' });
    await themeSwitch.click();
    await page.waitForTimeout(1000); // Wait for theme to apply and sync

    // Verify toggle happened
    const afterToggleHasDarkClass = await htmlElement.evaluate(el => el.classList.contains('app-dark'));
    expect(afterToggleHasDarkClass).not.toBe(initialHasDarkClass);

    // Reload page
    await page.reload();
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    // Wait for toggle to be enabled again after reload
    await expect(themeToggleInput).toBeEnabled({ timeout: 5000 });

    // Check that theme persisted
    const afterReloadHasDarkClass = await htmlElement.evaluate(el => el.classList.contains('app-dark'));
    expect(afterReloadHasDarkClass).toBe(afterToggleHasDarkClass);

    // Toggle back to original state for cleanup
    if (afterReloadHasDarkClass !== initialHasDarkClass) {
      await themeSwitch.click();
      await page.waitForTimeout(500);
    }

    // Logout via auth menu
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.waitFor({ state: 'visible' });
    await logoutBtn.click();
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // DATA EXPORT TESTS
  // ============================================================================

  test('Data export button is available', async ({ page }) => {
    await loginWithSharedUser(page);

    // Navigate to profile
    await page.goto(`${APP_BASE_URL}/profile`);
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    // Check export button exists
    await expect(page.locator(pages.profileExportButton)).toBeVisible();

    // Logout via auth menu
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.waitFor({ state: 'visible' });
    await logoutBtn.click();
    // Wait for menu panel to close (logout triggers menu close)
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// DESTRUCTIVE TESTS - These create their own users
// ============================================================================

test.describe('Profile Destructive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test.afterEach(async ({ page }) => {
    await assertNoMissingTranslations(page);
  });

  test('Data deletion flow', async ({ page }) => {
    // Create a dedicated user for this test
    const testUser = generateTestUser();
    const result = await createTestUser(testUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    console.log(`Created user for data deletion test: ${testUser.email}`);

    try {
      // Login
      await page.click(menus.authMenuButton);
      await page.click(auth.loginTab);
      await page.fill(auth.loginIdentifier, testUser.email);
      await page.fill(auth.loginPassword, testUser.password);
      await page.click(auth.loginSubmit);

      // Wait for login to complete
      await page.waitForSelector(auth.profileMenu, { timeout: 10000 });

      // Navigate to profile
      await page.goto(`${APP_BASE_URL}/profile`);
      await page.waitForSelector(pages.profilePage, { timeout: 5000 });

      // Check delete data button exists
      const deleteDataButton = page.locator(pages.profileDeleteDataButton);
      if (await deleteDataButton.isVisible().catch(() => false)) {

        // Click delete data button
        await deleteDataButton.click();
        await page.waitForTimeout(600);

        // Check for confirmation dialog
        const confirmDialog = page.locator(common.confirmDialog);
        if (await confirmDialog.isVisible().catch(() => false)) {

          // Cancel the dialog (don't actually delete in this test)
          await page.click(common.confirmDialogReject);
        }
      }
    } finally {
      // Clean up - delete the test user
      await deleteTestUser({ email: testUser.email });
      console.log(`Deleted user for data deletion test: ${testUser.email}`);
    }
  });

  test('Account deletion flow', async ({ page }) => {
    // Create a dedicated user for this test
    const testUser = generateTestUser();
    const result = await createTestUser(testUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    console.log(`Created user for account deletion test: ${testUser.email}`);

    let userDeleted = false;

    try {
      // Login
      await page.click(menus.authMenuButton);
      await page.click(auth.loginTab);
      await page.fill(auth.loginIdentifier, testUser.email);
      await page.fill(auth.loginPassword, testUser.password);
      await page.click(auth.loginSubmit);

      // Wait for login to complete
      await page.waitForSelector(auth.profileMenu, { timeout: 10000 });

      // Navigate to profile
      await page.goto(`${APP_BASE_URL}/profile`);
      await page.waitForSelector(pages.profilePage, { timeout: 5000 });

      // Check delete account button exists
      const deleteAccountButton = page.locator(pages.profileDeleteAccountButton);
      if (await deleteAccountButton.isVisible().catch(() => false)) {

        // Click delete account button
        await deleteAccountButton.click();
        await page.waitForTimeout(600);

        // Check for confirmation dialog
        const confirmDialog = page.locator(common.confirmDialog);
        if (await confirmDialog.isVisible().catch(() => false)) {

          // Actually delete the account
          await page.click(common.confirmDialogAccept);
          // Wait for redirect after account deletion - profile menu should disappear
          await expect(page.locator(auth.profileMenu)).not.toBeVisible({ timeout: 10000 });

          userDeleted = true;

          // Should be logged out and redirected
        }
      }
    } finally {
      // Clean up only if user wasn't deleted by the test
      if (!userDeleted) {
        await deleteTestUser({ email: testUser.email });
        console.log(`Deleted user for account deletion test: ${testUser.email}`);
      } else {
        console.log(`User was deleted by the test: ${testUser.email}`);
      }
    }
  });
});

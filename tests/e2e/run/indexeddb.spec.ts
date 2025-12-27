import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser, TestUser } from '../data/test-users';
import { createTestUser, deleteTestUser } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, auth, common } from '../helpers/selectors';

// Shared test user for IndexedDB tests
let sharedUser: TestUser;
let sharedUserId: string;

// Helper to navigate to IndexedDB page
async function navigateToIndexedDB(page: any): Promise<void> {
  await page.goto(`${APP_BASE_URL}/indexeddb`);
  await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });
  // Wait for hydration and initial effects to settle (IndexedDB loads data async)
  await page.waitForTimeout(500);
}

test.describe('IndexedDB Tests', () => {
  // Increase timeout for tests that involve login flows
  test.setTimeout(60000);

  test.beforeAll(async () => {
    // Create a shared user for tests
    sharedUser = generateTestUser();
    const result = await createTestUser(sharedUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    sharedUserId = result.userId!;
    console.log(`Created shared test user for IndexedDB: ${sharedUser.email}`);
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

  test('IndexedDB page loads correctly', async ({ page }) => {
    await navigateToIndexedDB(page);

    // Verify page is visible
    await expect(page.locator(pages.indexedDbPage)).toBeVisible();

  });

  // ============================================================================
  // DATA PERSISTENCE TESTS
  // ============================================================================

  test('Text auto-saves to IndexedDB', async ({ page }) => {
    await navigateToIndexedDB(page);

    const testText = `Test data ${Date.now()}`;

    // Find textarea and type
    await expect(page.locator(pages.indexedDbTextarea)).toBeVisible();

    await page.fill(pages.indexedDbTextarea, testText);

    // Wait for debounce save to complete
    await page.waitForTimeout(1200);


    // Verify text is still there
    const textareaValue = await page.locator(pages.indexedDbTextarea).inputValue();
    expect(textareaValue).toContain(testText);
  });

  test('Data persists on page refresh', async ({ page }) => {
    await navigateToIndexedDB(page);

    const testText = `Persist test ${Date.now()}`;

    // Type and save
    await page.fill(pages.indexedDbTextarea, testText);
    await page.waitForTimeout(1200); // Wait for debounce

    // Refresh page
    await page.reload();
    await waitForAngular(page);
    await page.waitForSelector(pages.indexedDbTextarea, { timeout: 5000 });

    // Wait for IndexedDB data to load (async operation after component init)
    await page.waitForTimeout(500);

    // Verify data persisted
    const textareaValue = await page.locator(pages.indexedDbTextarea).inputValue();
    expect(textareaValue).toContain(testText);

  });

  // ============================================================================
  // USER SCOPE TESTS
  // ============================================================================

  test('Data is scoped to user', async ({ page }) => {
    // First, save some data as anonymous user
    await navigateToIndexedDB(page);

    const anonText = `Anonymous data ${Date.now()}`;
    await page.fill(pages.indexedDbTextarea, anonText);
    await page.waitForTimeout(1200); // Wait for debounce save

    // Verify anonymous data was saved
    const savedAnonText = await page.locator(pages.indexedDbTextarea).inputValue();
    expect(savedAnonText).toBe(anonText);

    // Login
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);
    await page.click(auth.loginSubmit);

    // Wait for login to complete - either profile menu or storage dialog appears
    await Promise.race([
      page.waitForSelector(auth.profileMenu, { timeout: 15000 }),
      page.waitForSelector(common.storagePromotionDialog, { timeout: 15000 }),
    ]);

    // Handle storage promotion dialog if it appears
    const storageDialog = page.locator(common.storagePromotionDialog);
    if (await storageDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Skip importing the anonymous data for this test
      await page.click(common.storagePromotionSkip);
      await page.waitForTimeout(600);
    }

    // Now wait for profile menu to confirm login complete
    await page.waitForSelector(auth.profileMenu, { timeout: 10000 });

    // Close the menu after login
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Navigate back to IndexedDB page - should now be in user scope
    await navigateToIndexedDB(page);

    // User scope should be empty or different from anonymous data
    const userInitialText = await page.locator(pages.indexedDbTextarea).inputValue();
    // The user's data store should NOT contain the anonymous data (we skipped import)
    expect(userInitialText).not.toBe(anonText);

    // Save some user-specific data
    const userText = `User data ${Date.now()}`;
    await page.fill(pages.indexedDbTextarea, userText);
    await page.waitForTimeout(1200); // Wait for debounce save

    // Verify user data was saved while still logged in
    const savedUserText = await page.locator(pages.indexedDbTextarea).inputValue();
    expect(savedUserText).toBe(userText);

    // Logout
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(600);
    await page.click(auth.logoutButton);
    // Wait for profile menu to disappear (indicates logged out state)
    await expect(page.locator(auth.profileMenu)).not.toBeVisible({ timeout: 5000 });

    // Wait for logout to fully complete (session cookies to clear)
    await page.waitForTimeout(1000);

    // Navigate back to IndexedDB page - should now be back in anonymous scope
    await navigateToIndexedDB(page);

    // Verify we're still logged out after page navigation (no auto-login from cached session)
    await expect(page.locator(auth.profileMenu)).not.toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(1000); // Wait for data to load

    // After logout, should see the ANONYMOUS data, not the user data
    const afterLogoutText = await page.locator(pages.indexedDbTextarea).inputValue();
    // Should see the original anonymous data
    expect(afterLogoutText).toBe(anonText);

  });
});

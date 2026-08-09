import { test, expect, Page } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser, TestUser } from '../data/test-users';
import { createTestUser, deleteTestUser, waitForLoginComplete } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, auth, common } from '../helpers/selectors';

// Shared test user for IndexedDB tests
let sharedUser: TestUser;
let sharedUserId: string;

// IndexedDB layout (see client/src/app/constants/ui.constants.ts and
// client/src/app/services/user-storage.service.ts):
// - DB 'momentum', store 'persistent'
// - The IndexedDB demo textarea saves under base key 'key', scoped per user:
//   'anonymous_key' when logged out, 'user_{userId}_key' when logged in
const IDB_NAME = 'momentum';
const IDB_PERSISTENT_STORE = 'persistent';
const ANONYMOUS_TEXTAREA_KEY = 'anonymous_key';

/**
 * Reads a raw value from the app's IndexedDB 'persistent' store.
 * Returns null if the key (or the database/store) doesn't exist.
 * Used with expect.poll to wait for the debounced auto-save deterministically.
 */
async function readPersistentValue(page: Page, key: string): Promise<unknown> {
  return page.evaluate(({ dbName, storeName, storageKey }) => {
    return new Promise((resolve) => {
      const openReq = indexedDB.open(dbName);
      openReq.onsuccess = () => {
        const db = openReq.result;
        try {
          const getReq = db.transaction(storeName, 'readonly').objectStore(storeName).get(storageKey);
          getReq.onsuccess = () => { db.close(); resolve(getReq.result ?? null); };
          getReq.onerror = () => { db.close(); resolve(null); };
        } catch {
          db.close();
          resolve(null);
        }
      };
      openReq.onerror = () => resolve(null);
    });
  }, { dbName: IDB_NAME, storeName: IDB_PERSISTENT_STORE, storageKey: key });
}

// Helper to navigate to IndexedDB page
async function navigateToIndexedDB(page: any): Promise<void> {
  await page.goto(`${APP_BASE_URL}/indexeddb`);
  await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });
  // Wait for hydration and the component's async IndexedDB load to settle
  // (zone.js tracks IndexedDB requests, so Angular stability covers the load)
  await waitForAngular(page);
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

    // Wait for the debounced auto-save to land in IndexedDB (state-based, no sleep)
    await expect.poll(() => readPersistentValue(page, ANONYMOUS_TEXTAREA_KEY), { timeout: 10000 }).toBe(testText);

    // Verify text is still there
    const textareaValue = await page.locator(pages.indexedDbTextarea).inputValue();
    expect(textareaValue).toContain(testText);
  });

  test('Data persists on page refresh', async ({ page }) => {
    await navigateToIndexedDB(page);

    const testText = `Persist test ${Date.now()}`;

    // Type and wait for the debounced save to land in IndexedDB
    await page.fill(pages.indexedDbTextarea, testText);
    await expect.poll(() => readPersistentValue(page, ANONYMOUS_TEXTAREA_KEY), { timeout: 10000 }).toBe(testText);

    // Refresh page
    await page.reload();
    await waitForAngular(page);
    await page.waitForSelector(pages.indexedDbTextarea, { timeout: 5000 });

    // Verify data persisted - toHaveValue auto-retries while the component
    // loads data from IndexedDB (async operation after component init)
    await expect(page.locator(pages.indexedDbTextarea)).toHaveValue(testText, { timeout: 10000 });

  });

  // ============================================================================
  // USER SCOPE TESTS
  // ============================================================================

  test('Data is scoped to user', async ({ page }) => {
    // First, save some data as anonymous user
    await navigateToIndexedDB(page);

    const anonText = `Anonymous data ${Date.now()}`;
    await page.fill(pages.indexedDbTextarea, anonText);
    // Wait for the debounced save to land in IndexedDB
    await expect.poll(() => readPersistentValue(page, ANONYMOUS_TEXTAREA_KEY), { timeout: 10000 }).toBe(anonText);

    // Verify anonymous data was saved
    const savedAnonText = await page.locator(pages.indexedDbTextarea).inputValue();
    expect(savedAnonText).toBe(anonText);

    // Login
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);
    await page.click(auth.loginSubmit);

    // Anonymous data exists (verified above), so the storage promotion dialog
    // MUST appear before login completes (promotion runs before auth state updates)
    const storageDialog = page.locator(common.storagePromotionDialog);
    await expect(storageDialog).toBeVisible({ timeout: 15000 });

    // Skip importing the anonymous data for this test
    await page.click(common.storagePromotionSkip);
    await expect(storageDialog).not.toBeVisible({ timeout: 5000 });

    // Now wait for profile menu to confirm login complete
    await waitForLoginComplete(page);

    // Close the menu after login and wait for the panel to disappear
    await page.keyboard.press('Escape');
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });

    // Navigate back to IndexedDB page - should now be in user scope
    await navigateToIndexedDB(page);

    // User scope should be empty or different from anonymous data
    const userInitialText = await page.locator(pages.indexedDbTextarea).inputValue();
    // The user's data store should NOT contain the anonymous data (we skipped import)
    expect(userInitialText).not.toBe(anonText);

    // Save some user-specific data
    const userText = `User data ${Date.now()}`;
    await page.fill(pages.indexedDbTextarea, userText);
    // Wait for the debounced save to land in the user-scoped key
    await expect.poll(() => readPersistentValue(page, `user_${sharedUserId}_key`), { timeout: 10000 }).toBe(userText);

    // Verify user data was saved while still logged in
    const savedUserText = await page.locator(pages.indexedDbTextarea).inputValue();
    expect(savedUserText).toBe(userText);

    // Logout - open the auth menu and wait for the logout button to be clickable
    await page.click(menus.authMenuButton);
    await expect(page.locator(auth.logoutButton)).toBeVisible({ timeout: 5000 });
    await page.click(auth.logoutButton);
    // Wait for profile menu to disappear (indicates logged out state)
    await expect(page.locator(auth.profileMenu)).not.toBeVisible({ timeout: 5000 });

    // Logout is only durable once Supabase clears its persisted session token —
    // navigating before that boots the next page still authenticated, which shows
    // user-scoped data in what the test expects to be the anonymous view.
    await expect.poll(() => page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('sb-') && k.includes('auth-token')).length
    ), { timeout: 10000 }).toBe(0);
    await waitForAngular(page);

    // Navigate back to IndexedDB page - should now be back in anonymous scope
    await navigateToIndexedDB(page);

    // Verify the reloaded app booted anonymous: assert the header rendered first,
    // then that no profile link exists — a bare not-visible check passes vacuously
    // while the page is still booting.
    await expect(page.locator(menus.authMenuButton)).toBeVisible();
    await expect(page.locator('app-menu-auth a[href="/profile"]')).toHaveCount(0);

    // After logout, should see the ANONYMOUS data, not the user data.
    // toHaveValue auto-retries while the component loads data from IndexedDB.
    await expect(page.locator(pages.indexedDbTextarea)).toHaveValue(anonText, { timeout: 10000 });

  });
});

import { test, expect, Page } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser } from '../data/test-users';
import { createTestUser, deleteTestUser } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, auth, common } from '../helpers/selectors';

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
 * Used with expect.poll to wait for async IndexedDB writes deterministically.
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

/**
 * Seeds anonymous data via the IndexedDB demo textarea, then waits until the
 * debounced write has actually landed in IndexedDB. This guarantees
 * hasAnonymousData() is true when the login flow runs, so the storage
 * promotion dialog MUST appear.
 */
async function seedAnonymousData(page: Page, data: string): Promise<void> {
  await page.goto(`${APP_BASE_URL}/indexeddb`);
  await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });
  await expect(page.locator(pages.indexedDbTextarea)).toBeVisible();
  await page.fill(pages.indexedDbTextarea, data);
  // Wait for the debounced auto-save to land (state-based, no sleep)
  await expect.poll(() => readPersistentValue(page, ANONYMOUS_TEXTAREA_KEY), { timeout: 10000 }).toBe(data);
}

/**
 * Opens the auth menu and submits the login form.
 * Does NOT wait for login to complete - the storage promotion dialog
 * blocks completion until the user responds to it.
 */
async function submitLogin(page: Page, email: string, password: string): Promise<void> {
  await page.click(menus.authMenuButton);
  await page.click(auth.loginTab);
  await page.fill(auth.loginIdentifier, email);
  await page.fill(auth.loginPassword, password);
  await page.click(auth.loginSubmit);
}

test.describe('Storage Promotion Tests', () => {
  // Increase timeout for tests that involve login flows
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test.afterEach(async ({ page }) => {
    await assertNoMissingTranslations(page);
  });

  // ============================================================================
  // STORAGE PROMOTION DIALOG TESTS
  // ============================================================================

  test('Storage promotion dialog appears when logging in with anonymous data', async ({ page }) => {
    // Create a test user for this test
    const testUser = generateTestUser();
    const result = await createTestUser(testUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    console.log(`Created user for storage promotion test: ${testUser.email}`);

    try {
      // Seed anonymous data - guarantees the promotion dialog will appear on login
      await seedAnonymousData(page, 'Anonymous test data for promotion');

      // Now login - this MUST trigger the storage promotion dialog because
      // anonymous data exists (promotion runs before auth state updates)
      await submitLogin(page, testUser.email, testUser.password);

      const storageDialog = page.locator(common.storagePromotionDialog);
      await expect(storageDialog).toBeVisible({ timeout: 15000 });

      // Dismiss the dialog so login can complete, and verify it does
      await page.click(common.storagePromotionSkip);
      await expect(storageDialog).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator(auth.profileMenu)).toBeVisible({ timeout: 15000 });

    } finally {
      // Clean up
      await deleteTestUser({ email: testUser.email });
      console.log(`Deleted user for storage promotion test: ${testUser.email}`);
    }
  });

  test('Accept storage promotion imports data', async ({ page }) => {
    // Create a test user for this test
    const testUser = generateTestUser();
    const result = await createTestUser(testUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    console.log(`Created user for accept promotion test: ${testUser.email}`);

    try {
      // Seed anonymous data - guarantees the promotion dialog will appear on login
      const anonData = `Anon data to import ${Date.now()}`;
      await seedAnonymousData(page, anonData);

      // Login - promotion dialog must appear
      await submitLogin(page, testUser.email, testUser.password);

      const storageDialog = page.locator(common.storagePromotionDialog);
      await expect(storageDialog).toBeVisible({ timeout: 15000 });

      // Accept the import
      await page.click(common.storagePromotionImport);
      await expect(storageDialog).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator(auth.profileMenu)).toBeVisible({ timeout: 15000 });

      // Promotion copies anonymous data to user scope, then clears the anonymous key
      await expect.poll(() => readPersistentValue(page, ANONYMOUS_TEXTAREA_KEY), { timeout: 10000 }).toBeNull();

      // Verify the data was imported by checking the IndexedDB page (now user-scoped)
      await page.goto(`${APP_BASE_URL}/indexeddb`);
      await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });
      await waitForAngular(page);

      // toHaveValue auto-retries while the component loads data from IndexedDB
      await expect(page.locator(pages.indexedDbTextarea)).toHaveValue(anonData, { timeout: 10000 });

    } finally {
      // Clean up
      await deleteTestUser({ email: testUser.email });
      console.log(`Deleted user for accept promotion test: ${testUser.email}`);
    }
  });

  test('Decline storage promotion skips import', async ({ page }) => {
    // Create a test user for this test
    const testUser = generateTestUser();
    const result = await createTestUser(testUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    console.log(`Created user for decline promotion test: ${testUser.email}`);

    try {
      // Seed anonymous data - guarantees the promotion dialog will appear on login
      const anonData = `Anon data to skip ${Date.now()}`;
      await seedAnonymousData(page, anonData);

      // Login - promotion dialog must appear
      await submitLogin(page, testUser.email, testUser.password);

      const storageDialog = page.locator(common.storagePromotionDialog);
      await expect(storageDialog).toBeVisible({ timeout: 15000 });

      // Decline the import
      await page.click(common.storagePromotionSkip);
      await expect(storageDialog).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator(auth.profileMenu)).toBeVisible({ timeout: 15000 });

      // Skipping preserves the anonymous data (it may belong to someone else)...
      await expect.poll(() => readPersistentValue(page, ANONYMOUS_TEXTAREA_KEY), { timeout: 10000 }).toBe(anonData);

      // ...and imports nothing into the user's scope
      const userValue = await readPersistentValue(page, `user_${result.userId}_key`);
      expect(userValue).toBeNull();

      // Verify the IndexedDB page shows the (empty) user scope, not the anonymous data
      await page.goto(`${APP_BASE_URL}/indexeddb`);
      await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });
      await waitForAngular(page);
      await expect(page.locator(pages.indexedDbTextarea)).toHaveValue('', { timeout: 10000 });

    } finally {
      // Clean up
      await deleteTestUser({ email: testUser.email });
      console.log(`Deleted user for decline promotion test: ${testUser.email}`);
    }
  });
});

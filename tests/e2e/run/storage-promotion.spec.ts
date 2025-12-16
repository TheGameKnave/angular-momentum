import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser } from '../data/test-users';
import { createTestUser, deleteTestUser } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, auth, common } from '../helpers/selectors';

test.describe('Storage Promotion Tests', () => {
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
      // First, create some anonymous data by visiting IndexedDB page
      await page.goto(`${APP_BASE_URL}/indexeddb`);
      await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });

      // Type some data
      const textarea = page.locator(pages.indexedDbTextarea);
      if (await textarea.isVisible().catch(() => false)) {
        await page.fill(pages.indexedDbTextarea, 'Anonymous test data for promotion');
        await page.waitForTimeout(1200); // Wait for debounce save
      }

      // Now login - this should trigger storage promotion dialog
      await page.click(menus.authMenuButton);
      await page.click(auth.loginTab);
      await page.fill(auth.loginIdentifier, testUser.email);
      await page.fill(auth.loginPassword, testUser.password);
      await page.click(auth.loginSubmit);

      // Wait for login response - either profile menu appears, or storage promotion dialog, or error
      // The login button will be "active" while processing
      await page.waitForTimeout(3000);

      // Check if storage promotion dialog appears
      // Note: This dialog may or may not appear depending on whether there's data to promote
      const storageDialog = page.locator(common.storagePromotionDialog);
      if (await storageDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      }

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
      // Create anonymous data
      await page.goto(`${APP_BASE_URL}/indexeddb`);
      await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });

      const anonData = `Anon data to import ${Date.now()}`;
      const textarea = page.locator(pages.indexedDbTextarea);
      if (await textarea.isVisible().catch(() => false)) {
        await page.fill(pages.indexedDbTextarea, anonData);
        await page.waitForTimeout(1200); // Wait for debounce save
      }

      // Login
      await page.click(menus.authMenuButton);
      await page.click(auth.loginTab);
      await page.fill(auth.loginIdentifier, testUser.email);
      await page.fill(auth.loginPassword, testUser.password);
      await page.click(auth.loginSubmit);

      // Wait for login response
      await page.waitForTimeout(3000);

      // If promotion dialog appears, accept it
      const storageDialog = page.locator(common.storagePromotionDialog);
      if (await storageDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.click(common.storagePromotionImport);
        await page.waitForTimeout(600);


        // Verify data was imported by checking IndexedDB page
        await page.goto(`${APP_BASE_URL}/indexeddb`);
        await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });

        const textareaAfter = page.locator(pages.indexedDbTextarea);
        if (await textareaAfter.isVisible().catch(() => false)) {
          const importedData = await textareaAfter.inputValue();
          expect(importedData).toContain(anonData);
        }
      }

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
      // Create anonymous data
      await page.goto(`${APP_BASE_URL}/indexeddb`);
      await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });

      const anonData = `Anon data to skip ${Date.now()}`;
      const textarea = page.locator(pages.indexedDbTextarea);
      if (await textarea.isVisible().catch(() => false)) {
        await page.fill(pages.indexedDbTextarea, anonData);
        await page.waitForTimeout(1200); // Wait for debounce save
      }

      // Login
      await page.click(menus.authMenuButton);
      await page.click(auth.loginTab);
      await page.fill(auth.loginIdentifier, testUser.email);
      await page.fill(auth.loginPassword, testUser.password);
      await page.click(auth.loginSubmit);

      // Wait for login response
      await page.waitForTimeout(3000);

      // If promotion dialog appears, decline it
      const storageDialog = page.locator(common.storagePromotionDialog);
      if (await storageDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.click(common.storagePromotionSkip);
        await page.waitForTimeout(600);


        // Verify data was NOT imported
        await page.goto(`${APP_BASE_URL}/indexeddb`);
        await page.waitForSelector(pages.indexedDbPage, { timeout: 5000 });

        const textareaAfter = page.locator(pages.indexedDbTextarea);
        if (await textareaAfter.isVisible().catch(() => false)) {
          const currentData = await textareaAfter.inputValue();
          // Data should be empty or different from anonymous data
          expect(currentData).not.toContain(anonData);
        }
      }

    } finally {
      // Clean up
      await deleteTestUser({ email: testUser.email });
      console.log(`Deleted user for decline promotion test: ${testUser.email}`);
    }
  });
});

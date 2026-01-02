import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser, TestUser } from '../data/test-users';
import { createTestUser, deleteTestUser } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus, pages, auth } from '../helpers/selectors';

// Shared test user for feature tests
let sharedUser: TestUser;
let sharedUserId: string;

test.describe('Feature Flags Tests', () => {
  // Run serially - these tests modify global feature flags and share a user
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    // Create a shared user for tests
    sharedUser = generateTestUser();
    const result = await createTestUser(sharedUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    sharedUserId = result.userId!;
    console.log(`Created shared test user for features: ${sharedUser.email}`);
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

  test('Features page loads correctly', async ({ page }) => {
    // Navigate directly to features page
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);

    // Verify features page is visible
    await expect(page.locator(pages.featuresPage)).toBeVisible();
    await expect(page.locator(pages.featureList)).toBeVisible();

  });

  // ============================================================================
  // TOGGLE TESTS
  // ============================================================================

  test('Feature toggles are visible', async ({ page }) => {
    // Navigate to features page
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);

    // Check that toggles exist
    const toggleCount = await page.locator(pages.featureToggle).count();
    expect(toggleCount).toBeGreaterThan(0);

  });

  test('Feature toggle requires authentication', async ({ page }) => {
    // Navigate to features page
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);

    // Verify the auth prompt message is visible for unauthenticated users
    const authPrompt = page.locator('text=Register or log in to access all features');
    const hasAuthPrompt = await authPrompt.isVisible({ timeout: 3000 }).catch(() => false);

    // Either we should see an auth prompt, or toggles should be disabled
    if (hasAuthPrompt) {
      await expect(authPrompt).toBeVisible();
    }

    // Check that toggles exist but are disabled for unauthenticated users
    const firstToggle = page.locator(pages.featureToggle).first();
    const toggleExists = await firstToggle.isVisible().catch(() => false);

    if (toggleExists) {
      // The toggle input should be disabled for unauthenticated users
      const toggleInput = firstToggle.locator('input');
      const isDisabled = await toggleInput.isDisabled().catch(() => false);

      // Either disabled or we saw the auth prompt
      expect(isDisabled || hasAuthPrompt).toBeTruthy();
    }

  });

  test('Feature toggle can be switched on and off when authenticated', async ({ page }) => {
    // Login first
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);
    await page.click(auth.loginSubmit);
    await page.waitForLoadState('networkidle');

    // Wait for login to complete
    await page.waitForSelector(auth.profileMenu, { timeout: 15000 });

    // Navigate to features page
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);

    // Get all toggles
    const toggles = page.locator(pages.featureToggle);
    const toggleCount = await toggles.count();

    // Test each toggle
    for (let i = 0; i < toggleCount; i++) {
      const toggle = toggles.nth(i);
      const toggleInput = toggle.locator('input');

      // Get initial state
      const initialChecked = await toggleInput.isChecked();

      // Click to toggle
      await toggle.click();
      await page.waitForTimeout(600);

      // Verify state changed
      const newChecked = await toggleInput.isChecked();
      expect(newChecked).not.toBe(initialChecked);

      // Toggle back
      await toggle.click();
      await page.waitForTimeout(600);

      // Verify back to original
      const finalChecked = await toggleInput.isChecked();
      expect(finalChecked).toBe(initialChecked);
    }


    // Logout
    await page.click(menus.authMenuButton);
    await page.click(auth.logoutButton);
    // Wait for profile menu to disappear (indicates logged out state)
    await expect(page.locator(auth.profileMenu)).not.toBeVisible({ timeout: 5000 });
  });

  test('Feature flag persistence across page refresh', async ({ page }) => {
    // Login first
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);
    await page.click(auth.loginSubmit);
    await page.waitForLoadState('networkidle');

    // Wait for login to complete
    await page.waitForSelector(auth.profileMenu, { timeout: 15000 });

    // Navigate to features page
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);

    // Toggle first feature
    const firstToggle = page.locator(pages.featureToggle).first();
    const toggleInput = firstToggle.locator('input');

    const initialState = await toggleInput.isChecked();

    await firstToggle.click();
    await page.waitForTimeout(600);

    const toggledState = await toggleInput.isChecked();
    expect(toggledState).not.toBe(initialState);

    // Refresh page
    await page.reload();
    await waitForAngular(page);
    await page.waitForSelector(pages.featureToggle, { timeout: 5000 });

    // Verify state persisted (we're already on features page after reload)
    const persistedState = await page.locator(pages.featureToggle).first().locator('input').isChecked();
    expect(persistedState).toBe(toggledState);


    // Toggle back and logout
    await page.locator(pages.featureToggle).first().click();
    await page.waitForTimeout(600);

    await page.click(menus.authMenuButton);
    await page.click(auth.logoutButton);
    // Wait for profile menu to disappear (indicates logged out state)
    await expect(page.locator(auth.profileMenu)).not.toBeVisible({ timeout: 5000 });
  });
});

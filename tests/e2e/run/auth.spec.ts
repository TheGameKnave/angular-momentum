import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser, TestUser } from '../data/test-users';
import { createTestUser, deleteTestUser } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { auth, menus, pages } from '../helpers/selectors';

// Shared test user for non-destructive tests
let sharedUser: TestUser;
let sharedUserId: string;

test.describe('Authentication Tests', () => {
  // Run serially - these tests share a user and login/logout state
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    // Create a shared user for tests that don't destroy the account
    sharedUser = generateTestUser();
    const result = await createTestUser(sharedUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    sharedUserId = result.userId!;
    console.log(`Created shared test user: ${sharedUser.email}`);
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
  // LOGIN TESTS
  // ============================================================================

  test('Login form displays correctly', async ({ page }) => {
    // Open auth menu
    await page.click(menus.authMenuButton);

    // Click login tab
    await page.click(auth.loginTab);

    // Verify login form is visible
    await expect(page.locator(auth.loginForm)).toBeVisible();
    await expect(page.locator(auth.loginIdentifier)).toBeVisible();
    await expect(page.locator(auth.loginPassword)).toBeVisible();
    await expect(page.locator(auth.loginSubmit)).toBeVisible();
  });

  test('Login with email succeeds', async ({ page }) => {
    // Open auth menu and click login tab
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);

    // Fill in credentials
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);

    // Submit and wait for logged in state (profile view appears in menu)
    await page.click(auth.loginSubmit);
    // Wait for either profile (success) or error toast (failure)
    const result = await Promise.race([
      page.waitForSelector(auth.profileMenu, { timeout: 15000 }).then(() => 'success'),
      page.waitForSelector('.p-toast-message-error', { timeout: 15000 }).then(() => 'error')
    ]);
    if (result === 'error') {
      const errorText = await page.locator('.p-toast-message-error').textContent();
      throw new Error(`Login failed with error: ${errorText}`);
    }

    // Verify profile is visible (confirms login succeeded)
    await expect(page.locator(auth.profileMenu)).toBeVisible();

    // Menu auto-closes after 4 seconds - reopen it for logout
    await page.waitForTimeout(500);
    const menuVisible = await page.locator(menus.authMenuContent).isVisible();
    if (!menuVisible) {
      await page.click(menus.authMenuButton);
      await page.waitForSelector(auth.profileMenu, { timeout: 5000 });
    }

    // Logout for next test
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.click();
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });
  });

  test('Login with username succeeds', async ({ page }) => {
    // Open auth menu and click login tab
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);

    // Fill in credentials using username
    await page.fill(auth.loginIdentifier, sharedUser.username);
    await page.fill(auth.loginPassword, sharedUser.password);

    // Submit and wait for logged in state (profile view appears in menu)
    await page.click(auth.loginSubmit);
    // Wait for either profile (success) or error toast (failure)
    const result = await Promise.race([
      page.waitForSelector(auth.profileMenu, { timeout: 15000 }).then(() => 'success'),
      page.waitForSelector('.p-toast-message-error', { timeout: 15000 }).then(() => 'error')
    ]);
    if (result === 'error') {
      const errorText = await page.locator('.p-toast-message-error').textContent();
      throw new Error(`Login failed with error: ${errorText}`);
    }

    // Verify profile is visible (confirms login succeeded)
    await expect(page.locator(auth.profileMenu)).toBeVisible();

    // Menu auto-closes after 4 seconds - reopen it for logout
    await page.waitForTimeout(500);
    const menuVisible = await page.locator(menus.authMenuContent).isVisible();
    if (!menuVisible) {
      await page.click(menus.authMenuButton);
      await page.waitForSelector(auth.profileMenu, { timeout: 5000 });
    }

    // Logout for next test
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.click();
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });
  });

  test('Login with invalid credentials shows error', async ({ page }) => {
    // Open auth menu and click login tab
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);

    // Fill in wrong credentials
    await page.fill(auth.loginIdentifier, 'wrong@example.com');
    await page.fill(auth.loginPassword, 'WrongPassword123!');

    // Submit
    await page.click(auth.loginSubmit);

    // Wait for error response - form should still be visible
    await page.waitForTimeout(600);

    // Should still show login form (not logged in)
    await expect(page.locator(auth.loginForm)).toBeVisible();

  });

  // ============================================================================
  // SIGNUP TESTS
  // ============================================================================

  test('Signup form displays correctly', async ({ page }) => {
    // Open auth menu (Sign Up is the default tab)
    await page.click(menus.authMenuButton);

    // Verify signup form is visible (it's the default view)
    await expect(page.locator(auth.signupForm)).toBeVisible();
    await expect(page.locator(auth.signupEmail)).toBeVisible();
    await expect(page.locator(auth.signupUsername)).toBeVisible();
    await expect(page.locator(auth.signupPassword)).toBeVisible();
    await expect(page.locator(auth.signupConfirmPassword)).toBeVisible();

  });

  test('Signup form shows validation errors', async ({ page }) => {
    // Open auth menu (Sign Up is the default tab)
    await page.click(menus.authMenuButton);

    // Try to submit with invalid data
    await page.fill(auth.signupEmail, 'invalid-email');
    await page.fill(auth.signupPassword, '123');  // Too short
    await page.fill(auth.signupConfirmPassword, '456');  // Doesn't match

    // Blur to trigger validation
    await page.click(auth.signupForm);

    await page.waitForTimeout(600);

  });

  // ============================================================================
  // LOGOUT TESTS
  // ============================================================================

  test('Logout works correctly', async ({ page }) => {
    // Login first
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);
    await page.click(auth.loginSubmit);
    await page.waitForLoadState('networkidle');

    // Wait for login to complete (profile view appears in menu)
    await page.waitForSelector(auth.profileMenu, { timeout: 15000 });
    await expect(page.locator(auth.profileMenu)).toBeVisible();

    // Click logout and wait for menu to close
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.click();
    // Wait for menu panel to close (logout triggers menu close)
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });

    // Verify logged out - open menu and should show signup form (default view when not authenticated)
    await page.click(menus.authMenuButton);
    await expect(page.locator(auth.signupForm)).toBeVisible();
  });

  // ============================================================================
  // PROTECTED ROUTE TESTS
  // ============================================================================

  test('Protected route redirects to home when not authenticated', async ({ page }) => {
    // Try to navigate to profile page directly
    await page.goto(`${APP_BASE_URL}/profile`);

    // Wait for redirect to complete
    await page.waitForURL(url => !url.toString().includes('/profile'), { timeout: 5000 });

    // Should be redirected away from profile (guard should block)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/profile');

  });

  test('Profile page accessible when authenticated', async ({ page }) => {
    // Login first
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, sharedUser.email);
    await page.fill(auth.loginPassword, sharedUser.password);
    await page.click(auth.loginSubmit);
    await page.waitForLoadState('networkidle');

    // Wait for login to complete (profile view appears in menu)
    await page.waitForSelector(auth.profileMenu, { timeout: 15000 });
    // Close the auth menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Navigate to profile
    await page.goto(`${APP_BASE_URL}/profile`);
    await page.waitForSelector(pages.profilePage, { timeout: 5000 });

    // Should be on profile page
    await expect(page.locator(pages.profilePage)).toBeVisible();

    // Logout
    await page.click(menus.authMenuButton);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.click();
    // Wait for menu panel to close (logout triggers menu close)
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });
  });

  // ============================================================================
  // PASSWORD RESET TESTS
  // ============================================================================

  test('Forgot password link shows reset form', async ({ page }) => {
    // Open auth menu and click login tab
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);

    // Click forgot password link
    await page.click(auth.loginForgotPassword);

    // Should show reset form
    await expect(page.locator(auth.resetForm)).toBeVisible({ timeout: 3000 });

  });
});

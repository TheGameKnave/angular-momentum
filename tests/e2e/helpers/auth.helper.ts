import { Page, expect } from '@playwright/test';
import { API_BASE_URL } from '../data/constants';
import { auth, common, menus } from './selectors';

interface TestUser {
  email: string;
  password: string;
  username?: string;
}

interface CreateUserResponse {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

/**
 * Creates a test user via the bypass endpoint.
 * Only works in test/development environments.
 * Includes retry logic for transient network failures.
 */
export async function createTestUser(user: TestUser, retries = 3): Promise<CreateUserResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/test/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      return response.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }

  return { success: false, error: lastError?.message || 'Network request failed after retries' };
}

/**
 * Deletes a test user via the bypass endpoint.
 * Only works in test/development environments.
 * Includes retry logic for transient network failures.
 */
export async function deleteTestUser(emailOrUserId: { email?: string; userId?: string }, retries = 3): Promise<{ success: boolean; error?: string }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/test/delete-user`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailOrUserId)
      });
      return response.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }

  return { success: false, error: lastError?.message || 'Network request failed after retries' };
}

/**
 * Cleans up all e2e test users (emails ending with @angular-momentum.test).
 * Used in global teardown to remove leftover test accounts.
 * Only works in test/development environments.
 */
export async function cleanupE2ETestUsers(): Promise<{ success: boolean; deleted: number; found: number; errors?: string[] }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/test/cleanup-e2e-users`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
}

/**
 * Logs in a user via the UI.
 * Opens the auth menu and fills in credentials.
 * Waits for either profile menu (success) or error toast (failure).
 */
/**
 * Waits for a just-submitted login to complete.
 *
 * Three things can follow a login submit:
 * - the profile view appears in the menu (success),
 * - the Import Local Data dialog appears — including for tests that seeded
 *   nothing: a broadcast from a PARALLEL WORKER's test is delivered to every
 *   connected client (io.emit is global), and the anonymous page stores it,
 *   which makes hasAnonymousData() true at login. Skip it and continue,
 * - an error toast appears (failure) — throw with its text.
 */
export async function waitForLoginComplete(page: Page, timeout = 15000): Promise<void> {
  const profileMenu = page.locator(auth.profileMenu);
  const importDialog = page.locator(common.storagePromotionDialog);
  const errorToast = page.locator('.p-toast-message-error');

  await expect(profileMenu.or(importDialog).or(errorToast).first()).toBeVisible({ timeout });

  if (await errorToast.isVisible()) {
    throw new Error(`Login failed with error: ${await errorToast.textContent()}`);
  }
  if (await importDialog.isVisible()) {
    await page.click(common.storagePromotionSkip);
    await expect(profileMenu).toBeVisible({ timeout });
  }
}

export async function loginAsTestUser(page: Page, email: string, password: string): Promise<void> {
  // Click auth menu to open
  await page.click(menus.authMenuButton);
  await expect(page.locator(menus.authMenuContent)).toBeVisible({ timeout: 5000 });

  // The profile icon opens the anonymous profile view on a fresh open
  // (protected-route redirects auto-open the login form instead) — go
  // through its Log in action if the form isn't already showing.
  if (!(await page.locator(auth.loginForm).isVisible())) {
    await page.locator(auth.loginTab).click();
  }
  await expect(page.locator(auth.loginForm)).toBeVisible({ timeout: 5000 });

  // Fill in credentials
  await page.fill(auth.loginIdentifier, email);
  await page.fill(auth.loginPassword, password);
  await page.click(auth.loginSubmit);

  // Wait for network to settle (auth API call)
  await page.waitForLoadState('networkidle');

  await waitForLoginComplete(page);
}

/**
 * Logs out the current user via the UI.
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click auth menu to open
  await page.click(menus.authMenuButton);

  // Caller's contract is that a user is logged in - the logout button must be there
  const logoutButton = page.locator(auth.logoutButton);
  await expect(logoutButton).toBeVisible({ timeout: 5000 });
  await logoutButton.click();

  // Logout closes the auth menu - wait for the panel to disappear
  await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });

  // Confirm the logged-out state: the profile link is gone from the auth menu
  await expect(page.locator('app-menu-auth a[href="/profile"]')).not.toBeVisible({ timeout: 5000 });
}

/**
 * Checks if a user is currently logged in by checking auth menu state.
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const profileLink = page.locator('app-menu-auth a[href="/profile"]');
  return await profileLink.isVisible();
}

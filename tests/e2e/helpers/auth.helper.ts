import { Page, expect } from '@playwright/test';
import { API_BASE_URL } from '../data/constants';
import { auth, menus } from './selectors';

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
export async function loginAsTestUser(page: Page, email: string, password: string): Promise<void> {
  // Click auth menu to open
  await page.click(menus.authMenuButton);

  // Wait for login form to appear
  await expect(page.locator(auth.loginForm)).toBeVisible({ timeout: 5000 });

  // Click login tab if needed
  const loginTab = page.locator(auth.loginTab);
  if (await loginTab.isVisible()) {
    await loginTab.click();
  }

  // Fill in credentials
  await page.fill(auth.loginIdentifier, email);
  await page.fill(auth.loginPassword, password);
  await page.click(auth.loginSubmit);

  // Wait for network to settle (auth API call)
  await page.waitForLoadState('networkidle');

  // Wait for login to complete - profile menu appears on success
  await page.waitForSelector(auth.profileMenu, { timeout: 15000 });
}

/**
 * Logs out the current user via the UI.
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click auth menu to open
  await page.click(menus.authMenuButton);

  // Click logout button
  const logoutButton = page.locator(auth.logoutButton);
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }

  await page.waitForTimeout(1000);
}

/**
 * Checks if a user is currently logged in by checking auth menu state.
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const profileLink = page.locator('app-menu-auth a[href="/profile"]');
  return await profileLink.isVisible();
}

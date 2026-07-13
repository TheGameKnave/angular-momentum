import { test, expect } from '@playwright/test';
import { APP_BASE_URL, API_BASE_URL } from '../data/constants';
import { generateTestUser } from '../data/test-users';
import { createTestUser, deleteTestUser, loginAsTestUser } from '../helpers/auth.helper';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus } from '../helpers/selectors';

interface ExpireSocketAuthResponse {
  success: boolean;
  matched: number;
  expired: number;
  error?: string;
}

/**
 * Calls the loopback-guarded test endpoint that force-fires the server's
 * websocket auth-expiry eviction for a user's sockets, exactly as if their
 * token's exp had passed. With dryRun=true it only counts sockets currently
 * authenticated as the user (a non-destructive room-membership probe).
 */
async function expireSocketAuth(userId: string, dryRun = false): Promise<ExpireSocketAuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/test/expire-socket-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, dryRun }),
  });
  return response.json();
}

/** Logs in via the REST API to obtain an access token for direct API calls. */
async function getAccessToken(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const body = await response.json();
  if (!body.success || !body.session?.access_token) {
    throw new Error(`API login failed: ${body.error || response.status}`);
  }
  return body.session.access_token;
}

test.describe('WebSocket Auth Expiry Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test.afterEach(async ({ page }) => {
    await assertNoMissingTranslations(page);
  });

  test('client re-authenticates its socket after the server evicts it on auth expiry', async ({ page }) => {
    // Four network round-trip phases (login, evict, recover, sync) need headroom
    test.setTimeout(60000);

    // Create a dedicated user for this test
    const testUser = generateTestUser();
    const result = await createTestUser(testUser);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    const userId = result.userId!;
    console.log(`Created user for websocket auth expiry test: ${testUser.email}`);

    try {
      await loginAsTestUser(page, testUser.email, testUser.password);
      // Close the auth menu so the page sits in a neutral state
      await page.keyboard.press('Escape');
      await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });

      // ========================================================================
      // STEP 1: The page's socket authenticates and joins its user room
      // (dry-run probe counts room members without evicting anyone)
      // ========================================================================
      await expect
        .poll(async () => (await expireSocketAuth(userId, true)).matched, {
          message: 'websocket never authenticated / joined the user room after login',
          timeout: 15000,
        })
        .toBeGreaterThan(0);

      // ========================================================================
      // STEP 2: Force the real server-side expiry eviction — the server makes
      // the socket leave user:{id} and emits 'auth-expired' to it
      // ========================================================================
      const eviction = await expireSocketAuth(userId);
      expect(eviction.success).toBe(true);
      expect(eviction.expired).toBeGreaterThan(0);

      // ========================================================================
      // STEP 3: The client must recover on its own: 'auth-expired' →
      // AuthService.getToken() (refreshing the session if needed) → re-emit
      // 'authenticate' → server verifies the token and re-joins the room
      // ========================================================================
      await expect
        .poll(async () => (await expireSocketAuth(userId, true)).matched, {
          message: 'client did not re-authenticate its socket after auth-expired',
          timeout: 15000,
        })
        .toBeGreaterThan(0);

      // ========================================================================
      // STEP 4: Live settings sync still works end to end after recovery.
      // PATCH the theme via REST; the server broadcasts 'user-settings-updated'
      // to the user room, and the page — whose only path to that room is the
      // re-authenticated socket — applies the new theme.
      // ========================================================================
      const htmlElement = page.locator('html');
      await expect(htmlElement).toHaveClass(/app-dark/); // default theme is dark

      const accessToken = await getAccessToken(testUser.email, testUser.password);
      const patchResponse = await fetch(`${API_BASE_URL}/api/user-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ theme_preference: 'light' }),
      });
      expect(patchResponse.ok).toBe(true);

      // The broadcast reaches the page over the websocket: theme flips to light
      await expect(htmlElement).not.toHaveClass(/app-dark/, { timeout: 10000 });
    } finally {
      // Clean up - delete the test user
      await deleteTestUser({ email: testUser.email });
      console.log(`Deleted user for websocket auth expiry test: ${testUser.email}`);
    }
  });
});

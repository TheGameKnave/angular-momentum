import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser, TestUser } from '../data/test-users';
import { createTestUser, deleteTestUser, waitForLoginComplete } from '../helpers/auth.helper';
import { waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { auth, common, menus, pages } from '../helpers/selectors';

/**
 * Preference promotion and reversion around sign-in/sign-out.
 *
 * Preferences (theme, timezone, language) always carry over to a signing-in
 * user — independent of the anonymous-data import prompt, which governs
 * content, not UI preferences. On logout they revert to the anonymous
 * scope's values (or defaults).
 */
test.describe('Settings Promotion', () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    user = generateTestUser();
    const r = await createTestUser(user);
    if (!r.success) throw new Error(`Failed to create test user: ${r.error}`);

    await page.goto(`${APP_BASE_URL}/profile`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test.afterEach(async () => {
    if (user) await deleteTestUser({ email: user.email });
  });

  /** Set anon prefs (light theme + Tokyo), then log in and answer the import dialog. */
  async function setAnonPrefsAndLogin(page: import('@playwright/test').Page, importChoice: 'import' | 'skip'): Promise<void> {
    const html = page.locator('html');

    // As anon: switch theme to light (default is dark)
    if (await html.evaluate(el => el.classList.contains('app-dark'))) {
      await page.click(pages.profileThemeToggle);
    }
    await expect.poll(() => html.evaluate(el => el.classList.contains('app-dark'))).toBe(false);

    // As anon: pick Tokyo timezone
    await page.click(pages.profileTimezone);
    await page.click('.p-select-overlay li:has-text("Tokyo")');
    await expect(page.locator(`${pages.profileTimezone} .p-select-label`)).toContainText('Tokyo');

    // Login to the brand-new account
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, user.email);
    await page.fill(auth.loginPassword, user.password);
    await page.click(auth.loginSubmit);

    // Import dialog appears (anonymous prefs exist) — answer it
    await expect(page.locator(common.storagePromotionDialog)).toBeVisible({ timeout: 15000 });
    await page.click(importChoice === 'import' ? common.storagePromotionImport : common.storagePromotionSkip);

    await page.waitForSelector(auth.profileMenu, { timeout: 15000 });
    await page.keyboard.press('Escape');
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });
  }

  /** Assert the light theme + Tokyo timezone survived, including across a reload. */
  async function expectPrefsPreserved(page: import('@playwright/test').Page): Promise<void> {
    const html = page.locator('html');

    await expect.poll(() => html.evaluate(el => el.classList.contains('app-dark')), { timeout: 10000 }).toBe(false);

    await page.goto(`${APP_BASE_URL}/profile`);
    await waitForAngular(page);
    await expect(page.locator(`${pages.profileTimezone} .p-select-label`)).toContainText('Tokyo', { timeout: 10000 });

    // After a reload, initialize() runs against the server — values must hold
    await page.reload();
    await waitForAngular(page);
    await expect.poll(() => html.evaluate(el => el.classList.contains('app-dark')), { timeout: 10000 }).toBe(false);
    await expect(page.locator(`${pages.profileTimezone} .p-select-label`)).toContainText('Tokyo', { timeout: 10000 });
  }

  test('Anonymous prefs survive first login when importing data', async ({ page }) => {
    await setAnonPrefsAndLogin(page, 'import');
    await expectPrefsPreserved(page);
  });

  test('Anonymous prefs survive first login when skipping the import', async ({ page }) => {
    await setAnonPrefsAndLogin(page, 'skip');
    await expectPrefsPreserved(page);
  });

  test('Prefs revert to anonymous defaults shortly after logout', async ({ page }) => {
    const html = page.locator('html');

    // Log in WITHOUT setting any anonymous prefs first
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, user.email);
    await page.fill(auth.loginPassword, user.password);
    await page.click(auth.loginSubmit);
    await waitForLoginComplete(page);
    await page.keyboard.press('Escape');
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });

    // As the logged-in user, switch theme to light
    await expect(page.locator(pages.profileThemeToggleInput)).toBeEnabled({ timeout: 5000 });
    if (await html.evaluate(el => el.classList.contains('app-dark'))) {
      await page.click(pages.profileThemeToggle);
    }
    await expect.poll(() => html.evaluate(el => el.classList.contains('app-dark'))).toBe(false);

    // Log out — the revert lands once the sign-out round-trip completes
    await page.click(menus.authMenuButton);
    await page.click(auth.logoutButton);
    await expect(page.locator(menus.authMenuContent)).not.toBeVisible({ timeout: 5000 });

    // No anonymous theme was ever stored, so the default (dark) returns
    await expect.poll(() => html.evaluate(el => el.classList.contains('app-dark')), { timeout: 10000 }).toBe(true);

    // And it holds after a reload
    await page.reload();
    await waitForAngular(page);
    await expect.poll(() => html.evaluate(el => el.classList.contains('app-dark')), { timeout: 10000 }).toBe(true);
  });
});

import { Page, expect } from '@playwright/test';
import { common } from './selectors';

/**
 * Dismisses the cookie consent banner if it's visible.
 * This should be called early in tests to prevent the banner from blocking interactions.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const banner = page.locator(common.cookieBanner);
  if (await banner.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator(common.cookieAccept).click();
    await banner.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

/**
 * Asserts that no missing translation keys are visible on the page.
 * Missing translations appear as "tx⁈" in the UI.
 *
 * This should be called in afterEach for every test.
 */
export async function assertNoMissingTranslations(page: Page): Promise<void> {
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('tx⁈');
}

/**
 * Asserts that a specific element does not contain missing translation keys.
 */
export async function assertElementHasNoMissingTranslations(page: Page, selector: string): Promise<void> {
  const elementText = await page.locator(selector).innerText();
  expect(elementText).not.toContain('tx⁈');
}

/**
 * Asserts that the page has fully loaded.
 */
export async function assertPageLoaded(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * Waits for Angular to be stable (no pending HTTP requests or zone tasks).
 */
export async function waitForAngular(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const ng = (window as any).getAllAngularTestabilities;
    if (!ng) return true; // Not an Angular app or not in dev mode
    const testabilities = ng();
    return testabilities.every((t: any) => t.isStable());
  }, { timeout: 30000 }).catch(() => {
    // Fallback: just wait for network idle
  });
  await page.waitForLoadState('networkidle');
}

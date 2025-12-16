import { test, expect, Page } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { generateTestUser } from '../data/test-users';
import { createTestUser, deleteTestUser } from '../helpers/auth.helper';
import { waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { auth, menus, pages } from '../helpers/selectors';

/**
 * Visual Regression Tests
 *
 * Screenshots are compared against baseline images.
 *
 * WORKFLOW:
 * - Run tests:           npm run test:e2e
 * - Update baselines:    npm run test:e2e:accept
 * - View report:         npx playwright show-report tests/e2e/playwright-report
 *
 * NAMING CONVENTION:
 * Screenshots use reverse naming for alphabetical grouping:
 * - page-landing.png, page-features.png (pages grouped together)
 * - menu-auth-signup.png, menu-auth-login.png (auth menus grouped)
 * - layout-mobile.png, layout-tablet.png (layouts grouped)
 */

// Shared test user for authenticated screenshots
let testUser: { email: string; password: string; username: string };
let testUserId: string;

/**
 * Helper to make translucent backgrounds opaque before screenshot.
 * Prevents content pollution from elements behind translucent panels.
 */
async function makeBackgroundOpaque(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    if (el) {
      el.style.backgroundColor = 'var(--surface-ground, #1a1a2e)';
      el.style.backdropFilter = 'none';
    }
  }, selector);
}

test.describe('Visual Regression Tests', () => {
  test.beforeAll(async () => {
    // Create a shared user for authenticated screenshots
    const user = generateTestUser();
    const result = await createTestUser(user);
    if (!result.success) {
      throw new Error(`Failed to create test user: ${result.error}`);
    }
    testUser = user;
    testUserId = result.userId!;
  });

  test.afterAll(async () => {
    if (testUser) {
      await deleteTestUser({ email: testUser.email });
    }
  });

  // ============================================================================
  // PAGE COMPONENT SNAPSHOTS
  // Screenshots capture just the page component (not sidebar menu) to avoid
  // false failures from menu changes. Height capped at 600px.
  // ============================================================================

  const MAX_PAGE_HEIGHT = 600;

  async function screenshotPageComponent(
    page: Page,
    selector: string,
    name: string,
    options: { mask?: ReturnType<Page['locator']>[] } = {}
  ) {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible' });
    const box = await element.boundingBox();
    if (!box) throw new Error(`Could not get bounding box for ${selector}`);

    // Get actual rendered content height (not flex-stretched container height)
    const contentHeight = await element.evaluate((el) => {
      // Sum up children heights to get actual content size
      let height = 0;
      for (const child of el.children) {
        height += child.getBoundingClientRect().height;
      }
      // Fall back to offsetHeight if no children or very small
      return Math.max(height, el.offsetHeight, 100);
    });

    const height = Math.min(contentHeight, MAX_PAGE_HEIGHT);

    await expect(page).toHaveScreenshot(name, {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
      clip: {
        x: box.x,
        y: box.y,
        width: box.width,
        height,
      },
      ...options,
    });
  }

  test('page-landing', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.landingPage, 'page-landing.png');
  });

  test('page-features', async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.featuresPage, 'page-features.png');
  });

  test('page-graphql', async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/graphql-api`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.graphqlPage, 'page-graphql.png');
  });

  test('page-indexeddb', async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/indexeddb`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.indexedDbPage, 'page-indexeddb.png');
  });

  test('page-notifications', async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/notifications`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.notificationsPage, 'page-notifications.png');
  });

  test('page-privacy', async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/privacy`, { waitUntil: 'networkidle' });
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await page.locator(pages.privacyPage).waitFor({ state: 'visible', timeout: 30000 });
    await screenshotPageComponent(page, pages.privacyPage, 'page-privacy.png');
  });

  test('page-profile', async ({ page }) => {
    // Login first
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, testUser.email);
    await page.fill(auth.loginPassword, testUser.password);
    await page.click(auth.loginSubmit);
    await page.waitForSelector(auth.profileMenu, { timeout: 10000 });

    // Navigate to profile page
    await page.goto(`${APP_BASE_URL}/profile`);
    await waitForAngular(page);

    // Replace dynamic content with stable placeholders for screenshot
    await page.evaluate(() => {
      // Header: username's Profile -> User's Profile, email
      const header = document.querySelector('.p-card-header');
      if (header) {
        const h2 = header.querySelector('h2');
        const p = header.querySelector('p');
        if (h2) h2.textContent = "User's Profile";
        if (p) p.textContent = 'user@example.com';
      }

      // User Information card: email, user ID
      const userInfoCard = document.querySelectorAll('p-card')[1];
      if (userInfoCard) {
        const paragraphs = userInfoCard.querySelectorAll('p');
        paragraphs.forEach((p) => {
          const text = p.textContent || '';
          if (text.includes('@')) p.textContent = 'user@example.com';
          if (text.match(/^[a-f0-9-]{36}$/i)) p.textContent = '00000000-0000-0000-0000-000000000000';
        });
      }

      // Timestamps
      const timestamps = document.querySelectorAll('app-relative-time');
      timestamps.forEach((el) => (el.textContent = 'Jan 1, 2024'));
    });

    await screenshotPageComponent(page, pages.profilePage, 'page-profile.png');

    // Logout
    await page.click(menus.authMenuButton);
    await page.click(auth.logoutButton);
  });

  // ============================================================================
  // MENU/COMPONENT SNAPSHOTS (with opaque backgrounds)
  // ============================================================================

  test('menu-auth-signup', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    // Open auth menu (signup is default tab)
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);

    // Make background opaque to prevent content pollution
    await makeBackgroundOpaque(page, '.anchor-menu-panel');

    const signupForm = page.locator(auth.signupForm);
    await expect(signupForm).toHaveScreenshot('menu-auth-signup.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });

  test('menu-auth-login', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    // Open auth menu and switch to login tab
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.waitForTimeout(300);

    await makeBackgroundOpaque(page, '.anchor-menu-panel');

    const loginForm = page.locator(auth.loginForm);
    await expect(loginForm).toHaveScreenshot('menu-auth-login.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });

  test('menu-auth-reset', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    // Open auth menu, go to login, click forgot password
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.click(auth.loginForgotPassword);
    await page.waitForTimeout(300);

    await makeBackgroundOpaque(page, '.anchor-menu-panel');

    const resetForm = page.locator(auth.resetForm);
    await expect(resetForm).toHaveScreenshot('menu-auth-reset.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });

  test('menu-auth-profile', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    // Login
    await page.click(menus.authMenuButton);
    await page.click(auth.loginTab);
    await page.fill(auth.loginIdentifier, testUser.email);
    await page.fill(auth.loginPassword, testUser.password);
    await page.click(auth.loginSubmit);
    await page.waitForSelector(auth.profileMenu, { timeout: 10000 });

    // Open auth menu to show profile
    await page.click(menus.authMenuButton);
    await page.waitForTimeout(300);

    await makeBackgroundOpaque(page, '.anchor-menu-panel');

    const profileMenu = page.locator(auth.profileMenu);
    const box = await profileMenu.boundingBox();
    if (!box) throw new Error('Could not get bounding box for profile menu');

    // Replace dynamic content with stable placeholders for screenshot
    await page.evaluate(() => {
      // Replace email and username
      const email = document.querySelector('.profile-email');
      const username = document.querySelector('.profile-username');
      if (email) email.textContent = 'user@example.com';
      if (username) username.textContent = 'username';

      // Replace timestamps
      const timestamps = document.querySelectorAll('.profile-metadata .metadata-value');
      timestamps.forEach((el) => (el.textContent = 'Jan 1, 2024'));
    });

    await expect(page).toHaveScreenshot('menu-auth-profile.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
      clip: box,
    });

    // Logout
    await page.click(auth.logoutButton);
  });

  test('menu-feature', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    const featureMenu = page.locator(menus.featureSidebar);
    await expect(featureMenu).toHaveScreenshot('menu-feature.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });

  test('menu-language', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    await page.click(menus.languageMenuButton);
    await page.waitForTimeout(300);

    await makeBackgroundOpaque(page, '.anchor-menu-panel');

    const menuPanel = page.locator('.anchor-menu-panel');
    await expect(menuPanel).toHaveScreenshot('menu-language.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });

  test('menu-notification', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    await page.click(menus.notificationCenterButton);
    await page.waitForTimeout(300);

    await makeBackgroundOpaque(page, '.anchor-menu-panel');

    const menuPanel = page.locator('.anchor-menu-panel');
    await expect(menuPanel).toHaveScreenshot('menu-notification.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });

  test('menu-changelog', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    await page.click(menus.changelogMenuButton);
    await page.waitForTimeout(300);

    await makeBackgroundOpaque(page, '.anchor-menu-panel');

    const menuPanel = page.locator('.anchor-menu-panel');
    await expect(menuPanel).toHaveScreenshot('menu-changelog.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });

  test('banner-cookie', async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    // Don't dismiss cookie banner - we want to capture it!

    // Wait for cookie banner to appear
    const cookieBanner = page.locator('.cookie-banner');
    await expect(cookieBanner).toBeVisible({ timeout: 5000 });

    await makeBackgroundOpaque(page, '.cookie-banner');

    await expect(cookieBanner).toHaveScreenshot('banner-cookie.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });

    // Dismiss for cleanup
    await dismissCookieBanner(page);
  });

  // ============================================================================
  // RESPONSIVE LAYOUT SNAPSHOTS
  // ============================================================================

  test('layout-mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    await expect(page).toHaveScreenshot('layout-mobile.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });

  test('layout-tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);

    await expect(page).toHaveScreenshot('layout-tablet.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });
});

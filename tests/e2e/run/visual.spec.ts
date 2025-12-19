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
      const offsetHeight = (el as HTMLElement).offsetHeight ?? 0;
      return Math.max(height, offsetHeight, 100);
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
    // Close the menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Navigate to profile page
    await page.goto(`${APP_BASE_URL}/profile`);
    await waitForAngular(page);

    // Replace dynamic content with stable placeholders for screenshot
    await page.evaluate(() => {
      // Header: username's Profile -> User's Profile, email (in .profile-header-info)
      const headerInfo = document.querySelector('.profile-header-info');
      if (headerInfo) {
        const h2 = headerInfo.querySelector('h2');
        const p = headerInfo.querySelector('p');
        if (h2) h2.textContent = "User's Profile";
        if (p) p.textContent = 'user@example.com';
      }

      // User Information section: email, user ID (in dd elements inside .info-list)
      const infoList = document.querySelector('.info-list');
      if (infoList) {
        const ddElements = infoList.querySelectorAll('dd');
        ddElements.forEach((dd) => {
          const text = dd.textContent || '';
          // Replace email
          if (text.includes('@')) dd.textContent = 'user@example.com';
          // Replace UUID
          if (text.match(/^[a-f0-9-]{36}$/i)) dd.textContent = '00000000-0000-0000-0000-000000000000';
        });
      }

      // Timestamps
      const timestamps = document.querySelectorAll('app-relative-time');
      timestamps.forEach((el) => (el.textContent = 'Jan 1, 2024'));
    });

    await screenshotPageComponent(page, pages.profilePage, 'page-profile.png');

    // Logout
    await page.click(menus.authMenuButton);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.click();
  });

  test('page-profile-light', async ({ page }) => {
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
    // Close the menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Navigate to profile page
    await page.goto(`${APP_BASE_URL}/profile`);
    await waitForAngular(page);

    // Switch to light mode by clicking the theme toggle
    const themeToggle = page.locator(pages.profileThemeToggle);
    await themeToggle.waitFor({ state: 'visible' });

    // Get initial state - if dark, toggle to light
    const htmlElement = page.locator('html');
    const isDark = await htmlElement.evaluate(el => el.classList.contains('app-dark'));
    if (isDark) {
      await page.click(pages.profileThemeToggle);
      await page.waitForTimeout(500); // Wait for theme to apply
    }

    // Replace dynamic content with stable placeholders for screenshot
    await page.evaluate(() => {
      // Header: username's Profile -> User's Profile, email (in .profile-header-info)
      const headerInfo = document.querySelector('.profile-header-info');
      if (headerInfo) {
        const h2 = headerInfo.querySelector('h2');
        const p = headerInfo.querySelector('p');
        if (h2) h2.textContent = "User's Profile";
        if (p) p.textContent = 'user@example.com';
      }

      // User Information section: email, user ID (in dd elements inside .info-list)
      const infoList = document.querySelector('.info-list');
      if (infoList) {
        const ddElements = infoList.querySelectorAll('dd');
        ddElements.forEach((dd) => {
          const text = dd.textContent || '';
          // Replace email
          if (text.includes('@')) dd.textContent = 'user@example.com';
          // Replace UUID
          if (text.match(/^[a-f0-9-]{36}$/i)) dd.textContent = '00000000-0000-0000-0000-000000000000';
        });
      }

      // Timestamps
      const timestamps = document.querySelectorAll('app-relative-time');
      timestamps.forEach((el) => (el.textContent = 'Jan 1, 2024'));
    });

    await screenshotPageComponent(page, pages.profilePage, 'page-profile-light.png');

    // Switch back to dark mode before logout
    await page.click(pages.profileThemeToggle);
    await page.waitForTimeout(300);

    // Logout
    await page.click(menus.authMenuButton);
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.click();
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
    await makeBackgroundOpaque(page, '.dialog-menu-panel');

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

    await makeBackgroundOpaque(page, '.dialog-menu-panel');

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

    await makeBackgroundOpaque(page, '.dialog-menu-panel');

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
    // Wait for username to load (prevents flaky screenshots)
    await page.waitForSelector('.profile-username:not(:empty)', { timeout: 10000 });
    await page.waitForTimeout(300);

    await makeBackgroundOpaque(page, '.dialog-menu-panel');

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

      // Replace timestamps (app-relative-time inside profile metadata)
      const timestamps = document.querySelectorAll('.profile-metadata app-relative-time');
      timestamps.forEach((el) => (el.textContent = 'Jan 1, 2024'));
    });

    await expect(page).toHaveScreenshot('menu-auth-profile.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
      clip: box,
    });

    // Logout
    const logoutBtn = page.locator(auth.logoutButton);
    await logoutBtn.click();
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

    await makeBackgroundOpaque(page, '.dialog-menu-panel');

    const menuPanel = page.locator('.dialog-menu-panel');
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

    await makeBackgroundOpaque(page, '.dialog-menu-panel');

    const menuPanel = page.locator('.dialog-menu-panel');
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

    await makeBackgroundOpaque(page, '.dialog-menu-panel');

    const menuPanel = page.locator('.dialog-menu-panel');
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
    const cookieBanner = page.locator('app-cookie-banner aside');
    await expect(cookieBanner).toBeVisible({ timeout: 5000 });

    await makeBackgroundOpaque(page, 'app-cookie-banner aside');

    await expect(cookieBanner).toHaveScreenshot('banner-cookie.png', {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });

    // Dismiss for cleanup
    await dismissCookieBanner(page);
  });

  // ============================================================================
  // RESPONSIVE LAYOUT SNAPSHOTS
  // Full-page layouts at different viewport sizes
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

  // ============================================================================
  // RESPONSIVE PAGE SNAPSHOTS
  // Each page at phone (375px) and tablet (768px) viewports
  // ============================================================================

  const VIEWPORT_PHONE = { width: 375, height: 667 };
  const VIEWPORT_TABLET = { width: 768, height: 1024 };

  test('page-landing-phone', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_PHONE);
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.landingPage, 'page-landing-phone.png');
  });

  test('page-landing-tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_TABLET);
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.landingPage, 'page-landing-tablet.png');
  });

  test('page-features-phone', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_PHONE);
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.featuresPage, 'page-features-phone.png');
  });

  test('page-features-tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_TABLET);
    await page.goto(`${APP_BASE_URL}/features`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.featuresPage, 'page-features-tablet.png');
  });

  test('page-graphql-phone', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_PHONE);
    await page.goto(`${APP_BASE_URL}/graphql-api`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.graphqlPage, 'page-graphql-phone.png');
  });

  test('page-graphql-tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_TABLET);
    await page.goto(`${APP_BASE_URL}/graphql-api`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.graphqlPage, 'page-graphql-tablet.png');
  });

  test('page-indexeddb-phone', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_PHONE);
    await page.goto(`${APP_BASE_URL}/indexeddb`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.indexedDbPage, 'page-indexeddb-phone.png');
  });

  test('page-indexeddb-tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_TABLET);
    await page.goto(`${APP_BASE_URL}/indexeddb`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.indexedDbPage, 'page-indexeddb-tablet.png');
  });

  test('page-notifications-phone', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_PHONE);
    await page.goto(`${APP_BASE_URL}/notifications`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.notificationsPage, 'page-notifications-phone.png');
  });

  test('page-notifications-tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_TABLET);
    await page.goto(`${APP_BASE_URL}/notifications`);
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await screenshotPageComponent(page, pages.notificationsPage, 'page-notifications-tablet.png');
  });

  test('page-privacy-phone', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_PHONE);
    await page.goto(`${APP_BASE_URL}/privacy`, { waitUntil: 'networkidle' });
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await page.locator(pages.privacyPage).waitFor({ state: 'visible', timeout: 30000 });
    await screenshotPageComponent(page, pages.privacyPage, 'page-privacy-phone.png');
  });

  test('page-privacy-tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_TABLET);
    await page.goto(`${APP_BASE_URL}/privacy`, { waitUntil: 'networkidle' });
    await waitForAngular(page);
    await dismissCookieBanner(page);
    await page.locator(pages.privacyPage).waitFor({ state: 'visible', timeout: 30000 });
    await screenshotPageComponent(page, pages.privacyPage, 'page-privacy-tablet.png');
  });

  test('page-profile-phone', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_PHONE);

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
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Navigate to profile page
    await page.goto(`${APP_BASE_URL}/profile`);
    await waitForAngular(page);

    // Replace dynamic content
    await page.evaluate(() => {
      const headerInfo = document.querySelector('.profile-header-info');
      if (headerInfo) {
        const h2 = headerInfo.querySelector('h2');
        const p = headerInfo.querySelector('p');
        if (h2) h2.textContent = "User's Profile";
        if (p) p.textContent = 'user@example.com';
      }
      const infoList = document.querySelector('.info-list');
      if (infoList) {
        const ddElements = infoList.querySelectorAll('dd');
        ddElements.forEach((dd) => {
          const text = dd.textContent || '';
          if (text.includes('@')) dd.textContent = 'user@example.com';
          if (text.match(/^[a-f0-9-]{36}$/i)) dd.textContent = '00000000-0000-0000-0000-000000000000';
        });
      }
      const timestamps = document.querySelectorAll('app-relative-time');
      timestamps.forEach((el) => (el.textContent = 'Jan 1, 2024'));
    });

    await screenshotPageComponent(page, pages.profilePage, 'page-profile-phone.png');

    // Logout
    await page.click(menus.authMenuButton);
    await page.locator(auth.logoutButton).click();
  });

  test('page-profile-tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_TABLET);

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
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Navigate to profile page
    await page.goto(`${APP_BASE_URL}/profile`);
    await waitForAngular(page);

    // Replace dynamic content
    await page.evaluate(() => {
      const headerInfo = document.querySelector('.profile-header-info');
      if (headerInfo) {
        const h2 = headerInfo.querySelector('h2');
        const p = headerInfo.querySelector('p');
        if (h2) h2.textContent = "User's Profile";
        if (p) p.textContent = 'user@example.com';
      }
      const infoList = document.querySelector('.info-list');
      if (infoList) {
        const ddElements = infoList.querySelectorAll('dd');
        ddElements.forEach((dd) => {
          const text = dd.textContent || '';
          if (text.includes('@')) dd.textContent = 'user@example.com';
          if (text.match(/^[a-f0-9-]{36}$/i)) dd.textContent = '00000000-0000-0000-0000-000000000000';
        });
      }
      const timestamps = document.querySelectorAll('app-relative-time');
      timestamps.forEach((el) => (el.textContent = 'Jan 1, 2024'));
    });

    await screenshotPageComponent(page, pages.profilePage, 'page-profile-tablet.png');

    // Logout
    await page.click(menus.authMenuButton);
    await page.locator(auth.logoutButton).click();
  });
});

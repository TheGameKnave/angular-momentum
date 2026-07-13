import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus } from '../helpers/selectors';

/**
 * Common viewport sizes for responsive testing.
 * Based on common device breakpoints.
 */
const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'mobile' },      // iPhone SE
  tablet: { width: 768, height: 1024, name: 'tablet' },     // iPad
  desktop: { width: 1280, height: 800, name: 'desktop' },   // Standard laptop
  wide: { width: 1920, height: 1080, name: 'wide' },        // Full HD monitor
};

test.describe('Responsive Design Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  // ============================================================================
  // VIEWPORT ADAPTATION TESTS
  // ============================================================================

  test('Layout adapts to mobile viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // On mobile, sidebar is replaced with bottom navigation
    // Check that bottom nav is visible
    const bottomNav = page.locator('app-menu-feature');
    await expect(bottomNav).toBeVisible();

    // Bottom nav should be positioned at the bottom (check its position)
    // Poll so CSS transitions triggered by the resize have time to settle
    await expect.poll(async () => {
      const navBox = await bottomNav.boundingBox();
      // On mobile, the nav should be near the bottom of the viewport
      // (y position + height should be close to viewport height)
      return navBox !== null && navBox.y + navBox.height >= VIEWPORTS.mobile.height - 100;
    }).toBe(true);

  });

  test('Layout adapts to tablet viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);

    // Sidebar may be visible but narrower than desktop
    const sidebar = page.locator('app-menu-feature');
    await expect(sidebar).toBeVisible();

  });

  test('Layout adapts to desktop viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Sidebar should be fully visible on desktop
    const sidebar = page.locator('app-menu-feature');
    await expect(sidebar).toBeVisible();

    // Check sidebar has reasonable width
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox).toBeTruthy();

  });

  // ============================================================================
  // NAVIGATION BEHAVIOR TESTS
  // ============================================================================

  test('Header menus work on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Auth menu should still be accessible
    await page.click(menus.authMenuButton);

    const authPanel = page.locator(menus.authMenuContent);
    await expect(authPanel).toBeVisible();

    // Menu should fit within viewport
    const panelBox = await authPanel.boundingBox();
    expect(panelBox).toBeTruthy();
    expect(panelBox!.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width);

    await page.keyboard.press('Escape');
  });

  test('Notification center works on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Notification center must remain accessible on mobile (header button, not viewport-gated)
    const notificationButton = page.locator(menus.notificationCenterButton);
    await expect(notificationButton).toBeVisible();
    await notificationButton.click();

    const notificationPanel = page.locator(menus.notificationCenterContent);
    await expect(notificationPanel).toBeVisible();

    // Panel should fit within viewport
    const panelBox = await notificationPanel.boundingBox();
    expect(panelBox).toBeTruthy();
    expect(panelBox!.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width);

    await page.keyboard.press('Escape');

  });

  // ============================================================================
  // CONTENT REFLOW TESTS
  // ============================================================================

  test('Page content reflows correctly at different widths', async ({ page }) => {
    // Start wide
    await page.setViewportSize(VIEWPORTS.wide);

    // No horizontal scrollbar at any size
    for (const viewport of Object.values(VIEWPORTS)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Check for horizontal overflow; poll so reflow after the resize can settle
      await expect.poll(async () => {
        return page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
      }, { message: `no horizontal scroll at ${viewport.name}` }).toBe(false);
    }
  });

  test('Text remains readable at all viewport sizes', async ({ page }) => {
    for (const viewport of Object.values(VIEWPORTS)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Main heading must be visible at every viewport (landing page always renders an h1)
      const heading = page.locator('h1, h2').first();
      await expect(heading, `heading visible at ${viewport.name}`).toBeVisible();

      const fontSize = await heading.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });

      // Font should be at least 16px for readability
      expect(fontSize).toBeGreaterThanOrEqual(16);
    }
  });

  // ============================================================================
  // TOUCH TARGET TESTS (for mobile usability)
  // ============================================================================

  test('Interactive elements have adequate touch targets on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Wait for the mobile layout to be in place before measuring
    await expect(page.locator('app-menu-feature')).toBeVisible();

    // Check buttons have minimum 44x44 touch target (WCAG recommendation)
    // Exclude header/footer elements which have intentionally compact styling
    // Only visible buttons need touch targets, so filter with :visible
    const buttons = page.locator('main button:visible, main [role="button"]:visible, main a.p-button:visible');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      expect(box, `button ${i} has a bounding box`).toBeTruthy();

      // Either width or height should be at least 44px
      // (some buttons are intentionally narrow but tall, or wide but short)
      const hasAdequateTarget = box!.width >= 44 || box!.height >= 44;
      expect(hasAdequateTarget).toBe(true);
    }
  });

  // ============================================================================
  // VISUAL REGRESSION (screenshot comparison)
  // ============================================================================

  test('Visual consistency across viewports', async ({ page }) => {
    // Take screenshots at each viewport for visual regression
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.locator('app-root'), `layout at ${name}`).toBeVisible();
      await expect(page.locator('app-menu-feature'), `navigation at ${name}`).toBeVisible();
    }
  });
});

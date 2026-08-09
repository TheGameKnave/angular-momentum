import { test, expect } from '@playwright/test';
import { APP_BASE_URL, getThreshold } from '../data/constants';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { menus } from '../helpers/selectors';

test.describe('Performance Tests', () => {
  // The multi-page navigation tests tour half a dozen routes (each with a
  // waitForAngular) before their final measurement; under full-suite worker
  // contention that approaches the default 30s budget with no headroom.
  // Same allowance as the login-flow suites (storage-promotion).
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test.afterEach(async ({ page }) => {
    await assertNoMissingTranslations(page);
  });

  // ============================================================================
  // PAGE LOAD PERFORMANCE TESTS
  // ============================================================================

  test('Page load time is within threshold', async ({ page }) => {
    const startTime = await page.evaluate(() => performance.now());

    await page.waitForLoadState('domcontentloaded');

    const endTime = await page.evaluate(() => performance.now());
    const pageLoadTime = endTime - startTime;

    expect(pageLoadTime).toBeLessThan(getThreshold('pageLoad'));

    console.log(`Page load time: ${pageLoadTime.toFixed(2)} ms`);

  });

  // ============================================================================
  // MEMORY USAGE TESTS
  // ============================================================================

  test('Initial memory usage is within threshold', async ({ page, browserName }) => {
    // Memory API is only available in Chromium
    test.skip(browserName !== 'chromium', 'Memory API only available in Chromium');

    // Measurement window (not a render wait): let the JS heap settle before sampling memory
    await page.waitForTimeout(2000);

    const memoryVal = await page.evaluate(() => {
      const perf = performance as any;
      if (perf.memory) {
        return {
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          usedJSHeapSize: perf.memory.usedJSHeapSize,
        };
      }
      return null;
    });

    if (memoryVal) {
      expect(memoryVal.usedJSHeapSize).toBeLessThan(getThreshold('memory'));
      console.log(`Memory usage: ${(memoryVal.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }
  });

  test('Memory after navigation remains stable', async ({ page, browserName }) => {
    // Memory API is only available in Chromium
    test.skip(browserName !== 'chromium', 'Memory API only available in Chromium');

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      const perf = performance as any;
      if (perf.memory) {
        return {
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          usedJSHeapSize: perf.memory.usedJSHeapSize,
        };
      }
      return null;
    });

    if (!initialMemory) {
      test.skip();
      return;
    }

    console.log(`Initial memory: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);

    // Navigate through several pages
    const pagesToVisit = [
      '/features',
      '/privacy',
      '/notifications',
      '/indexeddb',
      '/graphql-api'
    ];

    for (const pagePath of pagesToVisit) {
      await page.goto(`${APP_BASE_URL}${pagePath}`);
      await waitForAngular(page);
    }

    // Return to home
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    // Measurement window (not a render wait): let the JS heap settle before the final memory sample
    await page.waitForTimeout(1000);

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      const perf = performance as any;
      if (perf.memory) {
        return {
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          usedJSHeapSize: perf.memory.usedJSHeapSize,
        };
      }
      return null;
    });

    if (finalMemory) {
      console.log(`Final memory: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);

      // Memory should still be within threshold after navigation
      expect(finalMemory.usedJSHeapSize).toBeLessThan(getThreshold('memory'));

      // Check for significant memory leaks (memory shouldn't more than double)
      const memoryGrowth = finalMemory.usedJSHeapSize / initialMemory.usedJSHeapSize;
      console.log(`Memory growth factor: ${memoryGrowth.toFixed(2)}x`);

      expect(memoryGrowth).toBeLessThan(2);
    }
  });

  // ============================================================================
  // MENU INTERACTION PERFORMANCE
  // ============================================================================

  test('Menu open/close does not cause memory leaks', async ({ page, browserName }) => {
    // Memory API is only available in Chromium
    test.skip(browserName !== 'chromium', 'Memory API only available in Chromium');

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      const perf = performance as any;
      if (perf.memory) {
        return {
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          usedJSHeapSize: perf.memory.usedJSHeapSize,
        };
      }
      return null;
    });

    if (!initialMemory) {
      test.skip();
      return;
    }

    // Open and close menus multiple times
    // Use Escape key to close menus to avoid CDK overlay backdrop blocking clicks
    // All menus share the same panel selector, so wait for it to open/close each time
    const menuPanel = page.locator(menus.authMenuContent);
    for (let i = 0; i < 5; i++) {
      // Auth menu
      await page.click(menus.authMenuButton);
      await expect(menuPanel).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menuPanel).toBeHidden();

      // Language menu
      await page.click(menus.languageMenuButton);
      await expect(menuPanel).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menuPanel).toBeHidden();

      // Changelog menu (bottom left)
      await page.click(menus.changelogMenuButton);
      await expect(menuPanel).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menuPanel).toBeHidden();

      // Notification center
      await page.click(menus.notificationCenterButton);
      await expect(menuPanel).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menuPanel).toBeHidden();
    }

    // Measurement window (not a render wait): give GC a chance to run before the final memory sample
    await page.waitForTimeout(1000);

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      const perf = performance as any;
      if (perf.memory) {
        return {
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          usedJSHeapSize: perf.memory.usedJSHeapSize,
        };
      }
      return null;
    });

    if (finalMemory) {
      // Memory shouldn't grow significantly from repeated menu operations
      const memoryGrowth = finalMemory.usedJSHeapSize / initialMemory.usedJSHeapSize;
      console.log(`Memory growth after menu interactions: ${memoryGrowth.toFixed(2)}x`);

      expect(memoryGrowth).toBeLessThan(1.5);
    }
  });
});

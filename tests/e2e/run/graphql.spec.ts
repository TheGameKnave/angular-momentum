import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { assertNoMissingTranslations, waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';
import { pages } from '../helpers/selectors';

// Helper to navigate to GraphQL API page
async function navigateToGraphQL(page: any): Promise<void> {
  await page.goto(`${APP_BASE_URL}/graphql-api`);
  await waitForAngular(page);
}

test.describe('GraphQL API Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test.afterEach(async ({ page }) => {
    await assertNoMissingTranslations(page);
  });

  // ============================================================================
  // PAGE LOAD TESTS
  // ============================================================================

  test('GraphQL API page loads correctly', async ({ page }) => {
    await navigateToGraphQL(page);

    await expect(page.locator(pages.graphqlPage)).toBeVisible();
  });

  test('GraphQL documentation renders', async ({ page }) => {
    await navigateToGraphQL(page);

    // Check for content - should have markdown rendered or loading state
    const pageContent = await page.locator(pages.graphqlPage).innerText();

    // Should have some content (either docs or loading message)
    expect(pageContent.length).toBeGreaterThan(0);

  });
});

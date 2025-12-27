# E2E Testing with Playwright

This document covers the end-to-end testing setup using Playwright.

## Overview

The e2e test suite uses Playwright to test:
- **Functional behavior** (navigation, forms, authentication, API interactions)
- **Visual regression** (screenshot comparisons across browsers)
- **Responsive design** (viewport adaptation, touch targets)
- **Feature flags** (enable/disable behavior)

## Quick Start

```bash
# Run all tests (Chromium functional + visual on all browsers)
npx playwright test --config=tests/e2e/playwright.config.ts

# Run Chromium only (fastest, used in CI)
npx playwright test --config=tests/e2e/playwright.config.ts --project=chromium --project=chromium-features --project=chromium-feature-toggles

# Run visual tests only
npm run test:e2e -- --project=chromium --grep visual

# Update visual baselines after intentional UI changes
npm run test:e2e:accept

# View test report
npx playwright show-report tests/e2e/playwright-report
```

## Test Structure

```
tests/e2e/
├── playwright.config.ts    # Configuration and browser projects
├── global-setup.ts         # Enables all feature flags before tests
├── data/
│   ├── constants.ts        # URLs and shared constants
│   └── test-users.ts       # Test user management
├── helpers/
│   ├── assertions.helper.ts    # waitForAngular, dismissCookieBanner
│   └── selectors.ts            # Centralized DOM selectors
├── run/
│   ├── auth.spec.ts            # Authentication flows
│   ├── navigation.spec.ts      # Layout and navigation
│   ├── notifications.spec.ts   # Push notifications
│   ├── indexeddb.spec.ts       # Offline storage
│   ├── graphql.spec.ts         # GraphQL API page
│   ├── profile.spec.ts         # User profile management
│   ├── storage-promotion.spec.ts # Anonymous to auth data migration
│   ├── performance.spec.ts     # Load times, memory leaks
│   ├── responsive.spec.ts      # Viewport adaptation
│   ├── visual.spec.ts          # Screenshot comparisons
│   ├── features.spec.ts        # Feature flag UI
│   ├── feature-toggles.spec.ts # Feature enable/disable behavior
│   └── smoke.spec.ts           # Post-deploy smoke tests (run separately)
└── screenshots/
    └── visual.spec.ts-snapshots/   # Visual regression baselines
        ├── banner-cookie-chromium-darwin.png
        ├── layout-mobile-chromium-darwin.png
        ├── menu-auth-login-chromium-darwin.png
        ├── menu-feature-chromium-darwin.png
        ├── page-landing-chromium-darwin.png
        └── ...
```

## Browser Strategy

| Browser | Tests | Purpose |
|---------|-------|---------|
| **Chromium** | Full suite (~110 tests) | Functional + visual regression |
| **Firefox** | Visual only | Catch rendering differences |
| **WebKit** | Visual only | Catch Safari-specific issues |

This approach recognizes that:
- Functional behavior (clicks, forms, navigation) is consistent across modern browsers
- Rendering differences (fonts, CSS quirks) are where browsers diverge
- Running the same functional tests 3x wastes CI time without catching real bugs

## Visual Regression Testing

### How It Works

Playwright's built-in `toHaveScreenshot()` handles visual regression:

1. **First run**: Creates baseline screenshots in `visual.spec.ts-snapshots/`
2. **Subsequent runs**: Compares current screenshots against baselines
3. **On failure**: HTML report shows expected, actual, and diff images

### Reviewing Failures

When a visual test fails:

```bash
# View the HTML report with visual diffs
npx playwright show-report tests/e2e/playwright-report
```

The report shows side-by-side comparisons of expected vs actual screenshots with highlighted differences.

### Accepting Changes

After intentional UI changes, update the baselines:

```bash
npm run test:e2e:accept
```

Then review the updated screenshots in `tests/e2e/screenshots/visual.spec.ts-snapshots/` and commit them.

### Screenshot Options

```typescript
await expect(page).toHaveScreenshot('page-name.png', {
  maxDiffPixelRatio: 0.01,  // Allow 1% pixel difference (anti-aliasing)
  animations: 'disabled',    // Freeze CSS animations
  mask: [
    page.locator('.version'),           // Mask dynamic content
    page.locator('[data-testid="timestamp"]'),
  ],
});
```

### What's Captured

Screenshots use reverse naming for alphabetical grouping (e.g., `page-landing` not `landing-page`):

- **Page components** (`page-*`): Landing, Features, GraphQL, IndexedDB, Notifications, Privacy, Profile
- **Menus** (`menu-*`): Auth (signup, login, reset, profile), Feature sidebar, Language, Notification
- **Banners** (`banner-*`): Cookie consent
- **Layouts** (`layout-*`): Mobile (375px), Tablet (768px)

## Feature Flag Tests

Feature flag tests run **after** main tests to avoid race conditions:

```
chromium (main tests)
    ↓
chromium-features (feature flag UI)
    ↓
chromium-feature-toggles (enable/disable behavior)
```

The `global-setup.ts` enables all features before any tests run. The `feature-toggles.spec.ts` re-enables all features in `afterAll` to leave the system in a clean state.

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/build_test.yml`) runs:

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E Tests
  run: npx playwright test --config=tests/e2e/playwright.config.ts --project=chromium --project=chromium-features --project=chromium-feature-toggles
  env:
    CI: true
```

On failure, artifacts are uploaded:
- `playwright-report/` - HTML report with screenshots and traces
- `test-results/` - Visual diff images

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { APP_BASE_URL } from '../data/constants';
import { waitForAngular, dismissCookieBanner } from '../helpers/assertions.helper';

test.describe('My Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE_URL);
    await waitForAngular(page);
    await dismissCookieBanner(page);
  });

  test('does something', async ({ page }) => {
    await page.click('button');
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Using Selectors

Centralize selectors in `helpers/selectors.ts`:

```typescript
import { menus, pages, buttons } from '../helpers/selectors';

await page.click(menus.authMenuButton);
await expect(page.locator(pages.featuresPage)).toBeVisible();
```

### Test Users

For tests requiring authentication:

```typescript
import { createTestUser, deleteTestUser, login } from '../helpers/auth.helper';

test('authenticated feature', async ({ page }) => {
  const user = await createTestUser('my-test');
  try {
    await login(page, user.email, user.password);
    // ... test authenticated behavior
  } finally {
    await deleteTestUser(user.id);
  }
});
```

## Debugging

### View Failed Test Artifacts

```bash
npx playwright show-report tests/e2e/playwright-report
```

### Run with UI Mode

```bash
npx playwright test --ui --config=tests/e2e/playwright.config.ts
```

### Run Single Test

```bash
npx playwright test -g "Landing page visual" --config=tests/e2e/playwright.config.ts
```

### Debug Mode

```bash
npx playwright test --debug --config=tests/e2e/playwright.config.ts
```

## Smoke Tests (Post-Deploy)

Smoke tests verify critical functionality after deployment to dev/staging environments.

### Running Smoke Tests

Smoke tests run automatically after `./deploy.sh dev` or `./deploy.sh staging`. To run manually:

```bash
# Against dev environment
APP_BASE_URL=https://dev.angularmomentum.app npx playwright test -c tests/e2e/playwright.smoke.config.ts

# Against staging environment
APP_BASE_URL=https://staging.angularmomentum.app npx playwright test -c tests/e2e/playwright.smoke.config.ts
```

### What's Tested

- SSR hydration (app loads without console errors)
- API connectivity (changelog loads)
- Navigation (feature sidebar works)
- Auth UI (login form renders)
- Language switching
- Notification center (if enabled)

### Configuration

Smoke tests use a separate config (`playwright.smoke.config.ts`) that:
- Requires `APP_BASE_URL` environment variable
- Has no `webServer` (tests against deployed environment)
- Runs sequentially with 1 worker
- Uses shorter timeout (30s)

## Common Issues

### Tests fail with "feature not found"

The feature flag API may not have responded in time. The `global-setup.ts` enables all features, but network issues can cause problems. Check that the server is running.

### Visual tests fail after UI changes

This is expected! Update the baselines:

```bash
npx playwright test visual.spec.ts --config=tests/e2e/playwright.config.ts --update-snapshots
```

Then review the new screenshots to verify the changes are intentional.

### Tests pass locally but fail in CI

- CI runs on Linux; baselines were generated on macOS
- Font rendering differs between OSes
- Solution: Generate baselines in CI or accept small pixel differences with `maxDiffPixelRatio`

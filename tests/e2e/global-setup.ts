import { API_BASE_URL, APP_BASE_URL } from './data/constants';

/**
 * All feature flags that should be enabled for e2e tests.
 * These correspond to feature-flagged components in COMPONENT_LIST.
 */
const FEATURE_FLAGS = [
  'GraphQL API',
  'IndexedDB',
  'Installers',
  'Notifications',
  // Arbitrary features
  'App Version',
  'Environment',
  'Language',
];

/**
 * Verifies the servers on the test ports are actually THIS app before any
 * test runs. reuseExistingServer means Playwright will happily run the whole
 * suite against whatever answers on port 4200 (this has happened — a full run
 * executed against a different project's dev server). Fail fast instead.
 */
async function verifyAppIdentity() {
  const appResponse = await fetch(APP_BASE_URL);
  const html = await appResponse.text();
  if (!html.includes('<title>Angular Momentum</title>')) {
    throw new Error(
      `Server at ${APP_BASE_URL} is not Angular Momentum — another app is likely occupying the port. ` +
      'Stop it (or free ports 4200/4201) and re-run.'
    );
  }

  const apiResponse = await fetch(`${API_BASE_URL}/api/feature-flags`);
  if (!apiResponse.ok || !Array.isArray(await apiResponse.json())) {
    throw new Error(
      `API at ${API_BASE_URL} did not answer like the Angular Momentum server — check what is running on the port.`
    );
  }
}

/**
 * Global setup for Playwright tests.
 * Enables all feature flags before running any tests.
 */
async function globalSetup() {
  await verifyAppIdentity();

  console.log('Enabling all feature flags for e2e tests...');

  for (const feature of FEATURE_FLAGS) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/feature-flags/${encodeURIComponent(feature)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: true }),
      });

      if (!response.ok) {
        console.warn(`Failed to enable feature "${feature}": ${response.status}`);
      }
    } catch (error) {
      console.warn(`Error enabling feature "${feature}":`, error);
    }
  }

  console.log('Feature flags enabled.');
}

export default globalSetup;

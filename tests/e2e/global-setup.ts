import { API_BASE_URL } from './data/constants';

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
 * Global setup for Playwright tests.
 * Enables all feature flags before running any tests.
 */
async function globalSetup() {
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

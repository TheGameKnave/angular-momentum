import { cleanupE2ETestUsers } from './helpers/auth.helper';

/**
 * Global teardown for Playwright tests.
 * Cleans up any leftover e2e test accounts that weren't deleted during test runs.
 * This ensures test accounts don't accumulate in the database.
 */
async function globalTeardown() {
  console.log('Cleaning up e2e test accounts...');

  try {
    const result = await cleanupE2ETestUsers();

    if (result.deleted > 0) {
      console.log(`Cleaned up ${result.deleted} e2e test account(s).`);
    } else {
      console.log('No leftover e2e test accounts to clean up.');
    }

    if (result.errors?.length) {
      console.warn('Cleanup errors:', result.errors);
    }
  } catch (error) {
    console.warn('Error during e2e cleanup:', error);
    // Don't fail the test run if cleanup fails
  }
}

export default globalTeardown;

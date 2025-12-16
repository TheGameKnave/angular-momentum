export interface TestUser {
  email: string;
  password: string;
  username: string;
}

/**
 * Generates a random test user with unique credentials.
 * Credentials are ephemeral - users are created and deleted per test run.
 */
export function generateTestUser(): TestUser {
  const id = Math.random().toString(36).substring(2, 8);
  const timestamp = Date.now().toString(36);
  return {
    email: `e2e-${id}-${timestamp}@angular-momentum.test`,
    password: `TestP@ss${id}!${timestamp}`,
    username: `e2e_${id}_${timestamp}`
  };
}

/**
 * Generates multiple unique test users.
 */
export function generateTestUsers(count: number): TestUser[] {
  return Array.from({ length: count }, () => generateTestUser());
}

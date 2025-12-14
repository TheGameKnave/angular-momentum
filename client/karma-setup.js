/**
 * Karma test setup - runs in browser context before tests
 */

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = /**/console.log;

// Mock Turnstile to prevent "Cannot read properties of undefined (reading 'render')" errors
window.turnstile = {
  render: () => 'mock-widget-id',
  remove: () => {},
  reset: () => {},
  getResponse: () => 'mock-response',
};

// Helper to convert args to string
function argsToString(args) {
  return args.map(arg => {
    if (arg instanceof Error) return arg.toString() + '\n' + (arg.stack || '');
    if (typeof arg === 'object') return JSON.stringify(arg);
    return String(arg);
  }).join(' ');
}

// Filter console.error to suppress known third-party errors
console.error = function(...args) {
  const fullMessage = argsToString(args);

  // Suppress known test environment errors
  if (fullMessage.includes('Acquiring an exclusive Navigator LockManager lock') ||
      fullMessage.includes('Cannot read properties of undefined (reading \'render\')') ||
      fullMessage.includes('Error fetching GraphQL API docs') ||
      fullMessage.includes('Failed to create username after signup')) {
    return;
  }

  originalConsoleError.apply(console, args);
};

// Filter console.warn to suppress known third-party warnings
console.warn = function(...args) {
  const fullMessage = argsToString(args);

  // Suppress Supabase multiple client warnings (expected in isolated test environment)
  if (fullMessage.includes('Multiple GoTrueClient instances detected') ||
      fullMessage.includes('GoTrueClient@')) {
    return;
  }

  originalConsoleWarn.apply(console, args);
};

// Filter console.log to suppress verbose test logs
console.log = function(...args) {
  const fullMessage = argsToString(args);

  // Suppress verbose service logs during tests
  if (fullMessage.includes('[AuthService] Auth state changed') ||
      fullMessage.includes('[MenuAuth]') ||
      fullMessage.includes('[CookieBanner]') ||
      fullMessage.includes('update installed') ||
      fullMessage.includes('Checking for updates')) {
    return;
  }

  originalConsoleLog.apply(console, args);
};

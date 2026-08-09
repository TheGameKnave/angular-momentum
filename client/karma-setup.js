/**
 * Karma test setup - runs in browser context before tests
 */

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = /**/console.log;

// Tripwire for Karma's "Some of your tests did a full page reload!" flake:
// remember which spec is running; if the context page unloads mid-run (a real
// location.reload()/form submit — a tab CRASH skips beforeunload, so silence
// here plus the Karma error points at a browser crash instead), the
// re-executed copy of this file names the spec that caused it.
if (window.jasmine && jasmine.getEnv) {
  const reloadCulprit = sessionStorage.getItem('debug_reload_during_spec');
  if (reloadCulprit) {
    sessionStorage.removeItem('debug_reload_during_spec');
    const message = 'FULL PAGE RELOAD was triggered during spec: ' + reloadCulprit;
    if (window.__karma__ && window.__karma__.error) {
      window.__karma__.error(message); // reaches the log even with captureConsole off
    } else {
      originalConsoleError.call(console, message);
    }
  }
  jasmine.getEnv().addReporter({
    specStarted(result) { sessionStorage.setItem('debug_last_spec', result.fullName); },
    jasmineDone() { sessionStorage.setItem('debug_last_spec', '(run finished)'); },
  });
  window.addEventListener('beforeunload', function () {
    const last = sessionStorage.getItem('debug_last_spec');
    if (last && last !== '(run finished)') {
      sessionStorage.setItem('debug_reload_during_spec', last);
    }
  });
}

// Mock /api/health requests so ConnectivityService doesn't spam Karma's web-server with 404s
const originalFetch = window.fetch;
window.fetch = function(input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  if (url.includes('/api/health')) {
    return Promise.resolve(new Response('{"status":"ok"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  }
  return originalFetch.call(this, input, init);
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

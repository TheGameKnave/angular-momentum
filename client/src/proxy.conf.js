// istanbul ignore file
// Silence vite's proxy logger; failed proxies are noisy during e2e connectivity tests
// that intentionally simulate offline states. App-level logging still surfaces real failures.
const logLevel = 'silent';
module.exports = {
  '/api': {
    target: 'http://localhost:4201',
    secure: false,
    changeOrigin: true,
    logLevel
  },
  '/socket.io': {
    target: 'http://localhost:4201',
    ws: true,
    secure: false,
    changeOrigin: true,
    logLevel
  },
  // Use /gql instead of /graphql to avoid collision with /graphql-api route
  '/gql': {
    target: 'http://localhost:4201',
    secure: false,
    changeOrigin: true,
    logLevel
  },
  // Universal Links (iOS) & App Links (Android) verification
  '/.well-known': {
    target: 'http://localhost:4201',
    secure: false,
    changeOrigin: true,
    logLevel
  }
};

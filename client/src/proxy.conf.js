// istanbul ignore file
module.exports = {
  '/api': {
    target: 'http://localhost:4201',
    secure: false,
    changeOrigin: true
  },
  '/socket.io': {
    target: 'http://localhost:4201',
    ws: true,
    secure: false,
    changeOrigin: true
  },
  // Use /gql instead of /graphql to avoid collision with /graphql-api route
  '/gql': {
    target: 'http://localhost:4201',
    secure: false,
    changeOrigin: true
  },
  // Universal Links (iOS) & App Links (Android) verification
  '/.well-known': {
    target: 'http://localhost:4201',
    secure: false,
    changeOrigin: true
  }
};

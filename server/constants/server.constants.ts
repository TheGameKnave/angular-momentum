/**
 * Shared server configuration constants
 */

/**
 * Allowed CORS origins for the application.
 * Used by both Express and Socket.IO servers.
 */
export const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'http://192.168.1.x:4200',
  'https://dev.angularmomentum.app',
  'https://staging.angularmomentum.app',
  'https://angularmomentum.app',
  'tauri://localhost', // for tauri ios
  'http://tauri.localhost', // for tauri android
];

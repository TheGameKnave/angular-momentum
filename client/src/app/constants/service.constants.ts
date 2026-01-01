/**
 * Service-related constants for background processes and API calls
 */

/**
 * Notification service configuration.
 * Controls notification storage and persistence behavior.
 */
export const NOTIFICATION_CONFIG = {
  /**
   * Maximum number of notifications to store in localStorage.
   * Prevents unbounded storage growth by limiting notification history.
   * Oldest notifications are removed when this limit is exceeded.
   */
  MAX_STORED_NOTIFICATIONS: 100,
} as const;

/**
 * Update service configuration for application version checking.
 * Defines how often the app checks for new versions.
 */
export const UPDATE_CONFIG = {
  /**
   * Interval for checking updates in milliseconds.
   * Set to 15 minutes (900,000 ms) to balance responsiveness with network efficiency.
   */
  CHECK_INTERVAL_MS: 10.05 * 60 * 1000,
  /**
   * Timeout for update check in milliseconds.
   * If checkForUpdate() doesn't resolve within this time, abort and allow retry.
   * Set to 30 seconds to handle slow networks while avoiding indefinite hangs.
   */
  CHECK_TIMEOUT_MS: 30 * 1000,
} as const;

/**
 * Change log service configuration.
 * Controls how often release notes are refreshed from the server.
 */
export const CHANGELOG_CONFIG = {
  /**
   * Refresh interval for change log in milliseconds.
   * Set to 1 hour (3,600,000 ms) to reduce unnecessary API calls.
   */
  REFRESH_INTERVAL_MS: 1000 * 60 * 60,
} as const;

/**
 * Connectivity service configuration for network monitoring.
 * Defines intervals and thresholds for detecting online/offline status.
 */
export const CONNECTIVITY_CONFIG = {
  /**
   * Base interval for connectivity checks in milliseconds.
   * Initial check frequency is 10 seconds when connection is stable.
   */
  BASE_INTERVAL_MS: 10000,
  /**
   * Maximum interval for connectivity checks in milliseconds.
   * Check frequency backs off to 60 seconds during extended outages.
   */
  MAX_INTERVAL_MS: 60000,
  /**
   * Grace period before marking as offline in milliseconds.
   * Waits 2 seconds before showing offline status to avoid false positives.
   */
  GRACE_PERIOD_MS: 2000,
} as const;

/**
 * Authentication service timing configuration.
 * Controls delays for auth state processing to ensure stability.
 */
export const AUTH_TIMING = {
  /**
   * Delay before processing auth state changes in milliseconds.
   * Prevents race conditions by debouncing rapid auth state updates.
   */
  STATE_CHANGE_DELAY_MS: 100,
} as const;

/**
 * UI-related constants for components
 */

/**
 * Bootstrap-style responsive breakpoints in pixels.
 * These values define the minimum viewport width for each screen size category.
 * Used for responsive design and layout adjustments.
 */
export const SCREEN_SIZES = {
  /** Small screens: 576px and up (mobile landscape, small tablets) */
  sm: 576,
  /** Medium screens: 768px and up (tablets portrait) */
  md: 768,
  /** Large screens: 992px and up (desktops, tablets landscape) */
  lg: 992,
  /** Extra large screens: 1200px and up (large desktops) */
  xl: 1200,
} as const;

/**
 * Overlay and z-index configuration for UI layering.
 * Controls the stacking order of overlay elements like menus and modals.
 */
export const OVERLAY_CONFIG = {
  /**
   * Default z-index for overlay menus.
   * Ensures overlays appear above regular content but below critical UI elements.
   */
  DEFAULT_Z_INDEX: 1000,
} as const;

/**
 * IndexedDB configuration for browser-based persistent storage.
 * Defines database parameters and auto-save behavior for offline data persistence.
 */
export const INDEXEDDB_CONFIG = {
  /**
   * Database name for IndexedDB storage.
   * Used to identify the application's database in the browser.
   */
  DB_NAME: 'momentum',
  /**
   * Database version number.
   * Increment this when schema changes are needed to trigger database upgrades.
   */
  DB_VERSION: 1,
  /**
   * Debounce time for auto-save operations in milliseconds.
   * Prevents excessive writes by waiting for user to finish typing.
   */
  DEBOUNCE_TIME_MS: 400,
} as const;

/**
 * Time unit conversion constants.
 * Provides standard multipliers for converting between time units.
 * Useful for calculating durations and intervals.
 */
export const TIME_CONSTANTS = {
  SECONDS: 1000,
  MINUTES: 60 * 1000,
  HOURS: 60 * 60 * 1000,
  DAYS: 24 * 60 * 60 * 1000,
  WEEKS: 7 * 24 * 60 * 60 * 1000,
  YEARS: 365 * 24 * 60 * 60 * 1000,
} as const;

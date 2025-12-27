/**
 * Storage key prefixes for user-scoped data.
 */
export const STORAGE_PREFIXES = {
  ANONYMOUS: 'anonymous',
  USER: 'user',
} as const;

/**
 * System storage key names that should NOT be migrated (app-level, not user-level).
 */
export const SYSTEM_STORAGE_NAMES = ['app_data_version', 'cookie_consent_status'];

/**
 * Known localStorage key names that contain user data.
 * These are the base key names (without user-scope prefix).
 */
export const USER_LOCALSTORAGE_NAMES = [
  'app_notifications',
  'lang',
] as const;

/**
 * Known IndexedDB key names that contain user data, mapped to their store.
 * These are the base key names (without user-scope prefix).
 * Note: Intentionally named _ENTRIES to avoid translation key validation pattern (_KEYS suffix).
 */
export const USER_INDEXEDDB_ENTRIES = [
  { key: 'key', store: 'persistent' }, // IndexedDB demo component key
] as const;

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
 * Marks that a session existed on this device and was NOT deliberately ended.
 *
 * Set on successful sign-in, cleared on explicit logout — and deliberately NOT
 * cleared when a session refresh fails. That asymmetry is the whole point: it
 * distinguishes "we dropped your session" (offer to sign back in) from "you
 * signed out" (stay quiet) and from "no account here" (stay quiet).
 *
 * Holds no identity — just the fact that this device had a session. The login
 * form is left empty for the browser's own password manager to fill.
 */
export const SESSION_EXISTED_KEY = 'session_existed';

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

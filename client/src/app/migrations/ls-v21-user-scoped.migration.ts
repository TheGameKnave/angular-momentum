import type { DataMigration } from './index';
import { STORAGE_PREFIXES, SYSTEM_STORAGE_NAMES } from '@app/constants/storage.constants';

/**
 * Check if a key is a system key that should not be migrated.
 */
function isSystemKey(key: string): boolean {
  return SYSTEM_STORAGE_NAMES.includes(key) || key.startsWith('sb-'); // Supabase auth keys
}

/**
 * Check if a key is already prefixed (user-scoped).
 */
function isPrefixedKey(key: string): boolean {
  return key.startsWith(`${STORAGE_PREFIXES.ANONYMOUS}_`) ||
         key.startsWith(`${STORAGE_PREFIXES.USER}_`);
}

/**
 * Get all unprefixed localStorage keys that need migration.
 * Uses Object.keys() for better testability (localStorage.length can't be mocked).
 */
function getUnprefixedLocalStorageKeys(): string[] {
  return Object.keys(localStorage)
    .filter(key => !isSystemKey(key) && !isPrefixedKey(key));
}

/**
 * Migrate a single localStorage key to user-scoped format.
 */
function migrateLocalStorageKey(key: string): void {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return;

    const newKey = `${STORAGE_PREFIXES.ANONYMOUS}_${key}`;
    // Only migrate if new key doesn't exist (don't overwrite)
    if (localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value);
    }
    // Remove legacy key
    localStorage.removeItem(key);
  } catch {
    // Silently fail - localStorage errors are non-critical
  }
}

/**
 * Migration: v21.0.0 - User-scoped localStorage
 *
 * Before v21, localStorage keys were unprefixed (e.g., 'lang', 'app_notifications').
 * This migration adds user-scoped prefixes (e.g., 'anonymous_lang') to support
 * multi-user scenarios and prepare for authenticated user data separation.
 *
 * Note: IndexedDB key migration is handled separately in idb-v2-user-scoped.migration.ts
 * because IndexedDB has its own versioning system via onupgradeneeded.
 */
export const lsV21UserScopedMigration: DataMigration = {
  version: '21.0.0',
  description: 'Migrate localStorage to user-scoped format',

  migrate: async (): Promise<void> => {
    const localStorageKeys = getUnprefixedLocalStorageKeys();
    for (const key of localStorageKeys) {
      migrateLocalStorageKey(key);
    }
  },
};

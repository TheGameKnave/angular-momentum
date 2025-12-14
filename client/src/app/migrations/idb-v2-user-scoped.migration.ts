import { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import { IndexedDbMigration } from './index';
import { STORAGE_PREFIXES, SYSTEM_STORAGE_NAMES } from '@app/constants/storage.constants';

/**
 * Check if a key is a system key that should not be migrated.
 */
function isSystemKey(key: string): boolean {
  return SYSTEM_STORAGE_NAMES.includes(key) || key.startsWith('sb-');
}

/**
 * Check if a key is already prefixed (user-scoped).
 */
function isPrefixedKey(key: string): boolean {
  return key.startsWith(`${STORAGE_PREFIXES.ANONYMOUS}_`) ||
         key.startsWith(`${STORAGE_PREFIXES.USER}_`);
}

/**
 * IndexedDB Migration: v2 - User-scoped keys
 *
 * Migrates unprefixed keys to anonymous-scoped format.
 * Works in tandem with v21-user-scoped-storage.migration.ts (localStorage).
 */
export const idbV2UserScopedMigration: IndexedDbMigration = {
  version: 2,
  description: 'Migrate keys to user-scoped format',
  migrate: async (
    _db: IDBPDatabase,
    transaction: IDBPTransaction<unknown, StoreNames<unknown>[], 'versionchange'>
  ) => {
    const store = transaction.objectStore('keyval');
    const allKeys = await store.getAllKeys();

    for (const key of allKeys) {
      if (typeof key !== 'string') continue;
      if (isSystemKey(key) || isPrefixedKey(key)) continue;

      // Migrate unprefixed key to anonymous-scoped
      const value = await store.get(key);
      if (value !== undefined) {
        const newKey = `${STORAGE_PREFIXES.ANONYMOUS}_${key}`;
        // Only migrate if new key doesn't exist
        const existing = await store.get(newKey);
        if (existing === undefined) {
          await store.put(value, newKey);
        }
        await store.delete(key);
      }
    }
  },
};

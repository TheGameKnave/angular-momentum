import { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import { IndexedDbMigration } from './index';

/** Store names for the new schema */
const STORES = {
  PERSISTENT: 'persistent',
  SETTINGS: 'settings',
  BACKUPS: 'backups',
  KEYVAL: 'keyval', // Legacy store to migrate from
} as const;

/** Keys that should move to the persistent store */
const PERSISTENT_KEYS = new Set(['key']);

/** Keys that should move to the settings store */
const SETTINGS_KEY_PATTERNS = ['preferences_theme', 'preferences_timezone', 'preferences_language'];

/** Keys that should move to the backups store */
const BACKUP_KEY_PATTERN = 'data_backup';

/**
 * Check if a key should be migrated to the persistent store.
 */
function isPersistentKey(key: string): boolean {
  // Match keys ending with _key (e.g., user_abc123_key, anonymous_key)
  return key.endsWith('_key') || PERSISTENT_KEYS.has(key);
}

/**
 * Check if a key should be migrated to the settings store.
 */
function isSettingsKey(key: string): boolean {
  // Match keys containing preferences_ patterns
  return SETTINGS_KEY_PATTERNS.some(pattern => key.includes(pattern));
}

/**
 * Check if a key should be migrated to the backups store.
 */
function isBackupKey(key: string): boolean {
  return key.endsWith(BACKUP_KEY_PATTERN);
}

/**
 * IndexedDB Migration: v3 - Separate stores for different data types
 *
 * Creates dedicated stores:
 * - `persistent`: For long-term persistent data (like encryption keys)
 * - `settings`: For user preferences (theme, timezone, language)
 * - `backups`: For pre-migration data backups
 *
 * Migrates all existing data from `keyval` to appropriate stores,
 * then deletes the `keyval` store.
 */
export const idbV3SeparateStoresMigration: IndexedDbMigration = {
  version: 3,
  description: 'Create separate stores and remove keyval',
  migrate: async (
    db: IDBPDatabase,
    transaction: IDBPTransaction<unknown, StoreNames<unknown>[], 'versionchange'>
  ) => {
    // Create new stores
    db.createObjectStore(STORES.PERSISTENT);
    db.createObjectStore(STORES.SETTINGS);
    db.createObjectStore(STORES.BACKUPS);

    // Get existing data from keyval
    const keyvalStore = transaction.objectStore(STORES.KEYVAL);
    const allKeys = await keyvalStore.getAllKeys();

    // Migrate data to appropriate stores
    for (const key of allKeys) {
      if (typeof key !== 'string') continue;

      const value = await keyvalStore.get(key);
      if (value === undefined) continue;

      if (isPersistentKey(key)) {
        const persistentStore = transaction.objectStore(STORES.PERSISTENT);
        await persistentStore.put(value, key);
      } else if (isSettingsKey(key)) {
        const settingsStore = transaction.objectStore(STORES.SETTINGS);
        await settingsStore.put(value, key);
      } else if (isBackupKey(key)) {
        const backupsStore = transaction.objectStore(STORES.BACKUPS);
        await backupsStore.put(value, key);
      }
      // Any other keys are discarded - keyval is being deleted
    }

    // Delete the legacy keyval store
    db.deleteObjectStore(STORES.KEYVAL);
  },
};

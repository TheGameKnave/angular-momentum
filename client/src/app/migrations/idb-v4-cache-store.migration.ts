import { IDBPDatabase } from 'idb';
import { IndexedDbMigration } from './index';

/**
 * IndexedDB Migration: v4 - Add cache object store
 *
 * Adds a `cache` store for eviction-resistant fallback storage of critical
 * app data (e.g. last-known API responses) that should survive SW cache eviction.
 */
export const idbV4CacheStoreMigration: IndexedDbMigration = {
  version: 4,
  description: 'Add cache store for offline-resilient app data',
  migrate: (db: IDBPDatabase) => {
    db.createObjectStore('cache');
  },
};

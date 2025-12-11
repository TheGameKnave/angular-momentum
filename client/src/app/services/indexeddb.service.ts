import { Injectable, inject } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { INDEXEDDB_CONFIG } from '@app/constants/ui.constants';
import { INDEXEDDB_SCHEMA_MIGRATIONS, CURRENT_INDEXEDDB_VERSION } from '@app/migrations/indexeddb-schema';
import { UserStorageService } from './user-storage.service';

/**
 * Service for IndexedDB key-value storage operations.
 *
 * Provides a simple key-value store abstraction over IndexedDB,
 * handling database initialization and common CRUD operations.
 * Used for persistent browser-based storage that survives page refreshes.
 *
 * Keys are automatically prefixed with user scope:
 * - Anonymous users: `anonymous_{key}`
 * - Authenticated users: `user_{userId}_{key}`
 *
 * Use `getRaw`/`setRaw` methods for unprefixed access (e.g., for migration).
 */
@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private readonly userStorageService = inject(UserStorageService);
  private readonly storeName = 'keyval';

  /**
   * Promise that resolves to the IndexedDB database instance.
   * Creates the database with a 'keyval' object store if it doesn't exist.
   */
  private readonly dbPromise: Promise<IDBPDatabase> = openDB(
    INDEXEDDB_CONFIG.DB_NAME,
    INDEXEDDB_CONFIG.DB_VERSION,
    {
      /**
       * Callback invoked when the database needs to be created or upgraded.
       * @param db - The database instance to upgrade
       */
      // istanbul ignore next
      upgrade(db) {
        db.createObjectStore('keyval');
      },
    }
  );

  /**
   * Retrieves a value from the key-value store using user-scoped key.
   * @param key - The base key to retrieve (will be prefixed with user scope)
   * @returns Promise that resolves to the stored value, or undefined if not found
   */
  async get(key: string | number): Promise<unknown> {
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return (await this.dbPromise).get(this.storeName, prefixedKey);
  }

  /**
   * Stores a value in the key-value store using user-scoped key.
   * @param key - The base key to store the value under (will be prefixed with user scope)
   * @param val - The value to store
   * @returns Promise that resolves when the value is stored
   */
  async set(key: string | number, val: unknown): Promise<IDBValidKey> {
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return (await this.dbPromise).put(this.storeName, val, prefixedKey);
  }

  /**
   * Deletes a value from the key-value store using user-scoped key.
   * @param key - The base key to delete (will be prefixed with user scope)
   * @returns Promise that resolves when the value is deleted
   */
  async del(key: string | number): Promise<void> {
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return (await this.dbPromise).delete(this.storeName, prefixedKey);
  }

  /**
   * Clears all values from the key-value store for the current user scope.
   * @returns Promise that resolves when all values are cleared
   */
  async clear(): Promise<void> {
    const prefix = this.userStorageService.storagePrefix();
    const allKeys = await this.keys();

    for (const key of allKeys) {
      // Keys in this app are always strings
      if (typeof key === 'string' && key.startsWith(`${prefix}_`)) {
        await (await this.dbPromise).delete(this.storeName, key);
      }
    }
  }

  /**
   * Retrieves all keys from the key-value store (all scopes).
   * @returns Promise that resolves to an array of all keys
   */
  async keys(): Promise<IDBValidKey[]> {
    return (await this.dbPromise).getAllKeys(this.storeName);
  }

  /**
   * Retrieves a value using the exact key provided (no prefixing).
   * Used internally for migration operations.
   * @param key - The exact key to retrieve
   * @returns Promise that resolves to the stored value, or undefined if not found
   */
  async getRaw(key: string | number): Promise<unknown> {
    return (await this.dbPromise).get(this.storeName, key);
  }

  /**
   * Stores a value using the exact key provided (no prefixing).
   * Used internally for migration operations.
   * @param key - The exact key to store the value under
   * @param val - The value to store
   * @returns Promise that resolves when the value is stored
   */
  async setRaw(key: string | number, val: unknown): Promise<IDBValidKey> {
    return (await this.dbPromise).put(this.storeName, val, key);
  }

  /**
   * Deletes a value using the exact key provided (no prefixing).
   * Used internally for migration operations.
   * @param key - The exact key to delete
   * @returns Promise that resolves when the value is deleted
   */
  async delRaw(key: string | number): Promise<void> {
    return (await this.dbPromise).delete(this.storeName, key);
  }
}

import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { INDEXEDDB_CONFIG } from '@app/constants/ui.constants';

/**
 * Service for IndexedDB key-value storage operations.
 *
 * Provides a simple key-value store abstraction over IndexedDB,
 * handling database initialization and common CRUD operations.
 * Used for persistent browser-based storage that survives page refreshes.
 */
@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
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
   * Retrieves a value from the key-value store.
   * @param key - The key to retrieve
   * @returns Promise that resolves to the stored value, or undefined if not found
   */
  async get(key: string | number): Promise<unknown> {
    return (await this.dbPromise).get(this.storeName, key);
  }

  /**
   * Stores a value in the key-value store.
   * @param key - The key to store the value under
   * @param val - The value to store
   * @returns Promise that resolves when the value is stored
   */
  async set(key: string | number, val: unknown): Promise<IDBValidKey> {
    return (await this.dbPromise).put(this.storeName, val, key);
  }

  /**
   * Deletes a value from the key-value store.
   * @param key - The key to delete
   * @returns Promise that resolves when the value is deleted
   */
  async del(key: string | number): Promise<void> {
    return (await this.dbPromise).delete(this.storeName, key);
  }

  /**
   * Clears all values from the key-value store.
   * @returns Promise that resolves when all values are cleared
   */
  async clear(): Promise<void> {
    return (await this.dbPromise).clear(this.storeName);
  }

  /**
   * Retrieves all keys from the key-value store.
   * @returns Promise that resolves to an array of all keys
   */
  async keys(): Promise<IDBValidKey[]> {
    return (await this.dbPromise).getAllKeys(this.storeName);
  }
}

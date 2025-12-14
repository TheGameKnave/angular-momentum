import { Injectable, inject } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { INDEXEDDB_CONFIG } from '@app/constants/ui.constants';
import { INDEXEDDB_MIGRATIONS, CURRENT_INDEXEDDB_VERSION } from '@app/migrations';
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
 *
 * IMPORTANT: Database initialization is lazy. Call `init()` to open the DB
 * and run migrations. DataMigrationService controls when this happens to
 * allow backing up data before migrations run.
 */
@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private readonly userStorageService = inject(UserStorageService);
  private readonly storeName = 'keyval';

  /** The previous database version before any upgrade (0 for new databases) */
  private _previousVersion = 0;

  /** Whether migrations have been run */
  private _migrated = false;

  /** Lazy-initialized database promise */
  private dbPromise: Promise<IDBPDatabase> | null = null;

  /**
   * Get the current version of the existing database WITHOUT triggering migrations.
   * Returns 0 if no database exists.
   */
  // istanbul ignore next - browser integration, tested via e2e
  async getCurrentVersionWithoutMigrating(): Promise<number> {
    const databases = await indexedDB.databases();
    const existing = databases.find(db => db.name === INDEXEDDB_CONFIG.DB_NAME);
    return existing?.version ?? 0;
  }

  /**
   * Check if IDB migrations are needed (current version < target version).
   */
  async needsMigration(): Promise<boolean> {
    const currentVersion = await this.getCurrentVersionWithoutMigrating();
    // New DB (version 0) or outdated version needs migration
    return currentVersion < CURRENT_INDEXEDDB_VERSION;
  }

  /**
   * Open the database at its CURRENT version (no migrations).
   * Used to read data for backup before running migrations.
   * Returns null if database doesn't exist yet.
   */
  async openWithoutMigrating(): Promise<IDBPDatabase | null> {
    const currentVersion = await this.getCurrentVersionWithoutMigrating();
    if (currentVersion === 0) {
      return null; // No existing DB
    }

    // Open at current version - no upgrade will trigger
    // istanbul ignore next - browser integration, tested via e2e
    return openDB(INDEXEDDB_CONFIG.DB_NAME, currentVersion);
  }

  /**
   * Initialize the database and run any pending migrations.
   * Call this AFTER backing up data if migrations are needed.
   */
  // istanbul ignore next - browser integration, tested via e2e
  async init(): Promise<void> {
    if (this.dbPromise) return; // Already initialized

    const previousVersion = await this.getCurrentVersionWithoutMigrating();
    this._previousVersion = previousVersion;

    this.dbPromise = openDB(
      INDEXEDDB_CONFIG.DB_NAME,
      CURRENT_INDEXEDDB_VERSION,
      {
        upgrade: (db, oldVersion, _newVersion, transaction) => {
          this._migrated = oldVersion < CURRENT_INDEXEDDB_VERSION;
          for (const migration of INDEXEDDB_MIGRATIONS) {
            if (oldVersion < migration.version) {
              migration.migrate(db, transaction);
            }
          }
        },
      }
    );

    await this.dbPromise;
  }

  /**
   * Ensure the database is initialized before operations.
   * Auto-initializes if not already done (for backwards compatibility).
   */
  private async getDb(): Promise<IDBPDatabase> {
    // istanbul ignore next - auto-init path for backwards compatibility
    if (!this.dbPromise) {
      await this.init();
    }
    return this.dbPromise!;
  }

  /**
   * Get the database version that existed before migrations ran.
   * Returns 0 for new databases.
   * Must be called after init().
   */
  getPreviousVersion(): number {
    return this._previousVersion;
  }

  /**
   * Check if migrations were run during init().
   */
  wasMigrated(): boolean {
    return this._migrated;
  }

  /**
   * Get the current database version.
   */
  async getVersion(): Promise<number> {
    const db = await this.getDb();
    return db.version;
  }

  /**
   * Retrieves a value from the key-value store using user-scoped key.
   * @param key - The base key to retrieve (will be prefixed with user scope)
   * @returns Promise that resolves to the stored value, or undefined if not found
   */
  async get(key: string | number): Promise<unknown> {
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return (await this.getDb()).get(this.storeName, prefixedKey);
  }

  /**
   * Stores a value in the key-value store using user-scoped key.
   * @param key - The base key to store the value under (will be prefixed with user scope)
   * @param val - The value to store
   * @returns Promise that resolves when the value is stored
   */
  async set(key: string | number, val: unknown): Promise<IDBValidKey> {
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return (await this.getDb()).put(this.storeName, val, prefixedKey);
  }

  /**
   * Deletes a value from the key-value store using user-scoped key.
   * @param key - The base key to delete (will be prefixed with user scope)
   * @returns Promise that resolves when the value is deleted
   */
  async del(key: string | number): Promise<void> {
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return (await this.getDb()).delete(this.storeName, prefixedKey);
  }

  /**
   * Clears all values from the key-value store for the current user scope.
   * @returns Promise that resolves when all values are cleared
   */
  async clear(): Promise<void> {
    const prefix = this.userStorageService.storagePrefix();
    const allKeys = await this.keys();

    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(`${prefix}_`)) {
        await (await this.getDb()).delete(this.storeName, key);
      }
    }
  }

  /**
   * Retrieves all keys from the key-value store (all scopes).
   * @returns Promise that resolves to an array of all keys
   */
  async keys(): Promise<IDBValidKey[]> {
    return (await this.getDb()).getAllKeys(this.storeName);
  }

  /**
   * Retrieves a value using the exact key provided (no prefixing).
   * Used internally for migration operations.
   * @param key - The exact key to retrieve
   * @returns Promise that resolves to the stored value, or undefined if not found
   */
  async getRaw(key: string | number): Promise<unknown> {
    return (await this.getDb()).get(this.storeName, key);
  }

  /**
   * Stores a value using the exact key provided (no prefixing).
   * Used internally for migration operations.
   * @param key - The exact key to store the value under
   * @param val - The value to store
   * @returns Promise that resolves when the value is stored
   */
  async setRaw(key: string | number, val: unknown): Promise<IDBValidKey> {
    return (await this.getDb()).put(this.storeName, val, key);
  }

  /**
   * Deletes a value using the exact key provided (no prefixing).
   * Used internally for migration operations.
   * @param key - The exact key to delete
   * @returns Promise that resolves when the value is deleted
   */
  async delRaw(key: string | number): Promise<void> {
    return (await this.getDb()).delete(this.storeName, key);
  }
}

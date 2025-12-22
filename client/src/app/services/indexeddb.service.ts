import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
/** Available IndexedDB store names */
export const IDB_STORES = {
  /** Persistent data store (encryption keys, etc.) */
  PERSISTENT: 'persistent',
  /** User settings/preferences store */
  SETTINGS: 'settings',
  /** Pre-migration data backups */
  BACKUPS: 'backups',
} as const;

export type IdbStoreName = typeof IDB_STORES[keyof typeof IDB_STORES];

/**
 * Service for managing IndexedDB storage with user-scoped keys and migrations.
 * Provides methods to get, set, and delete values with automatic key prefixing
 * based on the current user context.
 */
@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly userStorageService = inject(UserStorageService);

  /** The previous database version before any upgrade (0 for new databases) */
  private _previousVersion = 0;

  /** Whether migrations have been run */
  private _migrated = false;

  /** Lazy-initialized database promise */
  private dbPromise: Promise<IDBPDatabase> | null = null;

  /**
   * Get the current version of the existing database WITHOUT triggering migrations.
   * Returns 0 if no database exists or if running on the server (SSR).
   */
  // istanbul ignore next - browser integration, tested via e2e
  async getCurrentVersionWithoutMigrating(): Promise<number> {
    if (!this.isBrowser) return 0;
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
   * No-op when running on the server (SSR).
   */
  // istanbul ignore next - browser integration, tested via e2e
  async init(): Promise<void> {
    if (!this.isBrowser) return;
    if (this.dbPromise) return; // Already initialized

    const previousVersion = await this.getCurrentVersionWithoutMigrating();
    this._previousVersion = previousVersion;

    this.dbPromise = openDB(
      INDEXEDDB_CONFIG.DB_NAME,
      CURRENT_INDEXEDDB_VERSION,
      {
        upgrade: (db, oldVersion, _newVersion, transaction) => {
          this._migrated = oldVersion < CURRENT_INDEXEDDB_VERSION;
          // Chain migrations sequentially - idb awaits transaction.done internally
          // Using void to satisfy Sonar (no Promise return from void callback)
          let chain: Promise<void> = Promise.resolve();
          for (const migration of INDEXEDDB_MIGRATIONS) {
            if (oldVersion < migration.version) {
              chain = chain.then(() => migration.migrate(db, transaction) ?? Promise.resolve());
            }
          }
          void chain; // Explicitly discard to satisfy Sonar void return requirement
        },
      }
    );

    await this.dbPromise;
  }

  /**
   * Ensure the database is initialized before operations.
   * Auto-initializes if not already done (for backwards compatibility).
   * Returns null during SSR (no IndexedDB available).
   */
  private async getDb(): Promise<IDBPDatabase | null> {
    // istanbul ignore next - SSR guard, not testable in browser
    if (!this.isBrowser) return null;
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
   * Returns 0 during SSR.
   */
  async getVersion(): Promise<number> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    return db?.version ?? 0;
  }

  /**
   * Retrieves a value from a store using user-scoped key.
   * @param key - The base key to retrieve (will be prefixed with user scope)
   * @param store - The store to use
   * @returns Promise that resolves to the stored value, or undefined if not found (or during SSR)
   */
  async get(key: string | number, store: IdbStoreName): Promise<unknown> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    if (!db) return undefined;
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return db.get(store, prefixedKey);
  }

  /**
   * Stores a value in a store using user-scoped key.
   * @param key - The base key to store the value under (will be prefixed with user scope)
   * @param val - The value to store
   * @param store - The store to use
   * @returns Promise that resolves when the value is stored, or undefined during SSR
   */
  async set(key: string | number, val: unknown, store: IdbStoreName): Promise<IDBValidKey | undefined> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    if (!db) return undefined;
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return db.put(store, val, prefixedKey);
  }

  /**
   * Deletes a value from a store using user-scoped key.
   * @param key - The base key to delete (will be prefixed with user scope)
   * @param store - The store to use
   * @returns Promise that resolves when the value is deleted (no-op during SSR)
   */
  async del(key: string | number, store: IdbStoreName): Promise<void> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    if (!db) return;
    const prefixedKey = this.userStorageService.prefixKey(String(key));
    return db.delete(store, prefixedKey);
  }

  /**
   * Clears all values from a store for the current user scope.
   * @param store - The store to clear
   * @returns Promise that resolves when all values are cleared (no-op during SSR)
   */
  async clear(store: IdbStoreName): Promise<void> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    if (!db) return;
    const prefix = this.userStorageService.storagePrefix();
    const allKeys = await this.keys(store);

    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(`${prefix}_`)) {
        await db.delete(store, key);
      }
    }
  }

  /**
   * Clears all values from ALL stores for the current user scope.
   * @returns Promise that resolves when all values are cleared from all stores
   */
  async clearAll(): Promise<void> {
    const stores: IdbStoreName[] = [IDB_STORES.PERSISTENT, IDB_STORES.SETTINGS, IDB_STORES.BACKUPS];
    for (const store of stores) {
      await this.clear(store);
    }
  }

  /**
   * Retrieves all keys from a store (all scopes).
   * @param store - The store to get keys from
   * @returns Promise that resolves to an array of all keys, or empty array during SSR
   */
  async keys(store: IdbStoreName): Promise<IDBValidKey[]> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    if (!db) return [];
    return db.getAllKeys(store);
  }

  /**
   * Retrieves a value using the exact key provided (no prefixing).
   * Used internally for backup operations.
   * @param key - The exact key to retrieve
   * @param store - The store to use
   * @returns Promise that resolves to the stored value, or undefined if not found (or during SSR)
   */
  async getRaw(key: string | number, store: IdbStoreName): Promise<unknown> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    if (!db) return undefined;
    return db.get(store, key);
  }

  /**
   * Stores a value using the exact key provided (no prefixing).
   * Used internally for backup operations.
   * @param key - The exact key to store the value under
   * @param val - The value to store
   * @param store - The store to use
   * @returns Promise that resolves when the value is stored, or undefined during SSR
   */
  async setRaw(key: string | number, val: unknown, store: IdbStoreName): Promise<IDBValidKey | undefined> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    if (!db) return undefined;
    return db.put(store, val, key);
  }

  /**
   * Deletes a value using the exact key provided (no prefixing).
   * Used internally for backup operations.
   * @param key - The exact key to delete
   * @param store - The store to use
   * @returns Promise that resolves when the value is deleted (no-op during SSR)
   */
  async delRaw(key: string | number, store: IdbStoreName): Promise<void> {
    const db = await this.getDb();
    // istanbul ignore next - SSR guard, not testable in browser
    if (!db) return;
    return db.delete(store, key);
  }
}

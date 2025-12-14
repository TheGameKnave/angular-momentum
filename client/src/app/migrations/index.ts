import { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import { lsV1ExampleMigration } from './ls-v1-example.migration';
import { lsV21UserScopedMigration } from './ls-v21-user-scoped.migration';
import { idbV1InitialMigration } from './idb-v1-initial.migration';
import { idbV2UserScopedMigration } from './idb-v2-user-scoped.migration';

/**
 * All registered localStorage migrations, in version order.
 */
export const LOCALSTORAGE_MIGRATIONS: DataMigration[] = [
  lsV1ExampleMigration,
  lsV21UserScopedMigration,
];

/**
 * All registered IndexedDB migrations, in version order.
 */
export const INDEXEDDB_MIGRATIONS: IndexedDbMigration[] = [
  idbV1InitialMigration,
  idbV2UserScopedMigration,
];

// =============================================================================
// localStorage Migrations
// =============================================================================

/**
 * Interface for a localStorage data migration.
 *
 * Migration triggering is based solely on version comparison:
 * - If app_data_version < migration.version, the migration runs
 * - After migrate(), app_data_version is updated to this version
 *
 * User data is automatically backed up before migrations run (see DataMigrationService).
 */
export interface DataMigration {
  /** Version this migration upgrades TO (e.g., '21.0.0') */
  version: string;

  /** Human-readable description of what this migration does */
  description: string;

  /** Perform the migration (should be idempotent) */
  migrate: () => Promise<void>;
}

// =============================================================================
// IndexedDB Migrations
// =============================================================================

/**
 * Interface for an IndexedDB migration.
 *
 * These run inside the `upgrade` callback during `openDB()`.
 * Version numbers must be positive integers (IndexedDB requirement).
 */
export interface IndexedDbMigration {
  /** Version number (positive integer) */
  version: number;

  /** Human-readable description of the change */
  description: string;

  /**
   * Apply the migration.
   * @param db - Database instance for schema changes (createObjectStore, etc.)
   * @param transaction - Transaction for data operations (get, put, delete)
   */
  migrate: (
    db: IDBPDatabase,
    transaction: IDBPTransaction<unknown, StoreNames<unknown>[], 'versionchange'>
  ) => void | Promise<void>;
}

/**
 * Current IndexedDB version (highest migration version number).
 */
export const CURRENT_INDEXEDDB_VERSION = INDEXEDDB_MIGRATIONS.at(-1)!.version;

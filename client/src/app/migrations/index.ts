import { Type } from '@angular/core';
import { V1ExampleMigration } from './v1-example.migration';
import { V21UserScopedStorageMigration } from './v21-user-scoped-storage.migration';

/**
 * Data Migrations
 *
 * Each migration transforms data from one version to the next.
 * Migrations are applied sequentially in version order.
 *
 * To add a new migration:
 * 1. Create a new file: v{VERSION}-{description}.migration.ts
 * 2. Implement the DataMigration interface
 * 3. Add it to the MIGRATIONS array below (in version order)
 */

/**
 * Interface for a data migration.
 * Each migration transforms data from one version to the next.
 */
export interface DataMigration {
  /** Version this migration upgrades TO (e.g., '21.0.0') */
  version: string;

  /** Human-readable description of what this migration does */
  description: string;

  /** Check if this migration needs to run */
  needsMigration: () => Promise<boolean>;

  /** Perform the migration (should be idempotent) */
  migrate: () => Promise<void>;

  /** Optional: Clean up data when user skips migration */
  discard?: () => Promise<void>;
}

/**
 * All registered migrations, in version order.
 * Add new migrations here.
 */
export const MIGRATIONS: Type<DataMigration>[] = [
  V1ExampleMigration,
  V21UserScopedStorageMigration,
];

export { V1ExampleMigration } from './v1-example.migration';
export { V21UserScopedStorageMigration } from './v21-user-scoped-storage.migration';

import type { DataMigration } from './index';

/**
 * Example Migration: v1.0.0
 *
 * This is a template/example migration demonstrating the structure.
 * It doesn't actually migrate anything - it's here to show the pattern.
 *
 * Real migrations should implement migrate() to transform data.
 * User data is automatically backed up before migrations run (see DataMigrationService).
 *
 * Migration triggering is based on app_data_version comparison:
 * - If app_data_version < migration.version, the migration is pending
 *
 * @see ls-v21-user-scoped.migration.ts for a real migration example
 */
export const lsV1ExampleMigration: DataMigration = {
  version: '1.0.0',
  description: 'Example migration (no-op)',

  // istanbul ignore next - example/template method, never called
  migrate: async (): Promise<void> => {
    // A real migration would transform data here, e.g.:
    // const oldValue = localStorage.getItem('old_key');
    // localStorage.setItem('new_key', transformValue(oldValue));
    // localStorage.removeItem('old_key');
  },
};

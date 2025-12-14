import { ApplicationRef, Injectable, inject } from '@angular/core';
import { take } from 'rxjs';
import { LogService } from './log.service';
import { IndexedDbService } from './indexeddb.service';
import { UserStorageService } from './user-storage.service';
import { LOCALSTORAGE_MIGRATIONS, CURRENT_INDEXEDDB_VERSION } from '@app/migrations';
import type { DataMigration } from '@app/migrations';
import { MessageService } from 'primeng/api';
import { TranslocoService } from '@jsverse/transloco';
import { compareSemver } from '@app/helpers/semver.helper';

/**
 * localStorage key for tracking the last migrated data version.
 */
const LAST_MIGRATED_VERSION_KEY = 'app_data_version';

/**
 * IndexedDB key suffix for storing pre-migration data backup.
 * Full key: `{prefix}_data_backup`
 */
const DATA_BACKUP_KEY = 'data_backup';

/**
 * Structure of the data backup stored before migration.
 */
export interface DataBackup {
  /** Timestamp when backup was created */
  createdAt: string;
  /** localStorage version before migration (app_data_version) */
  localStorageVersion: string | null;
  /** localStorage version after migration */
  localStorageTargetVersion: string;
  /** IndexedDB version before migration (native IDB version) */
  indexedDbVersion: number;
  /** IndexedDB version after migration */
  indexedDbTargetVersion: number;
  /** Backed up localStorage data */
  localStorage: Record<string, string>;
  /** Backed up IndexedDB data */
  indexedDb: Record<string, unknown>;
}

/**
 * Service for managing versioned data migrations.
 *
 * Two independent migration systems:
 * 1. localStorage migrations - tracked by app_data_version in localStorage
 * 2. IndexedDB migrations - tracked by native IDB version (runs during openDB)
 *
 * On app startup (runMigrations):
 * 1. Check if migrations are needed for either system
 * 2. For authenticated users: backup data BEFORE any migrations
 * 3. Run IndexedDB migrations (via indexedDbService.init())
 * 4. Run localStorage migrations
 * 5. Toast shown if either system migrated (for existing users only)
 *
 * Users can download their pre-migration data backup from the Profile page.
 */
@Injectable({
  providedIn: 'root'
})
export class DataMigrationService {
  private readonly logService = inject(LogService);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly userStorageService = inject(UserStorageService);
  private readonly messageService = inject(MessageService);
  private readonly translocoService = inject(TranslocoService);
  private readonly appRef = inject(ApplicationRef);

  /** Registered localStorage migrations, keyed by version */
  private readonly migrations = new Map<string, DataMigration>(
    LOCALSTORAGE_MIGRATIONS.map(migration => [migration.version, migration])
  );

  constructor() {
    this.logService.log(`Registered ${this.migrations.size} localStorage migration(s)`);
  }

  /**
   * Get the last migrated localStorage version.
   * Returns null if no migrations have been recorded (fresh install or pre-migration user).
   */
  getLastMigratedVersion(): string | null {
    // istanbul ignore next - SSR guard, localStorage always exists in browser tests
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(LAST_MIGRATED_VERSION_KEY);
  }

  /**
   * Set the last migrated localStorage version.
   */
  private setLastMigratedVersion(version: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_MIGRATED_VERSION_KEY, version);
    }
  }

  /**
   * Get localStorage migrations that need to run, in version order.
   */
  getPendingMigrations(): DataMigration[] {
    const lastVersion = this.getLastMigratedVersion();

    return Array.from(this.migrations.values())
      .sort((a, b) => compareSemver(a.version, b.version))
      .filter(migration => {
        if (lastVersion && compareSemver(migration.version, lastVersion) <= 0) {
          return false;
        }
        return true;
      });
  }

  /**
   * Run migrations and show appropriate notifications.
   * Called on app startup from AppComponent.ngOnInit.
   *
   * Flow:
   * 1. Check what migrations are needed (without triggering them)
   * 2. Backup for authenticated users BEFORE any migrations
   * 3. Run IndexedDB migrations
   * 4. Run localStorage migrations
   * 5. Show toast for existing users
   */
  async runMigrations(): Promise<void> {
    // istanbul ignore next - SSR guard, localStorage always exists in browser tests
    if (typeof localStorage === 'undefined') {
      return;
    }

    const lastDataVersion = this.getLastMigratedVersion();

    // Check what migrations are needed BEFORE running any
    const idbNeedsMigration = await this.indexedDbService.needsMigration();
    const previousIdbVersion = await this.indexedDbService.getCurrentVersionWithoutMigrating();

    const pending = this.getPendingMigrations();
    const localStorageNeedsMigration = pending.length > 0;

    // Nothing to do if both systems are up to date
    if (!localStorageNeedsMigration && !idbNeedsMigration) {
      // Still need to init IDB for the app to work
      await this.indexedDbService.init();
      this.logService.log('No migrations needed - all storages up to date');
      return;
    }

    // Determine target version for localStorage
    const allMigrations = Array.from(this.migrations.values())
      .sort((a, b) => compareSemver(a.version, b.version));
    const targetVersion = allMigrations.at(-1)?.version ?? null;

    // Backup for authenticated users BEFORE any migrations run
    const isAuthenticated = this.userStorageService.isAuthenticated();
    if (isAuthenticated && (localStorageNeedsMigration || idbNeedsMigration)) {
      await this.backupUserData(lastDataVersion, targetVersion, previousIdbVersion);
    }

    // Run IndexedDB migrations (by initializing at new version)
    await this.indexedDbService.init();
    const idbWasMigrated = this.indexedDbService.wasMigrated();

    // Run localStorage migrations
    for (const migration of pending) {
      this.logService.log(`Running localStorage migration: ${migration.version} - ${migration.description}`);

      try {
        await migration.migrate();
        this.logService.log(`Migration ${migration.version} completed`);
      } catch (error) {
        this.logService.log(`Migration ${migration.version} failed`, error);
        // Continue with other migrations
      }
    }

    // Update localStorage version tracker
    if (targetVersion) {
      this.setLastMigratedVersion(targetVersion);
    }

    // Show toast for existing users when any migration occurred
    // Existing user = had data version set OR had existing IDB (not fresh install)
    const isExistingUser = lastDataVersion !== null || previousIdbVersion > 0;
    const anyMigrationRan = localStorageNeedsMigration || idbWasMigrated;

    if (isExistingUser && anyMigrationRan) {
      this.showMigrationToast(isAuthenticated);
    }
  }

  /**
   * Backup current user data BEFORE any migrations run.
   * Opens IDB at current version (no migrations) to read existing data.
   */
  private async backupUserData(
    fromVersion: string | null,
    toVersion: string | null,
    currentIdbVersion: number
  ): Promise<void> {
    try {
      // Collect localStorage (pre-migration)
      const localStorageData = this.collectLocalStorageData();

      // Collect IndexedDB by opening at CURRENT version (no migrations)
      const indexedDbData = await this.collectIndexedDbDataPreMigration(currentIdbVersion);

      const backup: DataBackup = {
        createdAt: new Date().toISOString(),
        localStorageVersion: fromVersion,
        localStorageTargetVersion: toVersion ?? fromVersion ?? 'unknown',
        indexedDbVersion: currentIdbVersion,
        indexedDbTargetVersion: CURRENT_INDEXEDDB_VERSION,
        localStorage: localStorageData,
        indexedDb: indexedDbData,
      };

      // Store backup - this will trigger init() if not already done
      // but that's OK since we've already collected the pre-migration data
      const backupKey = this.userStorageService.prefixKey(DATA_BACKUP_KEY);
      await this.indexedDbService.setRaw(backupKey, backup);

      this.logService.log('User data backed up before migration', {
        localStorage: Object.keys(backup.localStorage).length,
        indexedDb: Object.keys(backup.indexedDb).length,
      });
    } catch (error) {
      this.logService.log('Failed to backup user data', error);
    }
  }

  /**
   * Collect all localStorage data for the current user scope.
   */
  private collectLocalStorageData(): Record<string, string> {
    const result: Record<string, string> = {};
    const prefix = this.userStorageService.storagePrefix();

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(`${prefix}_`) && !key.endsWith(`_${DATA_BACKUP_KEY}`)) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Collect all IndexedDB data BEFORE migrations run.
   * Opens DB at current version to avoid triggering upgrades.
   */
  private async collectIndexedDbDataPreMigration(currentVersion: number): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    if (currentVersion === 0) {
      return result; // No existing DB
    }

    try {
      const db = await this.indexedDbService.openWithoutMigrating();
      if (!db) return result;

      const allKeys = await db.getAllKeys('keyval');

      for (const key of allKeys) {
        if (typeof key === 'string' && !key.endsWith(`_${DATA_BACKUP_KEY}`)) {
          const value = await db.get('keyval', key);
          if (value !== undefined) {
            result[key] = value;
          }
        }
      }

      db.close();
    } catch (error) {
      this.logService.log('Failed to collect IndexedDB data for backup', error);
    }

    return result;
  }

  /**
   * Show toast notification after migration completes.
   */
  private showMigrationToast(isAuthenticated: boolean): void {
    this.translocoService.selectTranslate<string>('migration.Your data has been updated to a new format.')
      .pipe(take(1))
      .subscribe(summary => {
        const detail = isAuthenticated
          ? this.translocoService.translate('migration.The previous data is available to download from your profile page.')
          : undefined;

        requestAnimationFrame(() => {
          this.messageService.add({
            severity: 'info',
            summary,
            detail,
            life: 8000,
          });
          this.appRef.tick();
        });
      });
  }

  // ============================================================================
  // Data backup access (for Profile page)
  // ============================================================================

  /**
   * Get the pre-migration data backup for the current user.
   * @returns The backup data or null if none exists
   */
  async getDataBackup(): Promise<DataBackup | null> {
    try {
      const backupKey = this.userStorageService.prefixKey(DATA_BACKUP_KEY);
      const backup = await this.indexedDbService.getRaw(backupKey);
      return (backup as DataBackup) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a data backup exists for the current user.
   */
  async hasDataBackup(): Promise<boolean> {
    const backup = await this.getDataBackup();
    return backup !== null;
  }

  /**
   * Delete the data backup for the current user.
   */
  async deleteDataBackup(): Promise<void> {
    const backupKey = this.userStorageService.prefixKey(DATA_BACKUP_KEY);
    await this.indexedDbService.delRaw(backupKey);
    this.logService.log('Data backup deleted');
  }

}

// Re-export types
export { DataMigration } from '@app/migrations';
export { DataBackup as PreMigrationBackup };

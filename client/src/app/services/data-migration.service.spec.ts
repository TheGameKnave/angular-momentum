import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataMigrationService, DataBackup } from './data-migration.service';
import { IndexedDbService } from './indexeddb.service';
import { UserStorageService } from './user-storage.service';
import { LogService } from './log.service';
import { MessageService } from 'primeng/api';
import { TranslocoService } from '@jsverse/transloco';

describe('DataMigrationService', () => {
  let service: DataMigrationService;
  let mockIndexedDbService: jasmine.SpyObj<IndexedDbService>;
  let mockUserStorageService: jasmine.SpyObj<UserStorageService>;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockTranslocoService: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    // Clear real localStorage between tests
    localStorage.clear();

    // Create mock services
    mockIndexedDbService = jasmine.createSpyObj('IndexedDbService', [
      'getRaw', 'setRaw', 'delRaw', 'keys',
      'init', 'needsMigration', 'getCurrentVersionWithoutMigrating',
      'getPreviousVersion', 'wasMigrated', 'getVersion', 'openWithoutMigrating'
    ]);
    mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));
    mockIndexedDbService.setRaw.and.returnValue(Promise.resolve('key'));
    mockIndexedDbService.delRaw.and.returnValue(Promise.resolve());
    mockIndexedDbService.keys.and.returnValue(Promise.resolve([]));
    mockIndexedDbService.init.and.returnValue(Promise.resolve());
    mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(false));
    mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(2));
    mockIndexedDbService.getPreviousVersion.and.returnValue(2);
    mockIndexedDbService.wasMigrated.and.returnValue(false);
    mockIndexedDbService.getVersion.and.returnValue(Promise.resolve(2));
    mockIndexedDbService.openWithoutMigrating.and.returnValue(Promise.resolve(null));

    mockUserStorageService = jasmine.createSpyObj('UserStorageService', ['isAuthenticated', 'storagePrefix', 'prefixKey']);
    mockUserStorageService.isAuthenticated.and.returnValue(false);
    mockUserStorageService.storagePrefix.and.returnValue('anonymous');
    mockUserStorageService.prefixKey.and.callFake((key: string) => `anonymous_${key}`);

    mockLogService = jasmine.createSpyObj('LogService', ['log']);

    mockMessageService = jasmine.createSpyObj('MessageService', ['add']);

    mockTranslocoService = jasmine.createSpyObj('TranslocoService', ['translate', 'selectTranslate']);
    mockTranslocoService.translate.and.callFake(<T>(key: string): T => key as unknown as T);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTranslocoService.selectTranslate.and.callFake((key: string) => of(key) as any);

    TestBed.configureTestingModule({
      providers: [
        DataMigrationService,
        { provide: IndexedDbService, useValue: mockIndexedDbService },
        { provide: UserStorageService, useValue: mockUserStorageService },
        { provide: LogService, useValue: mockLogService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: TranslocoService, useValue: mockTranslocoService },
      ]
    });

    service = TestBed.inject(DataMigrationService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getLastMigratedVersion', () => {
    it('should return null when no version is set', () => {
      expect(service.getLastMigratedVersion()).toBeNull();
    });

    it('should return the stored version', () => {
      localStorage.setItem('app_data_version', '21.0.0');
      expect(service.getLastMigratedVersion()).toBe('21.0.0');
    });
  });

  describe('getPendingMigrations', () => {
    it('should return empty array when all migrations are applied', () => {
      localStorage.setItem('app_data_version', '99.0.0');
      const pending = service.getPendingMigrations();
      expect(pending.length).toBe(0);
    });

    it('should return migrations with version higher than app_data_version', () => {
      localStorage.setItem('app_data_version', '20.0.0');
      const pending = service.getPendingMigrations();

      // Should have at least one pending migration (v21.0.0)
      expect(pending.length).toBeGreaterThan(0);
      // All returned migrations should be > 20.0.0
      for (const m of pending) {
        const [major] = m.version.split('.').map(Number);
        expect(major).toBeGreaterThan(20);
      }
    });

    it('should return all migrations when no version is set', () => {
      const pending = service.getPendingMigrations();
      // Should return at least v21 migration
      expect(pending.length).toBeGreaterThan(0);
    });
  });

  describe('runMigrations', () => {
    beforeEach(() => {
      localStorage.setItem('app_data_version', '20.0.0');
    });

    it('should not run when no migrations are pending', async () => {
      localStorage.setItem('app_data_version', '99.0.0');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(false));

      await service.runMigrations();

      expect(mockIndexedDbService.init).toHaveBeenCalled();
      expect(mockLogService.log).toHaveBeenCalledWith('No migrations needed - all storages up to date');
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });

    it('should run pending migrations and show toast', async () => {
      await service.runMigrations();

      // Should have logged migration running
      expect(mockLogService.log).toHaveBeenCalledWith(
        jasmine.stringMatching(/Running localStorage migration:/)
      );

      // Wait for requestAnimationFrame to fire
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Should show toast notification
      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
        severity: 'info',
        life: 8000,
      }));
    });

    it('should backup data for authenticated users before migrations', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));

      await service.runMigrations();

      // Should have called setRaw to store backup
      expect(mockIndexedDbService.setRaw).toHaveBeenCalledWith(
        'user_123_data_backup',
        jasmine.objectContaining({
          localStorageVersion: '20.0.0',
          indexedDbVersion: 1,
          localStorage: jasmine.any(Object),
          indexedDb: jasmine.any(Object),
        })
      );
    });

    it('should not backup data for anonymous users', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      await service.runMigrations();

      // Should NOT call setRaw for backup (only for migration data)
      expect(mockIndexedDbService.setRaw).not.toHaveBeenCalledWith(
        jasmine.stringMatching(/data_backup/),
        jasmine.anything()
      );
    });

    it('should show toast with profile link message for authenticated users', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));

      await service.runMigrations();

      // Wait for requestAnimationFrame to fire
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
        detail: 'migration.The previous data is available to download from your profile page.',
      }));
    });

    it('should show toast without detail for anonymous users', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      await service.runMigrations();

      // Wait for requestAnimationFrame to fire
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(mockMessageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
        detail: undefined,
      }));
    });

    it('should update app_data_version after migrations', async () => {
      await service.runMigrations();

      const version = localStorage.getItem('app_data_version');
      expect(version).toBeTruthy();
      // Version should be at least 21.0.0
      const [major] = (version || '0').split('.').map(Number);
      expect(major).toBeGreaterThanOrEqual(21);
    });

    it('should continue with other migrations if one fails', async () => {
      // Mock a migration failure by replacing the migrations map
      const migrationsMap = (service as any).migrations as Map<string, any>;
      const v21Migration = migrationsMap.get('21.0.0');

      if (v21Migration) {
        migrationsMap.set('21.0.0', {
          ...v21Migration,
          migrate: jasmine.createSpy('migrate').and.rejectWith(new Error('Migration failed')),
        });
      }

      await service.runMigrations();

      expect(mockLogService.log).toHaveBeenCalledWith(
        jasmine.stringMatching(/Migration .* failed/),
        jasmine.any(Error)
      );

      // Wait for requestAnimationFrame to fire
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Should still complete and show toast
      expect(mockMessageService.add).toHaveBeenCalled();
    });

    it('should show toast when IDB was migrated even if localStorage was up to date', async () => {
      localStorage.setItem('app_data_version', '99.0.0'); // localStorage up to date
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.wasMigrated.and.returnValue(true);
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));

      await service.runMigrations();

      // Wait for requestAnimationFrame to fire
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(mockMessageService.add).toHaveBeenCalled();
    });

    it('should not show toast for brand new users', async () => {
      localStorage.removeItem('app_data_version'); // No previous version
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(0)); // New DB

      await service.runMigrations();

      // Wait for requestAnimationFrame to fire
      await new Promise(resolve => requestAnimationFrame(resolve));

      // New user should not see migration toast
      expect(mockMessageService.add).not.toHaveBeenCalled();
    });
  });

  describe('data backup methods', () => {
    const mockBackup: DataBackup = {
      createdAt: '2025-01-01T00:00:00.000Z',
      localStorageVersion: '20.0.0',
      localStorageTargetVersion: '21.0.0',
      indexedDbVersion: 1,
      indexedDbTargetVersion: 2,
      localStorage: { 'key1': 'value1' },
      indexedDb: { 'key2': 'value2' },
    };

    describe('getDataBackup', () => {
      it('should return null when no backup exists', async () => {
        mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

        const result = await service.getDataBackup();

        expect(result).toBeNull();
      });

      it('should return the backup when it exists', async () => {
        mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(mockBackup));

        const result = await service.getDataBackup();

        expect(result).toEqual(mockBackup);
      });

      it('should return null on error', async () => {
        mockIndexedDbService.getRaw.and.rejectWith(new Error('Read failed'));

        const result = await service.getDataBackup();

        expect(result).toBeNull();
      });
    });

    describe('hasDataBackup', () => {
      it('should return false when no backup exists', async () => {
        mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

        const result = await service.hasDataBackup();

        expect(result).toBeFalse();
      });

      it('should return true when backup exists', async () => {
        mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(mockBackup));

        const result = await service.hasDataBackup();

        expect(result).toBeTrue();
      });
    });

    describe('deleteDataBackup', () => {
      it('should delete the backup', async () => {
        mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');

        await service.deleteDataBackup();

        expect(mockIndexedDbService.delRaw).toHaveBeenCalledWith('user_123_data_backup');
        expect(mockLogService.log).toHaveBeenCalledWith('Data backup deleted');
      });
    });
  });

  describe('version comparison', () => {
    it('should sort migrations in version order', () => {
      localStorage.setItem('app_data_version', '0.0.0');
      const pending = service.getPendingMigrations();

      // Verify migrations are sorted by version (ascending)
      for (let i = 1; i < pending.length; i++) {
        const prevVersion = pending[i - 1].version.split('.').map(Number);
        const currVersion = pending[i].version.split('.').map(Number);

        // Compare major.minor.patch
        const comparison =
          prevVersion[0] < currVersion[0] ||
          (prevVersion[0] === currVersion[0] && prevVersion[1] < currVersion[1]) ||
          (prevVersion[0] === currVersion[0] && prevVersion[1] === currVersion[1] && prevVersion[2] <= currVersion[2]);

        expect(comparison).toBeTrue();
      }
    });
  });

  describe('backup data collection', () => {
    it('should collect localStorage data with correct prefix during backup', async () => {
      // Setup: authenticated user with localStorage data
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.storagePrefix.and.returnValue('user_123');
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));
      mockIndexedDbService.openWithoutMigrating.and.returnValue(Promise.resolve(null));

      // Add some localStorage data for the user
      localStorage.setItem('user_123_lang', 'es');
      localStorage.setItem('user_123_theme', 'dark');
      localStorage.setItem('other_key', 'should not be included');
      localStorage.setItem('user_123_data_backup', 'should be excluded');

      await service.runMigrations();

      // Verify backup was stored with collected localStorage
      expect(mockIndexedDbService.setRaw).toHaveBeenCalledWith(
        'user_123_data_backup',
        jasmine.objectContaining({
          localStorage: jasmine.objectContaining({
            'user_123_lang': 'es',
            'user_123_theme': 'dark',
          }),
        })
      );

      // Should not include other keys or backup key
      const backupCall = mockIndexedDbService.setRaw.calls.mostRecent();
      const backupData = backupCall.args[1] as DataBackup;
      expect(backupData.localStorage['other_key']).toBeUndefined();
      expect(backupData.localStorage['user_123_data_backup']).toBeUndefined();
    });

    it('should collect IndexedDB data when DB exists', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.storagePrefix.and.returnValue('user_123');
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));

      // Mock the DB with getAllKeys and get methods
      const mockDb = {
        getAllKeys: jasmine.createSpy('getAllKeys').and.returnValue(Promise.resolve(['user_123_settings', 'user_123_data_backup'])),
        get: jasmine.createSpy('get').and.callFake((_store: string, key: string) => {
          if (key === 'user_123_settings') return Promise.resolve({ theme: 'dark' });
          return Promise.resolve(undefined);
        }),
        close: jasmine.createSpy('close'),
      };
      mockIndexedDbService.openWithoutMigrating.and.returnValue(Promise.resolve(mockDb as any));

      await service.runMigrations();

      // Verify DB was opened and closed
      expect(mockDb.getAllKeys).toHaveBeenCalledWith('keyval');
      expect(mockDb.get).toHaveBeenCalledWith('keyval', 'user_123_settings');
      expect(mockDb.close).toHaveBeenCalled();

      // Verify IndexedDB data was collected (excluding backup key)
      const backupCall = mockIndexedDbService.setRaw.calls.mostRecent();
      const backupData = backupCall.args[1] as DataBackup;
      expect(backupData.indexedDb['user_123_settings']).toEqual({ theme: 'dark' });
      expect(backupData.indexedDb['user_123_data_backup']).toBeUndefined();
    });

    it('should skip IndexedDB collection when version is 0', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.storagePrefix.and.returnValue('user_123');
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(0)); // New DB

      await service.runMigrations();

      // Should not open DB at version 0
      expect(mockIndexedDbService.openWithoutMigrating).not.toHaveBeenCalled();

      // Backup should have empty indexedDb
      const backupCall = mockIndexedDbService.setRaw.calls.mostRecent();
      const backupData = backupCall.args[1] as DataBackup;
      expect(backupData.indexedDb).toEqual({});
    });

    it('should handle IndexedDB collection errors gracefully', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.storagePrefix.and.returnValue('user_123');
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));
      mockIndexedDbService.openWithoutMigrating.and.rejectWith(new Error('DB open failed'));

      await service.runMigrations();

      expect(mockLogService.log).toHaveBeenCalledWith('Failed to collect IndexedDB data for backup', jasmine.any(Error));

      // Should still save backup with empty indexedDb
      expect(mockIndexedDbService.setRaw).toHaveBeenCalled();
    });

    it('should handle backup save errors gracefully', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.storagePrefix.and.returnValue('user_123');
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));
      mockIndexedDbService.openWithoutMigrating.and.returnValue(Promise.resolve(null));
      mockIndexedDbService.setRaw.and.rejectWith(new Error('Write failed'));

      await service.runMigrations();

      expect(mockLogService.log).toHaveBeenCalledWith('Failed to backup user data', jasmine.any(Error));

      // Migration should still complete (init still called)
      expect(mockIndexedDbService.init).toHaveBeenCalled();
    });

    it('should skip non-string keys during IndexedDB collection', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.storagePrefix.and.returnValue('user_123');
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));

      // Mock DB with mixed key types
      const mockDb = {
        getAllKeys: jasmine.createSpy('getAllKeys').and.returnValue(Promise.resolve([123, 'user_123_settings'])),
        get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ value: 'test' })),
        close: jasmine.createSpy('close'),
      };
      mockIndexedDbService.openWithoutMigrating.and.returnValue(Promise.resolve(mockDb as any));

      await service.runMigrations();

      // Should only get string keys
      expect(mockDb.get).toHaveBeenCalledTimes(1);
      expect(mockDb.get).toHaveBeenCalledWith('keyval', 'user_123_settings');
    });

    it('should use unknown when both fromVersion and toVersion are null', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.storagePrefix.and.returnValue('user_123');
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));
      mockIndexedDbService.openWithoutMigrating.and.returnValue(Promise.resolve(null));

      // Clear the migrations map to make targetVersion null
      (service as any).migrations.clear();

      // Don't set app_data_version to make lastDataVersion null
      localStorage.removeItem('app_data_version');

      await service.runMigrations();

      // Verify backup was stored with 'unknown' as target version
      const backupCall = mockIndexedDbService.setRaw.calls.mostRecent();
      const backupData = backupCall.args[1] as DataBackup;
      expect(backupData.localStorageTargetVersion).toBe('unknown');
    });

    it('should use fromVersion when toVersion is null but fromVersion exists', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.storagePrefix.and.returnValue('user_123');
      mockUserStorageService.prefixKey.and.returnValue('user_123_data_backup');
      mockIndexedDbService.needsMigration.and.returnValue(Promise.resolve(true));
      mockIndexedDbService.getCurrentVersionWithoutMigrating.and.returnValue(Promise.resolve(1));
      mockIndexedDbService.openWithoutMigrating.and.returnValue(Promise.resolve(null));

      // Clear the migrations map to make targetVersion null
      (service as any).migrations.clear();

      // Set a valid fromVersion
      localStorage.setItem('app_data_version', '20.0.0');

      await service.runMigrations();

      // Verify backup was stored with fromVersion as target version
      const backupCall = mockIndexedDbService.setRaw.calls.mostRecent();
      const backupData = backupCall.args[1] as DataBackup;
      expect(backupData.localStorageTargetVersion).toBe('20.0.0');
    });
  });
});

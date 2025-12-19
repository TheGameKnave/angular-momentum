import { idbV1InitialMigration } from './idb-v1-initial.migration';
import { idbV2UserScopedMigration } from './idb-v2-user-scoped.migration';
import { idbV3SeparateStoresMigration } from './idb-v3-separate-stores.migration';

describe('IndexedDB Migrations', () => {
  describe('idbV1InitialMigration', () => {
    it('should have version 1', () => {
      expect(idbV1InitialMigration.version).toBe(1);
    });

    it('should have a description', () => {
      expect(idbV1InitialMigration.description).toBe('Initial schema - create keyval store');
    });

    it('should create keyval object store', () => {
      const mockDb = {
        createObjectStore: jasmine.createSpy('createObjectStore'),
      };

      idbV1InitialMigration.migrate(mockDb as any, undefined as any);

      expect(mockDb.createObjectStore).toHaveBeenCalledWith('keyval');
    });
  });

  describe('idbV2UserScopedMigration', () => {
    let mockStore: Map<string, unknown>;
    let mockTransaction: any;

    beforeEach(() => {
      mockStore = new Map();

      mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue({
          getAllKeys: jasmine.createSpy('getAllKeys').and.callFake(() =>
            Promise.resolve(Array.from(mockStore.keys()))
          ),
          get: jasmine.createSpy('get').and.callFake((key: string) =>
            Promise.resolve(mockStore.get(key))
          ),
          put: jasmine.createSpy('put').and.callFake((value: unknown, key: string) => {
            mockStore.set(key, value);
            return Promise.resolve();
          }),
          delete: jasmine.createSpy('delete').and.callFake((key: string) => {
            mockStore.delete(key);
            return Promise.resolve();
          }),
        }),
      };
    });

    it('should have version 2', () => {
      expect(idbV2UserScopedMigration.version).toBe(2);
    });

    it('should have a description', () => {
      expect(idbV2UserScopedMigration.description).toBe('Migrate keys to user-scoped format');
    });

    it('should migrate unprefixed keys to anonymous scope', async () => {
      mockStore.set('lang', 'en');
      mockStore.set('theme', 'dark');

      await idbV2UserScopedMigration.migrate({} as any, mockTransaction);

      // Original keys should be deleted
      expect(mockStore.has('lang')).toBeFalse();
      expect(mockStore.has('theme')).toBeFalse();

      // New anonymous-prefixed keys should exist
      expect(mockStore.get('anonymous_lang')).toBe('en');
      expect(mockStore.get('anonymous_theme')).toBe('dark');
    });

    it('should skip system keys', async () => {
      mockStore.set('app_data_version', '21.0.0');
      mockStore.set('cookie_consent_status', 'accepted');

      await idbV2UserScopedMigration.migrate({} as any, mockTransaction);

      // System keys should remain unchanged
      expect(mockStore.get('app_data_version')).toBe('21.0.0');
      expect(mockStore.get('cookie_consent_status')).toBe('accepted');

      // Should NOT have anonymous-prefixed versions
      expect(mockStore.has('anonymous_app_data_version')).toBeFalse();
    });

    it('should skip Supabase auth keys (sb-* prefix)', async () => {
      mockStore.set('sb-auth-token', 'token123');
      mockStore.set('sb-refresh-token', 'refresh456');

      await idbV2UserScopedMigration.migrate({} as any, mockTransaction);

      // Supabase keys should remain unchanged
      expect(mockStore.get('sb-auth-token')).toBe('token123');
      expect(mockStore.get('sb-refresh-token')).toBe('refresh456');
    });

    it('should skip already prefixed keys', async () => {
      mockStore.set('anonymous_existing', 'value1');
      mockStore.set('user_123_data', 'value2');

      await idbV2UserScopedMigration.migrate({} as any, mockTransaction);

      // Already prefixed keys should remain unchanged
      expect(mockStore.get('anonymous_existing')).toBe('value1');
      expect(mockStore.get('user_123_data')).toBe('value2');

      // Should NOT have double-prefixed versions
      expect(mockStore.has('anonymous_anonymous_existing')).toBeFalse();
    });

    it('should not overwrite existing anonymous key', async () => {
      mockStore.set('lang', 'es'); // Unprefixed
      mockStore.set('anonymous_lang', 'fr'); // Already exists at target

      await idbV2UserScopedMigration.migrate({} as any, mockTransaction);

      // Existing anonymous key should NOT be overwritten
      expect(mockStore.get('anonymous_lang')).toBe('fr');

      // Original unprefixed key should be deleted
      expect(mockStore.has('lang')).toBeFalse();
    });

    it('should skip non-string keys', async () => {
      // Add a numeric key (unusual but possible in IDB)
      (mockStore as any).set(123, 'numeric value');

      // Override getAllKeys to return mixed types
      mockTransaction.objectStore().getAllKeys.and.returnValue(
        Promise.resolve([123, 'normalKey'])
      );
      mockStore.set('normalKey', 'normal value');

      await idbV2UserScopedMigration.migrate({} as any, mockTransaction);

      // Numeric key should be ignored
      expect((mockStore as any).get(123)).toBe('numeric value');

      // String key should be migrated
      expect(mockStore.get('anonymous_normalKey')).toBe('normal value');
    });

    it('should skip keys with undefined values (no migration or deletion)', async () => {
      mockStore.set('emptyKey', undefined);

      await idbV2UserScopedMigration.migrate({} as any, mockTransaction);

      // Key with undefined value - the code checks `if (value !== undefined)` and skips
      // the entire block including the delete, so the key remains in place
      expect(mockStore.has('emptyKey')).toBeTrue();
      expect(mockStore.has('anonymous_emptyKey')).toBeFalse();
    });
  });

  describe('idbV3SeparateStoresMigration', () => {
    let keyvalStore: Map<string, unknown>;
    let persistentStore: Map<string, unknown>;
    let settingsStore: Map<string, unknown>;
    let backupsStore: Map<string, unknown>;
    let mockDb: any;
    let mockTransaction: any;

    beforeEach(() => {
      keyvalStore = new Map();
      persistentStore = new Map();
      settingsStore = new Map();
      backupsStore = new Map();

      const createStoreMock = (store: Map<string, unknown>) => ({
        getAllKeys: jasmine.createSpy('getAllKeys').and.callFake(() =>
          Promise.resolve(Array.from(store.keys()))
        ),
        get: jasmine.createSpy('get').and.callFake((key: string) =>
          Promise.resolve(store.get(key))
        ),
        put: jasmine.createSpy('put').and.callFake((value: unknown, key: string) => {
          store.set(key, value);
          return Promise.resolve();
        }),
      });

      mockDb = {
        createObjectStore: jasmine.createSpy('createObjectStore'),
        deleteObjectStore: jasmine.createSpy('deleteObjectStore'),
      };

      mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.callFake((storeName: string) => {
          switch (storeName) {
            case 'keyval':
              return createStoreMock(keyvalStore);
            case 'persistent':
              return createStoreMock(persistentStore);
            case 'settings':
              return createStoreMock(settingsStore);
            case 'backups':
              return createStoreMock(backupsStore);
            default:
              throw new Error(`Unknown store: ${storeName}`);
          }
        }),
      };
    });

    it('should have version 3', () => {
      expect(idbV3SeparateStoresMigration.version).toBe(3);
    });

    it('should have a description', () => {
      expect(idbV3SeparateStoresMigration.description).toBe('Create separate stores and remove keyval');
    });

    it('should create new stores and delete keyval', async () => {
      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      expect(mockDb.createObjectStore).toHaveBeenCalledWith('persistent');
      expect(mockDb.createObjectStore).toHaveBeenCalledWith('settings');
      expect(mockDb.createObjectStore).toHaveBeenCalledWith('backups');
      expect(mockDb.deleteObjectStore).toHaveBeenCalledWith('keyval');
    });

    it('should migrate keys ending with _key to persistent store', async () => {
      keyvalStore.set('anonymous_key', 'encryption-key-value');
      keyvalStore.set('user_123_key', 'user-key-value');

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      expect(persistentStore.get('anonymous_key')).toBe('encryption-key-value');
      expect(persistentStore.get('user_123_key')).toBe('user-key-value');
    });

    it('should migrate keys in PERSISTENT_KEYS set to persistent store', async () => {
      keyvalStore.set('key', 'direct-key-value');

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      expect(persistentStore.get('key')).toBe('direct-key-value');
    });

    it('should migrate preferences_theme keys to settings store', async () => {
      keyvalStore.set('anonymous_preferences_theme', 'dark');
      keyvalStore.set('user_123_preferences_theme', 'light');

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      expect(settingsStore.get('anonymous_preferences_theme')).toBe('dark');
      expect(settingsStore.get('user_123_preferences_theme')).toBe('light');
    });

    it('should migrate preferences_timezone keys to settings store', async () => {
      keyvalStore.set('anonymous_preferences_timezone', 'America/New_York');

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      expect(settingsStore.get('anonymous_preferences_timezone')).toBe('America/New_York');
    });

    it('should migrate preferences_language keys to settings store', async () => {
      keyvalStore.set('anonymous_preferences_language', 'es');

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      expect(settingsStore.get('anonymous_preferences_language')).toBe('es');
    });

    it('should migrate data_backup keys to backups store', async () => {
      keyvalStore.set('anonymous_data_backup', { backup: 'data' });
      keyvalStore.set('user_123_data_backup', { user: 'backup' });

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      expect(backupsStore.get('anonymous_data_backup')).toEqual({ backup: 'data' });
      expect(backupsStore.get('user_123_data_backup')).toEqual({ user: 'backup' });
    });

    it('should discard keys that do not match any pattern', async () => {
      keyvalStore.set('random_data', 'random-value');
      keyvalStore.set('other_info', 'other-value');

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      // These keys should not be migrated to any store (don't match _key, preferences_, or _data_backup patterns)
      expect(persistentStore.has('random_data')).toBeFalse();
      expect(settingsStore.has('random_data')).toBeFalse();
      expect(backupsStore.has('random_data')).toBeFalse();
    });

    it('should skip non-string keys', async () => {
      // Add numeric key (unusual but possible)
      (keyvalStore as any).set(123, 'numeric-value');

      // Override getAllKeys to return the numeric key
      const keyvalStoreMock = mockTransaction.objectStore('keyval');
      keyvalStoreMock.getAllKeys.and.returnValue(Promise.resolve([123]));

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      // Numeric keys should be skipped
      expect(persistentStore.size).toBe(0);
      expect(settingsStore.size).toBe(0);
      expect(backupsStore.size).toBe(0);
    });

    it('should skip keys with undefined values', async () => {
      keyvalStore.set('anonymous_key', undefined);

      await idbV3SeparateStoresMigration.migrate(mockDb, mockTransaction);

      // Key with undefined value should not be migrated
      expect(persistentStore.has('anonymous_key')).toBeFalse();
    });
  });
});

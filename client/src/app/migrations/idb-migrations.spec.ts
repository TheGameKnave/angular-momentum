import { idbV1InitialMigration } from './idb-v1-initial.migration';
import { idbV2UserScopedMigration } from './idb-v2-user-scoped.migration';

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
});

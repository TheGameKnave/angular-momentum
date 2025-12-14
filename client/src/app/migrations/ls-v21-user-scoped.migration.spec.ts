import { lsV21UserScopedMigration } from './ls-v21-user-scoped.migration';
import { STORAGE_PREFIXES } from '@app/constants/storage.constants';

describe('lsV21UserScopedMigration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should have correct version', () => {
    expect(lsV21UserScopedMigration.version).toBe('21.0.0');
  });

  it('should have correct description', () => {
    expect(lsV21UserScopedMigration.description).toBe('Migrate localStorage to user-scoped format');
  });

  describe('migrate', () => {
    it('should migrate unprefixed localStorage data to anonymous prefix', async () => {
      localStorage.setItem('app_notifications', '[{"id":"1"}]');
      localStorage.setItem('lang', 'es');
      localStorage.setItem('custom_key', 'custom_value');

      await lsV21UserScopedMigration.migrate();

      expect(localStorage.getItem(`${STORAGE_PREFIXES.ANONYMOUS}_app_notifications`)).toBe('[{"id":"1"}]');
      expect(localStorage.getItem(`${STORAGE_PREFIXES.ANONYMOUS}_lang`)).toBe('es');
      expect(localStorage.getItem(`${STORAGE_PREFIXES.ANONYMOUS}_custom_key`)).toBe('custom_value');
      // Legacy keys should be removed
      expect(localStorage.getItem('app_notifications')).toBeNull();
      expect(localStorage.getItem('lang')).toBeNull();
      expect(localStorage.getItem('custom_key')).toBeNull();
    });

    it('should not migrate system keys', async () => {
      localStorage.setItem('app_data_version', '21.0.0');
      localStorage.setItem('cookie_consent_status', 'accepted');
      localStorage.setItem('sb-auth-token', 'token');
      localStorage.setItem('my_user_data', 'should_migrate');

      await lsV21UserScopedMigration.migrate();

      // System keys should remain unchanged
      expect(localStorage.getItem('app_data_version')).toBe('21.0.0');
      expect(localStorage.getItem('cookie_consent_status')).toBe('accepted');
      expect(localStorage.getItem('sb-auth-token')).toBe('token');
      // Non-system key should be migrated
      expect(localStorage.getItem(`${STORAGE_PREFIXES.ANONYMOUS}_my_user_data`)).toBe('should_migrate');
      expect(localStorage.getItem('my_user_data')).toBeNull();
    });

    it('should not migrate already prefixed keys', async () => {
      localStorage.setItem(`${STORAGE_PREFIXES.ANONYMOUS}_existing`, 'value');
      localStorage.setItem(`${STORAGE_PREFIXES.USER}_123_data`, 'user_value');

      await lsV21UserScopedMigration.migrate();

      // Already prefixed keys should remain unchanged
      expect(localStorage.getItem(`${STORAGE_PREFIXES.ANONYMOUS}_existing`)).toBe('value');
      expect(localStorage.getItem(`${STORAGE_PREFIXES.USER}_123_data`)).toBe('user_value');
    });

    it('should not overwrite existing prefixed localStorage data', async () => {
      localStorage.setItem('app_notifications', '[{"id":"1"}]');
      localStorage.setItem(`${STORAGE_PREFIXES.ANONYMOUS}_app_notifications`, '[{"id":"2"}]');

      await lsV21UserScopedMigration.migrate();

      // Existing prefixed data should be preserved
      expect(localStorage.getItem(`${STORAGE_PREFIXES.ANONYMOUS}_app_notifications`)).toBe('[{"id":"2"}]');
      // Legacy key should still be removed
      expect(localStorage.getItem('app_notifications')).toBeNull();
    });

    it('should handle empty localStorage gracefully', async () => {
      await expectAsync(lsV21UserScopedMigration.migrate()).toBeResolved();
    });

    it('should handle key with null value (race condition)', async () => {
      // Simulate a race condition where key exists in Object.keys() but getItem returns null
      localStorage.setItem('race_key', 'value');

      // Spy on getItem to return null for this specific key (simulating deletion between enumeration and get)
      const originalGetItem = localStorage.getItem.bind(localStorage);
      spyOn(localStorage, 'getItem').and.callFake((key: string) => {
        if (key === 'race_key') return null;
        return originalGetItem(key);
      });

      await lsV21UserScopedMigration.migrate();

      // Should not create anonymous key for null value
      expect(localStorage.getItem(`${STORAGE_PREFIXES.ANONYMOUS}_race_key`)).toBeNull();
    });
  });
});

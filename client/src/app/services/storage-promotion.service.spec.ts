import { TestBed } from '@angular/core/testing';
import { StoragePromotionService } from './storage-promotion.service';
import { UserStorageService } from './user-storage.service';
import { STORAGE_PREFIXES } from '@app/constants/storage.constants';
import { IndexedDbService } from './indexeddb.service';
import { LogService } from './log.service';
import { PROMOTABLE_LOCALSTORAGE_NAMES } from '../constants/ui.constants';

describe('StoragePromotionService', () => {
  let service: StoragePromotionService;
  let mockUserStorageService: jasmine.SpyObj<UserStorageService>;
  let mockIndexedDbService: jasmine.SpyObj<IndexedDbService>;
  let mockLogService: jasmine.SpyObj<LogService>;

  beforeEach(() => {
    mockUserStorageService = jasmine.createSpyObj('UserStorageService', [
      'prefixKeyForAnonymous',
      'prefixKeyForUser',
    ]);
    mockIndexedDbService = jasmine.createSpyObj('IndexedDbService', [
      'keys',
      'getRaw',
      'setRaw',
      'delRaw',
    ]);
    mockLogService = jasmine.createSpyObj('LogService', ['log']);

    // Default implementations
    mockUserStorageService.prefixKeyForAnonymous.and.callFake((key: string) => `anonymous_${key}`);
    mockUserStorageService.prefixKeyForUser.and.callFake((userId: string, key: string) => `user_${userId}_${key}`);
    mockIndexedDbService.keys.and.returnValue(Promise.resolve([]));

    TestBed.configureTestingModule({
      providers: [
        StoragePromotionService,
        { provide: UserStorageService, useValue: mockUserStorageService },
        { provide: IndexedDbService, useValue: mockIndexedDbService },
        { provide: LogService, useValue: mockLogService },
      ],
    });

    service = TestBed.inject(StoragePromotionService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('PROMOTABLE_LOCALSTORAGE_NAMES', () => {
    it('should include app_notifications', () => {
      expect(PROMOTABLE_LOCALSTORAGE_NAMES).toContain('app_notifications');
    });

    it('should include lang', () => {
      expect(PROMOTABLE_LOCALSTORAGE_NAMES).toContain('lang');
    });
  });

  describe('promoteAnonymousToUser', () => {
    it('should promote localStorage and IndexedDB data', async () => {
      // Setup anonymous data in localStorage
      localStorage.setItem('anonymous_lang', 'es');

      await service.promoteAnonymousToUser('user-123');

      expect(localStorage.getItem('user_user-123_lang')).toBe('es');
      expect(mockLogService.log).toHaveBeenCalledWith('Starting storage promotion to user', 'user-123');
      expect(mockLogService.log).toHaveBeenCalledWith('Storage promotion completed successfully');
    });

    it('should clear anonymous storage after promotion', async () => {
      localStorage.setItem('anonymous_lang', 'fr');

      await service.promoteAnonymousToUser('user-456');

      expect(localStorage.getItem('anonymous_lang')).toBeNull();
    });

    it('should handle errors gracefully without throwing', async () => {
      // Simulate a failure during localStorage promotion by making prefixKeyForAnonymous throw
      mockUserStorageService.prefixKeyForAnonymous.and.throwError('Service error');

      // Should not throw
      await expectAsync(service.promoteAnonymousToUser('user-789')).toBeResolved();
      expect(mockLogService.log).toHaveBeenCalledWith('Storage promotion failed', jasmine.any(Error));
    });
  });

  describe('promoteLocalStorage', () => {
    it('should skip keys with no anonymous data', async () => {
      // No anonymous data set
      await service.promoteAnonymousToUser('user-123');

      expect(localStorage.getItem('user_user-123_lang')).toBeNull();
    });

    it('should merge notifications when both anonymous and user data exist', async () => {
      const anonymousNotifications = [
        { id: 'notif-1', title: 'Anonymous Notif' },
        { id: 'notif-2', title: 'Another Anonymous' },
      ];
      const userNotifications = [
        { id: 'notif-1', title: 'User Notif' }, // Duplicate ID
        { id: 'notif-3', title: 'User Only' },
      ];

      localStorage.setItem('anonymous_app_notifications', JSON.stringify(anonymousNotifications));
      localStorage.setItem('user_user-123_app_notifications', JSON.stringify(userNotifications));

      await service.promoteAnonymousToUser('user-123');

      const result = JSON.parse(localStorage.getItem('user_user-123_app_notifications')!);
      // Should have user notifications plus only non-duplicate anonymous ones
      expect(result.length).toBe(3); // notif-1 (user), notif-3 (user), notif-2 (anon)
      expect(result.find((n: any) => n.id === 'notif-1').title).toBe('User Notif'); // User wins
      expect(result.find((n: any) => n.id === 'notif-2').title).toBe('Another Anonymous');
    });

    it('should use anonymous notifications when no user notifications exist', async () => {
      const anonymousNotifications = [{ id: 'notif-1', title: 'Anonymous' }];
      localStorage.setItem('anonymous_app_notifications', JSON.stringify(anonymousNotifications));

      await service.promoteAnonymousToUser('user-123');

      const result = JSON.parse(localStorage.getItem('user_user-123_app_notifications')!);
      expect(result).toEqual(anonymousNotifications);
    });

    it('should skip non-notification keys when user data exists', async () => {
      localStorage.setItem('anonymous_lang', 'es');
      localStorage.setItem('user_user-123_lang', 'fr');

      await service.promoteAnonymousToUser('user-123');

      // User data should win - lang should still be 'fr'
      expect(localStorage.getItem('user_user-123_lang')).toBe('fr');
      expect(mockLogService.log).toHaveBeenCalledWith('Skipped lang promotion - user data exists');
    });

    it('should promote non-notification keys when no user data exists', async () => {
      localStorage.setItem('anonymous_lang', 'de');

      await service.promoteAnonymousToUser('user-123');

      expect(localStorage.getItem('user_user-123_lang')).toBe('de');
      expect(mockLogService.log).toHaveBeenCalledWith('Promoted lang to user_user-123_lang');
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorage.setItem('anonymous_lang', 'en');

      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      spyOn(localStorage, 'setItem').and.callFake((key: string) => {
        if (key.startsWith('user_')) {
          throw new Error('Storage quota exceeded');
        }
        originalSetItem.call(localStorage, key, 'en');
      });

      await service.promoteAnonymousToUser('user-123');

      expect(mockLogService.log).toHaveBeenCalledWith(
        'Failed to promote localStorage key: lang',
        jasmine.any(Error)
      );
    });
  });

  describe('mergeNotifications', () => {
    it('should handle invalid JSON in anonymous data', async () => {
      localStorage.setItem('anonymous_app_notifications', 'invalid json');
      localStorage.setItem('user_user-123_app_notifications', JSON.stringify([{ id: '1' }]));

      await service.promoteAnonymousToUser('user-123');

      // Should prefer user data on error
      const result = JSON.parse(localStorage.getItem('user_user-123_app_notifications')!);
      expect(result).toEqual([{ id: '1' }]);
    });

    it('should use anonymous data when user data is invalid and no fallback', async () => {
      const anonymousData = JSON.stringify([{ id: 'anon-1' }]);
      localStorage.setItem('anonymous_app_notifications', anonymousData);
      localStorage.setItem('user_user-123_app_notifications', 'invalid');

      await service.promoteAnonymousToUser('user-123');

      // On parse error, should fall back to user data (even if invalid string)
      expect(localStorage.getItem('user_user-123_app_notifications')).toBe('invalid');
    });

    it('should fall back to anonymous data on error when user data is null', async () => {
      // Set invalid JSON that will cause a parse error, with no user data
      localStorage.setItem('anonymous_app_notifications', 'invalid json');
      // No user data - userJson will be null

      await service.promoteAnonymousToUser('user-123');

      // On parse error with null userJson, falls back to anonymousJson
      expect(localStorage.getItem('user_user-123_app_notifications')).toBe('invalid json');
      expect(mockLogService.log).toHaveBeenCalledWith('Failed to merge notifications', jasmine.any(Error));
    });
  });

  describe('promoteIndexedDb', () => {
    it('should promote anonymous IndexedDB keys to user scope', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_data', 'other_key']));
      mockIndexedDbService.getRaw.and.callFake((key: string) => {
        if (key === 'anonymous_data') return Promise.resolve('some value');
        return Promise.resolve(undefined);
      });
      mockIndexedDbService.setRaw.and.returnValue(Promise.resolve('key'));

      await service.promoteAnonymousToUser('user-123');

      expect(mockIndexedDbService.setRaw).toHaveBeenCalledWith(
        `${STORAGE_PREFIXES.USER}_user-123_data`,
        'some value'
      );
    });

    it('should skip non-anonymous keys', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['other_key', 'user_456_data']));

      await service.promoteAnonymousToUser('user-123');

      expect(mockIndexedDbService.getRaw).not.toHaveBeenCalled();
    });

    it('should skip empty anonymous data', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_empty']));
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

      await service.promoteAnonymousToUser('user-123');

      expect(mockIndexedDbService.setRaw).not.toHaveBeenCalled();
      expect(mockLogService.log).toHaveBeenCalledWith('Skipped empty IndexedDB key empty');
    });

    it('should skip when empty string anonymous data', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_emptystr']));
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(''));

      await service.promoteAnonymousToUser('user-123');

      expect(mockIndexedDbService.setRaw).not.toHaveBeenCalled();
    });

    it('should skip when null anonymous data', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_nulldata']));
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(null));

      await service.promoteAnonymousToUser('user-123');

      expect(mockIndexedDbService.setRaw).not.toHaveBeenCalled();
    });

    it('should skip when user already has data', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_existing']));
      mockIndexedDbService.getRaw.and.callFake((key: string) => {
        if (key === 'anonymous_existing') return Promise.resolve('anon value');
        if (key === `${STORAGE_PREFIXES.USER}_user-123_existing`) return Promise.resolve('user value');
        return Promise.resolve(undefined);
      });

      await service.promoteAnonymousToUser('user-123');

      expect(mockIndexedDbService.setRaw).not.toHaveBeenCalled();
      expect(mockLogService.log).toHaveBeenCalledWith('Skipped IndexedDB key existing - user data exists');
    });

    it('should handle IndexedDB key promotion errors gracefully', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_failing']));
      mockIndexedDbService.getRaw.and.callFake((key: string) => {
        if (key === 'anonymous_failing') return Promise.resolve('data');
        return Promise.resolve(undefined);
      });
      mockIndexedDbService.setRaw.and.rejectWith(new Error('Write failed'));

      await service.promoteAnonymousToUser('user-123');

      expect(mockLogService.log).toHaveBeenCalledWith(
        'Failed to promote IndexedDB key: anonymous_failing',
        jasmine.any(Error)
      );
    });

    it('should handle IndexedDB keys() error gracefully', async () => {
      mockIndexedDbService.keys.and.rejectWith(new Error('Keys failed'));

      await service.promoteAnonymousToUser('user-123');

      expect(mockLogService.log).toHaveBeenCalledWith('Failed to promote IndexedDB', jasmine.any(Error));
    });
  });

  describe('clearAnonymousLocalStorage', () => {
    it('should clear all anonymous localStorage keys', async () => {
      localStorage.setItem('anonymous_app_notifications', '[]');
      localStorage.setItem('anonymous_lang', 'en');

      await service.promoteAnonymousToUser('user-123');

      expect(localStorage.getItem('anonymous_app_notifications')).toBeNull();
      expect(localStorage.getItem('anonymous_lang')).toBeNull();
    });

    it('should handle localStorage.removeItem errors', async () => {
      localStorage.setItem('anonymous_lang', 'en');

      spyOn(localStorage, 'removeItem').and.throwError('Remove failed');

      await service.promoteAnonymousToUser('user-123');

      expect(mockLogService.log).toHaveBeenCalledWith(
        'Failed to clear localStorage key: anonymous_app_notifications',
        jasmine.any(Error)
      );
    });
  });

  describe('clearAnonymousIndexedDb', () => {
    it('should clear all anonymous IndexedDB keys', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve([
        'anonymous_key1',
        'anonymous_key2',
        'user_123_key3',
      ]));
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));
      mockIndexedDbService.delRaw.and.returnValue(Promise.resolve());

      await service.promoteAnonymousToUser('user-123');

      expect(mockIndexedDbService.delRaw).toHaveBeenCalledWith('anonymous_key1');
      expect(mockIndexedDbService.delRaw).toHaveBeenCalledWith('anonymous_key2');
      expect(mockIndexedDbService.delRaw).not.toHaveBeenCalledWith('user_123_key3');
    });

    it('should handle clearAnonymousIndexedDb keys() error', async () => {
      // First call succeeds (for promotion), second call fails (for clearing)
      let callCount = 0;
      mockIndexedDbService.keys.and.callFake(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([]);
        return Promise.reject(new Error('Keys failed'));
      });

      await service.promoteAnonymousToUser('user-123');

      expect(mockLogService.log).toHaveBeenCalledWith('Failed to clear anonymous IndexedDB', jasmine.any(Error));
    });
  });

  describe('hasAnonymousData', () => {
    it('should return true when localStorage has anonymous data', async () => {
      localStorage.setItem('anonymous_lang', 'es');

      const result = await service.hasAnonymousData();

      expect(result).toBeTrue();
    });

    it('should return true when localStorage has anonymous notifications', async () => {
      localStorage.setItem('anonymous_app_notifications', JSON.stringify([{ id: '1' }]));

      const result = await service.hasAnonymousData();

      expect(result).toBeTrue();
    });

    it('should return false when localStorage anonymous data is empty string', async () => {
      localStorage.setItem('anonymous_lang', '');

      const result = await service.hasAnonymousData();

      expect(result).toBeFalse();
    });

    it('should return true when IndexedDB has anonymous data', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_settings']));
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve({ theme: 'dark' }));

      const result = await service.hasAnonymousData();

      expect(result).toBeTrue();
    });

    it('should return false when IndexedDB anonymous data is empty', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_settings']));
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(''));

      const result = await service.hasAnonymousData();

      expect(result).toBeFalse();
    });

    it('should return false when IndexedDB anonymous data is null', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_settings']));
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(null));

      const result = await service.hasAnonymousData();

      expect(result).toBeFalse();
    });

    it('should return false when IndexedDB anonymous data is undefined', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_settings']));
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

      const result = await service.hasAnonymousData();

      expect(result).toBeFalse();
    });

    it('should return false when no anonymous data exists', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve([]));

      const result = await service.hasAnonymousData();

      expect(result).toBeFalse();
    });

    it('should skip non-anonymous IndexedDB keys', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['user_123_data', 'other_key']));

      const result = await service.hasAnonymousData();

      expect(result).toBeFalse();
      expect(mockIndexedDbService.getRaw).not.toHaveBeenCalled();
    });

    it('should handle IndexedDB errors gracefully', async () => {
      mockIndexedDbService.keys.and.rejectWith(new Error('IndexedDB error'));

      const result = await service.hasAnonymousData();

      expect(result).toBeFalse();
      expect(mockLogService.log).toHaveBeenCalledWith('Failed to check anonymous IndexedDB data', jasmine.any(Error));
    });
  });

  describe('clearAnonymousData', () => {
    it('should clear localStorage and IndexedDB anonymous data', async () => {
      localStorage.setItem('anonymous_lang', 'en');
      localStorage.setItem('anonymous_app_notifications', '[]');
      mockIndexedDbService.keys.and.returnValue(Promise.resolve(['anonymous_data']));
      mockIndexedDbService.delRaw.and.returnValue(Promise.resolve());

      await service.clearAnonymousData();

      expect(localStorage.getItem('anonymous_lang')).toBeNull();
      expect(localStorage.getItem('anonymous_app_notifications')).toBeNull();
      expect(mockIndexedDbService.delRaw).toHaveBeenCalledWith('anonymous_data');
      expect(mockLogService.log).toHaveBeenCalledWith('Anonymous data cleared (user declined import)');
    });

    it('should handle empty storage gracefully', async () => {
      mockIndexedDbService.keys.and.returnValue(Promise.resolve([]));

      await service.clearAnonymousData();

      expect(mockLogService.log).toHaveBeenCalledWith('Anonymous data cleared (user declined import)');
    });
  });
});

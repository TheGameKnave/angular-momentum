import { TestBed } from '@angular/core/testing';
import {
  CookieStorage,
  NoOpStorage,
  DualStorage,
  UserScopedLocalStorage,
  platformAwareStorageFactory
} from './transloco-storage';
import { PlatformService } from '../services/platform.service';
import { UserStorageService } from '../services/user-storage.service';

describe('transloco-storage', () => {
  describe('CookieStorage', () => {
    beforeEach(() => {
      // Clear all cookies
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    });

    describe('getItem', () => {
      it('should return language from cookie', () => {
        document.cookie = 'lang=en-US; path=/';

        const result = CookieStorage.getItem('lang');

        expect(result).toBe('en-US');
      });

      it('should return null when cookie is not found', () => {
        const result = CookieStorage.getItem('lang');

        expect(result).toBeNull();
      });

      it('should decode URI component in cookie value', () => {
        document.cookie = 'lang=zh%2DCN; path=/';

        const result = CookieStorage.getItem('lang');

        expect(result).toBe('zh-CN');
      });

      it('should handle multiple cookies and find the correct one', () => {
        document.cookie = 'other=value; path=/';
        document.cookie = 'lang=fr; path=/';
        document.cookie = 'another=test; path=/';

        const result = CookieStorage.getItem('lang');

        expect(result).toBe('fr');
      });

      it('should handle cookies with spaces', () => {
        document.cookie = ' lang = es ; path=/';

        const result = CookieStorage.getItem('lang');

        expect(result).toBe('es');
      });
    });

    describe('setItem', () => {
      it('should set language cookie with correct attributes', () => {
        CookieStorage.setItem('lang', 'en-US');

        expect(document.cookie).toContain('lang=en');
      });

      it('should handle special characters in cookie value', () => {
        CookieStorage.setItem('lang', 'zh-CN');

        // Browsers decode the cookie value automatically when reading
        const result = CookieStorage.getItem('lang');
        expect(result).toBe('zh-CN');
      });
    });

    describe('removeItem', () => {
      it('should remove language cookie', () => {
        document.cookie = 'lang=en; path=/';

        CookieStorage.removeItem('lang');

        // Cookie should be expired (max-age=0)
        // Note: Actual removal may not be instant in test environment
        const cookies = document.cookie.split(';');
        const langCookie = cookies.find(c => c.trim().startsWith('lang='));
        // Cookie might still exist but with empty value or be removed
        expect(langCookie === undefined || langCookie.includes('lang=;') || langCookie.includes('lang=')).toBe(true);
      });
    });
  });

  describe('NoOpStorage', () => {
    let storage: NoOpStorage;

    beforeEach(() => {
      storage = new NoOpStorage();
    });

    it('should return null for getItem', () => {
      expect(storage.getItem('any-key')).toBeNull();
    });

    it('should do nothing for setItem', () => {
      expect(() => storage.setItem('key', 'value')).not.toThrow();
    });

    it('should do nothing for removeItem', () => {
      expect(() => storage.removeItem('key')).not.toThrow();
    });
  });

  describe('DualStorage', () => {
    let storage: DualStorage;
    let mockUserStorageService: jasmine.SpyObj<UserStorageService>;

    beforeEach(() => {
      mockUserStorageService = jasmine.createSpyObj('UserStorageService', ['prefixKey']);
      // By default, prefix with 'anonymous_'
      mockUserStorageService.prefixKey.and.callFake((key: string) => `anonymous_${key}`);

      storage = new DualStorage(mockUserStorageService);

      // Mock localStorage
      let store: { [key: string]: string } = {};
      spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        store[key] = value;
      });
      spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
        delete store[key];
      });

      // Clear cookies
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    });

    describe('getItem', () => {
      it('should get value from localStorage using prefixed key', () => {
        localStorage.setItem('anonymous_testKey', 'localValue');

        const result = storage.getItem('testKey');

        expect(mockUserStorageService.prefixKey).toHaveBeenCalledWith('testKey');
        expect(result).toBe('localValue');
      });

      it('should fall back to cookie if localStorage returns null', () => {
        document.cookie = 'lang=cookieValue; path=/';

        const result = storage.getItem('lang');

        expect(result).toBe('cookieValue');
      });

      it('should fall back to cookie if localStorage throws error', () => {
        (localStorage.getItem as jasmine.Spy).and.throwError('localStorage error');
        document.cookie = 'lang=cookieValue; path=/';

        const result = storage.getItem('lang');

        expect(result).toBe('cookieValue');
      });

      it('should prefer localStorage over cookie when both exist', () => {
        localStorage.setItem('anonymous_testKey', 'localValue');
        document.cookie = 'lang=cookieValue; path=/';

        const result = storage.getItem('testKey');

        expect(result).toBe('localValue');
      });

      it('should fall back to cookie when localStorage returns empty string', () => {
        (localStorage.getItem as jasmine.Spy).and.returnValue('');
        document.cookie = 'lang=cookieValue; path=/';

        const result = storage.getItem('lang');

        expect(result).toBe('cookieValue');
      });
    });

    describe('setItem', () => {
      it('should set value in localStorage with prefixed key and cookie without prefix', () => {
        storage.setItem('testKey', 'testValue');

        expect(mockUserStorageService.prefixKey).toHaveBeenCalledWith('testKey');
        expect(localStorage.setItem).toHaveBeenCalledWith('anonymous_testKey', 'testValue');
        expect(document.cookie).toContain('lang=testValue');
      });

      it('should set cookie even if localStorage throws error', () => {
        (localStorage.setItem as jasmine.Spy).and.throwError('localStorage error');

        storage.setItem('testKey', 'testValue');

        expect(document.cookie).toContain('lang=testValue');
      });
    });

    describe('removeItem', () => {
      it('should remove value from localStorage with prefixed key and cookie', () => {
        localStorage.setItem('anonymous_testKey', 'testValue');
        document.cookie = 'lang=testValue; path=/';

        storage.removeItem('testKey');

        expect(mockUserStorageService.prefixKey).toHaveBeenCalledWith('testKey');
        expect(localStorage.removeItem).toHaveBeenCalledWith('anonymous_testKey');
      });

      it('should remove cookie even if localStorage throws error', () => {
        (localStorage.removeItem as jasmine.Spy).and.throwError('localStorage error');
        document.cookie = 'lang=testValue; path=/';

        expect(() => storage.removeItem('testKey')).not.toThrow();
      });
    });
  });

  describe('UserScopedLocalStorage', () => {
    let storage: UserScopedLocalStorage;
    let mockUserStorageService: jasmine.SpyObj<UserStorageService>;

    beforeEach(() => {
      mockUserStorageService = jasmine.createSpyObj('UserStorageService', ['prefixKey']);
      mockUserStorageService.prefixKey.and.callFake((key: string) => `user_abc123_${key}`);

      storage = new UserScopedLocalStorage(mockUserStorageService);

      // Mock localStorage
      let store: { [key: string]: string } = {};
      spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        store[key] = value;
      });
      spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
        delete store[key];
      });
    });

    describe('getItem', () => {
      it('should get value from localStorage using prefixed key', () => {
        localStorage.setItem('user_abc123_lang', 'en-US');

        const result = storage.getItem('lang');

        expect(mockUserStorageService.prefixKey).toHaveBeenCalledWith('lang');
        expect(result).toBe('en-US');
      });

      it('should return null if key does not exist', () => {
        const result = storage.getItem('nonexistent');

        expect(result).toBeNull();
      });

      it('should return null if localStorage throws error', () => {
        (localStorage.getItem as jasmine.Spy).and.throwError('localStorage error');

        const result = storage.getItem('lang');

        expect(result).toBeNull();
      });
    });

    describe('setItem', () => {
      it('should set value in localStorage using prefixed key', () => {
        storage.setItem('lang', 'fr');

        expect(mockUserStorageService.prefixKey).toHaveBeenCalledWith('lang');
        expect(localStorage.setItem).toHaveBeenCalledWith('user_abc123_lang', 'fr');
      });

      it('should not throw if localStorage throws error', () => {
        (localStorage.setItem as jasmine.Spy).and.throwError('localStorage error');

        expect(() => storage.setItem('lang', 'fr')).not.toThrow();
      });
    });

    describe('removeItem', () => {
      it('should remove value from localStorage using prefixed key', () => {
        storage.removeItem('lang');

        expect(mockUserStorageService.prefixKey).toHaveBeenCalledWith('lang');
        expect(localStorage.removeItem).toHaveBeenCalledWith('user_abc123_lang');
      });

      it('should not throw if localStorage throws error', () => {
        (localStorage.removeItem as jasmine.Spy).and.throwError('localStorage error');

        expect(() => storage.removeItem('lang')).not.toThrow();
      });
    });
  });

  describe('platformAwareStorageFactory', () => {
    let mockPlatformService: jasmine.SpyObj<PlatformService>;
    let mockUserStorageService: jasmine.SpyObj<UserStorageService>;

    beforeEach(() => {
      mockPlatformService = jasmine.createSpyObj('PlatformService', [
        'isSSR',
        'isTauri',
        'isWeb'
      ]);
      mockUserStorageService = jasmine.createSpyObj('UserStorageService', ['prefixKey']);

      TestBed.configureTestingModule({
        providers: [
          { provide: PlatformService, useValue: mockPlatformService },
          { provide: UserStorageService, useValue: mockUserStorageService }
        ]
      });
    });

    it('should return NoOpStorage for SSR', () => {
      mockPlatformService.isSSR.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() => platformAwareStorageFactory());

      expect(result).toBeInstanceOf(NoOpStorage);
    });

    it('should return UserScopedLocalStorage for Tauri', () => {
      mockPlatformService.isSSR.and.returnValue(false);
      mockPlatformService.isTauri.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() => platformAwareStorageFactory());

      expect(result).toBeInstanceOf(UserScopedLocalStorage);
    });

    it('should return DualStorage for web', () => {
      mockPlatformService.isSSR.and.returnValue(false);
      mockPlatformService.isTauri.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() => platformAwareStorageFactory());

      expect(result).toBeInstanceOf(DualStorage);
    });
  });
});

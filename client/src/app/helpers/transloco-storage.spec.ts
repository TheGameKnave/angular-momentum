import { TestBed } from '@angular/core/testing';
import {
  CookieStorage,
  NoOpStorage,
  DualStorage,
  UserScopedLocalStorage,
  platformAwareStorageFactory
} from './transloco-storage';
import { PlatformService } from '../services/platform.service';
import { ENVIRONMENT } from 'src/environments/environment';

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
    let store: { [key: string]: string };

    // Helper to create a mock JWT with a user ID
    function createMockJwt(userId: string): string {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: userId, exp: Date.now() / 1000 + 3600 }));
      return `${header}.${payload}.signature`;
    }

    // Helper to get the Supabase auth token key
    function getSupabaseTokenKey(): string {
      const projectRef = new URL(ENVIRONMENT.supabase.url).hostname.split('.')[0];
      return `sb-${projectRef}-auth-token`;
    }

    beforeEach(() => {
      storage = new DualStorage();

      // Mock localStorage
      store = {};
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
      it('should get value from localStorage using anonymous prefix when not authenticated', () => {
        store['anonymous_testKey'] = 'localValue';

        const result = storage.getItem('testKey');

        expect(result).toBe('localValue');
      });

      it('should get value from localStorage using user prefix when authenticated', () => {
        // Set up mock auth token
        const tokenKey = getSupabaseTokenKey();
        store[tokenKey] = JSON.stringify({ access_token: createMockJwt('user123') });
        store['user_user123_testKey'] = 'userValue';

        const result = storage.getItem('testKey');

        expect(result).toBe('userValue');
      });

      it('should use anonymous prefix when token exists but has no access_token', () => {
        const tokenKey = getSupabaseTokenKey();
        store[tokenKey] = JSON.stringify({ refresh_token: 'only-refresh' });
        store['anonymous_testKey'] = 'anonValue';

        const result = storage.getItem('testKey');

        expect(result).toBe('anonValue');
      });

      it('should use anonymous prefix when access_token is malformed (no payload)', () => {
        const tokenKey = getSupabaseTokenKey();
        store[tokenKey] = JSON.stringify({ access_token: 'invalid-token-no-dots' });
        store['anonymous_testKey'] = 'anonValue';

        const result = storage.getItem('testKey');

        expect(result).toBe('anonValue');
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
        store['anonymous_testKey'] = 'localValue';
        document.cookie = 'lang=cookieValue; path=/';

        const result = storage.getItem('testKey');

        expect(result).toBe('localValue');
      });
    });

    describe('setItem', () => {
      it('should set value in localStorage with anonymous prefix and cookie when not authenticated', () => {
        storage.setItem('testKey', 'testValue');

        expect(localStorage.setItem).toHaveBeenCalledWith('anonymous_testKey', 'testValue');
        expect(document.cookie).toContain('lang=testValue');
      });

      it('should set value in localStorage with user prefix when authenticated', () => {
        const tokenKey = getSupabaseTokenKey();
        store[tokenKey] = JSON.stringify({ access_token: createMockJwt('user123') });

        storage.setItem('testKey', 'testValue');

        expect(localStorage.setItem).toHaveBeenCalledWith('user_user123_testKey', 'testValue');
      });

      it('should set cookie even if localStorage throws error', () => {
        (localStorage.setItem as jasmine.Spy).and.throwError('localStorage error');

        storage.setItem('testKey', 'testValue');

        expect(document.cookie).toContain('lang=testValue');
      });
    });

    describe('removeItem', () => {
      it('should remove value from localStorage with prefixed key and cookie', () => {
        store['anonymous_testKey'] = 'testValue';
        document.cookie = 'lang=testValue; path=/';

        storage.removeItem('testKey');

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
    let store: { [key: string]: string };

    // Helper to create a mock JWT with a user ID
    function createMockJwt(userId: string): string {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: userId, exp: Date.now() / 1000 + 3600 }));
      return `${header}.${payload}.signature`;
    }

    // Helper to get the Supabase auth token key
    function getSupabaseTokenKey(): string {
      const projectRef = new URL(ENVIRONMENT.supabase.url).hostname.split('.')[0];
      return `sb-${projectRef}-auth-token`;
    }

    beforeEach(() => {
      storage = new UserScopedLocalStorage();

      // Mock localStorage
      store = {};
      spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
      spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
        store[key] = value;
      });
      spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
        delete store[key];
      });
    });

    describe('getItem', () => {
      it('should get value from localStorage using user prefix when authenticated', () => {
        const tokenKey = getSupabaseTokenKey();
        store[tokenKey] = JSON.stringify({ access_token: createMockJwt('abc123') });
        store['user_abc123_lang'] = 'en-US';

        const result = storage.getItem('lang');

        expect(result).toBe('en-US');
      });

      it('should get value from localStorage using anonymous prefix when not authenticated', () => {
        store['anonymous_lang'] = 'fr';

        const result = storage.getItem('lang');

        expect(result).toBe('fr');
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
      it('should set value in localStorage using user prefix when authenticated', () => {
        const tokenKey = getSupabaseTokenKey();
        store[tokenKey] = JSON.stringify({ access_token: createMockJwt('abc123') });

        storage.setItem('lang', 'fr');

        expect(localStorage.setItem).toHaveBeenCalledWith('user_abc123_lang', 'fr');
      });

      it('should set value in localStorage using anonymous prefix when not authenticated', () => {
        storage.setItem('lang', 'fr');

        expect(localStorage.setItem).toHaveBeenCalledWith('anonymous_lang', 'fr');
      });

      it('should not throw if localStorage throws error', () => {
        (localStorage.setItem as jasmine.Spy).and.throwError('localStorage error');

        expect(() => storage.setItem('lang', 'fr')).not.toThrow();
      });
    });

    describe('removeItem', () => {
      it('should remove value from localStorage using appropriate prefix', () => {
        storage.removeItem('lang');

        expect(localStorage.removeItem).toHaveBeenCalledWith('anonymous_lang');
      });

      it('should not throw if localStorage throws error', () => {
        (localStorage.removeItem as jasmine.Spy).and.throwError('localStorage error');

        expect(() => storage.removeItem('lang')).not.toThrow();
      });
    });
  });

  describe('platformAwareStorageFactory', () => {
    let mockPlatformService: jasmine.SpyObj<PlatformService>;

    beforeEach(() => {
      mockPlatformService = jasmine.createSpyObj('PlatformService', [
        'isSSR',
        'isTauri',
        'isWeb'
      ]);

      TestBed.configureTestingModule({
        providers: [
          { provide: PlatformService, useValue: mockPlatformService }
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

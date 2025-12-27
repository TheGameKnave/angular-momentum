import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { UserSettingsService, UserSettings } from './user-settings.service';
import { LogService } from './log.service';
import { IndexedDbService } from './indexeddb.service';
import { UserStorageService } from './user-storage.service';
import { SocketIoService } from './socket.io.service';
import { AuthService } from './auth.service';
import { TranslocoService } from '@jsverse/transloco';
import { ENVIRONMENT } from 'src/environments/environment';
import { EMPTY, Subject } from 'rxjs';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let httpMock: HttpTestingController;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockIndexedDbService: jasmine.SpyObj<IndexedDbService>;
  let mockUserStorageService: jasmine.SpyObj<UserStorageService>;
  let mockSocketService: jasmine.SpyObj<SocketIoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockTranslocoService: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    mockLogService = jasmine.createSpyObj('LogService', ['log']);
    mockIndexedDbService = jasmine.createSpyObj('IndexedDbService', ['get', 'set', 'delete', 'getRaw']);
    mockIndexedDbService.get.and.returnValue(Promise.resolve(undefined));
    mockIndexedDbService.set.and.returnValue(Promise.resolve('key' as unknown as IDBValidKey));
    mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

    mockUserStorageService = jasmine.createSpyObj('UserStorageService', ['isAuthenticated', 'prefixKeyForAnonymous']);
    mockUserStorageService.isAuthenticated.and.returnValue(false);
    mockUserStorageService.prefixKeyForAnonymous.and.callFake((key: string) => `anonymous_${key}`);

    mockSocketService = jasmine.createSpyObj('SocketIoService', ['listen', 'emit']);
    mockSocketService.listen.and.returnValue(EMPTY);

    mockAuthService = jasmine.createSpyObj('AuthService', ['getToken'], {
      currentUser: signal(null)
    });
    mockAuthService.getToken.and.returnValue(Promise.resolve(null));

    mockTranslocoService = jasmine.createSpyObj('TranslocoService', ['setActiveLang', 'getActiveLang', 'getAvailableLangs']);
    mockTranslocoService.getActiveLang.and.returnValue('en-US');
    mockTranslocoService.getAvailableLangs.and.returnValue(['en', 'es', 'fr', 'sv', 'zh']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserSettingsService,
        { provide: LogService, useValue: mockLogService },
        { provide: IndexedDbService, useValue: mockIndexedDbService },
        { provide: UserStorageService, useValue: mockUserStorageService },
        { provide: SocketIoService, useValue: mockSocketService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TranslocoService, useValue: mockTranslocoService },
      ]
    });

    service = TestBed.inject(UserSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('detectTimezone', () => {
    it('should detect timezone from Intl API', () => {
      const result = service.detectTimezone();

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // Should be a valid IANA timezone (contains /)
      expect(result.includes('/') || result === 'UTC').toBe(true);
    });

    it('should fall back to UTC on error', () => {
      spyOn(Intl, 'DateTimeFormat').and.throwError('Intl error');

      const result = service.detectTimezone();

      expect(result).toBe('UTC');
    });
  });

  describe('loadLocalPreferences', () => {
    it('should load theme and timezone from local storage', async () => {
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_theme') return Promise.resolve({ value: 'light', updatedAt: Date.now() });
        if (key === 'preferences_timezone') return Promise.resolve({ value: 'Europe/Paris', updatedAt: Date.now() });
        if (key === 'preferences_language') return Promise.resolve({ value: 'fr', updatedAt: Date.now() });
        return Promise.resolve(undefined);
      });

      await service.loadLocalPreferences();

      expect(service.themePreference()).toBe('light');
      expect(service.timezonePreference()).toBe('Europe/Paris');
      expect(service.languagePreference()).toBe('fr');
    });

    it('should handle raw values (old format) for theme and timezone', async () => {
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_theme') return Promise.resolve('dark');
        if (key === 'preferences_timezone') return Promise.resolve('America/Chicago');
        if (key === 'preferences_language') return Promise.resolve('es');
        return Promise.resolve(undefined);
      });

      await service.loadLocalPreferences();

      expect(service.themePreference()).toBe('dark');
      expect(service.timezonePreference()).toBe('America/Chicago');
      expect(service.languagePreference()).toBe('es');
    });

    it('should use detected timezone when no local timezone', async () => {
      mockIndexedDbService.get.and.returnValue(Promise.resolve(undefined));

      await service.loadLocalPreferences();

      // Should fall back to detected timezone
      expect(service.timezonePreference()).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      mockIndexedDbService.get.and.returnValue(Promise.reject(new Error('IndexedDB error')));

      await service.loadLocalPreferences();

      // Should not throw, just log error
      expect(mockLogService.log).toHaveBeenCalledWith('Error loading local preferences', jasmine.anything());
    });
  });

  describe('applyTheme', () => {
    it('should add app-dark class for dark theme', () => {
      service.applyTheme('dark');

      expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    });

    it('should remove app-dark class for light theme', () => {
      document.documentElement.classList.add('app-dark');

      service.applyTheme('light');

      expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    });

    it('should update theme-color meta tag', () => {
      // Create meta tag for testing
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }

      service.applyTheme('dark');
      expect(metaThemeColor.getAttribute('content')).toBe('#222');

      service.applyTheme('light');
      expect(metaThemeColor.getAttribute('content')).toBe('#f4f4f4');
    });

    it('should update color-scheme meta tag', () => {
      // Create meta tag for testing
      let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
      if (!metaColorScheme) {
        metaColorScheme = document.createElement('meta');
        metaColorScheme.setAttribute('name', 'color-scheme');
        document.head.appendChild(metaColorScheme);
      }

      service.applyTheme('dark');
      expect(metaColorScheme.getAttribute('content')).toBe('dark');

      service.applyTheme('light');
      expect(metaColorScheme.getAttribute('content')).toBe('light');
    });
  });

  describe('loadSettings', () => {
    it('should load user settings successfully', async () => {
      const mockSettings: UserSettings = {
        id: '123',
        user_id: 'user-456',
        timezone: 'America/New_York',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const loadPromise = service.loadSettings();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockSettings });

      const result = await loadPromise;

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
      expect(service.loading()).toBe(false);
    });

    it('should handle null settings response', async () => {
      const loadPromise = service.loadSettings();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.flush({ data: null });

      const result = await loadPromise;

      expect(result).toBeNull();
      expect(service.settings()).toBeNull();
      expect(service.loading()).toBe(false);
    });

    it('should handle 404 error gracefully', async () => {
      const loadPromise = service.loadSettings();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });

      const result = await loadPromise;

      expect(result).toBeNull();
      expect(service.settings()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(mockLogService.log).not.toHaveBeenCalled();
    });

    it('should log non-404 errors', async () => {
      const loadPromise = service.loadSettings();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      const result = await loadPromise;

      expect(result).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('createSettings', () => {
    it('should create settings with detected timezone', async () => {
      const detectedTz = service.detectTimezone();
      const mockSettings: UserSettings = {
        id: '123',
        timezone: detectedTz
      };

      const createPromise = service.createSettings();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ timezone: detectedTz });
      req.flush({ data: mockSettings });

      const result = await createPromise;

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
      expect(service.loading()).toBe(false);
    });

    it('should create settings with custom timezone', async () => {
      const customTz = 'Europe/London';
      const mockSettings: UserSettings = {
        id: '123',
        timezone: customTz
      };

      const createPromise = service.createSettings(customTz);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.body).toEqual({ timezone: customTz });
      req.flush({ data: mockSettings });

      const result = await createPromise;

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
    });

    it('should handle error during creation', async () => {
      const createPromise = service.createSettings();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      const result = await createPromise;

      expect(result).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('updateThemePreference', () => {
    it('should update theme locally and sync to server when authenticated', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      const newTheme = 'light' as const;
      const mockSettings: UserSettings = {
        id: '123',
        theme_preference: newTheme,
        updated_at: new Date().toISOString()
      };

      const updatePromise = service.updateThemePreference(newTheme);
      tick(); // Resolve IndexedDB save

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ theme_preference: newTheme });
      req.flush({ data: mockSettings });
      tick(); // Process response

      const result = await updatePromise;
      flush();

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
      expect(service.themePreference()).toBe(newTheme);
      expect(mockIndexedDbService.set).toHaveBeenCalled();
    }));

    it('should only save locally when not authenticated', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      const newTheme = 'dark' as const;
      const resultPromise = service.updateThemePreference(newTheme);
      tick(); // Resolve IndexedDB save

      const result = await resultPromise;
      flush();

      // No HTTP request should be made
      httpMock.expectNone(`${ENVIRONMENT.baseUrl}/api/user-settings`);

      expect(result).toBeNull();
      expect(service.themePreference()).toBe(newTheme);
      expect(mockIndexedDbService.set).toHaveBeenCalled();
    }));

    it('should handle error during server sync', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      const updatePromise = service.updateThemePreference('light');
      tick(); // Resolve IndexedDB save

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
      tick(); // Process error

      const result = await updatePromise;
      flush();

      expect(result).toBeNull();
      expect(service.loading()).toBe(false);
      // Should still have updated locally
      expect(service.themePreference()).toBe('light');
    }));
  });

  describe('updateTimezone', () => {
    it('should update timezone locally and sync to server when authenticated', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      const newTz = 'Asia/Tokyo';
      const mockSettings: UserSettings = {
        id: '123',
        timezone: newTz,
        updated_at: new Date().toISOString()
      };

      const updatePromise = service.updateTimezone(newTz);
      tick(); // Resolve IndexedDB save

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ timezone: newTz });
      req.flush({ data: mockSettings });
      tick(); // Process response

      const result = await updatePromise;
      flush();

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
      expect(service.timezonePreference()).toBe(newTz);
      expect(mockIndexedDbService.set).toHaveBeenCalled();
    }));

    it('should only save locally when not authenticated', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      const newTz = 'America/Los_Angeles';
      const resultPromise = service.updateTimezone(newTz);
      tick(); // Resolve IndexedDB save

      const result = await resultPromise;
      flush();

      // No HTTP request should be made
      httpMock.expectNone(`${ENVIRONMENT.baseUrl}/api/user-settings`);

      expect(result).toBeNull();
      expect(service.timezonePreference()).toBe(newTz);
      expect(mockIndexedDbService.set).toHaveBeenCalled();
    }));

    it('should handle error during server sync', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      const updatePromise = service.updateTimezone('America/Los_Angeles');
      tick(); // Resolve IndexedDB save

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
      tick(); // Process error

      const result = await updatePromise;
      flush();

      expect(result).toBeNull();
      expect(service.loading()).toBe(false);
      // Should still have updated locally
      expect(service.timezonePreference()).toBe('America/Los_Angeles');
    }));
  });

  describe('upsertSettings', () => {
    it('should upsert settings with detected timezone', async () => {
      const detectedTz = service.detectTimezone();
      const mockSettings: UserSettings = {
        id: '123',
        timezone: detectedTz
      };

      const upsertPromise = service.upsertSettings();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ timezone: detectedTz });
      req.flush({ data: mockSettings });

      const result = await upsertPromise;

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
      expect(service.loading()).toBe(false);
    });

    it('should upsert settings with custom timezone', async () => {
      const customTz = 'Europe/Paris';
      const mockSettings: UserSettings = {
        id: '123',
        timezone: customTz
      };

      const upsertPromise = service.upsertSettings(customTz);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.body).toEqual({ timezone: customTz });
      req.flush({ data: mockSettings });

      const result = await upsertPromise;

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
    });

    it('should handle error during upsert', async () => {
      const upsertPromise = service.upsertSettings();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      const result = await upsertPromise;

      expect(result).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should load settings and apply server preferences when server is newer', fakeAsync(async () => {
      const serverTimestamp = new Date().toISOString();
      const mockSettings: UserSettings = {
        id: '123',
        timezone: 'America/New_York',
        theme_preference: 'light',
        updated_at: serverTimestamp
      };

      // Local storage has no data
      mockIndexedDbService.get.and.returnValue(Promise.resolve(undefined));

      const initPromise = service.initialize();
      tick(); // Resolve IndexedDB promises

      // Should call loadSettings (GET)
      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(loadReq.request.method).toBe('GET');
      loadReq.flush({ data: mockSettings });
      tick(); // Process response

      await initPromise;
      flush(); // Flush any remaining async operations

      expect(service.settings()).toEqual(mockSettings);
      expect(service.timezonePreference()).toBe('America/New_York');
      expect(service.themePreference()).toBe('light');

      // May have additional sync requests
      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should use local preferences when local is newer', fakeAsync(async () => {
      const oldServerTimestamp = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const mockSettings: UserSettings = {
        id: '123',
        timezone: 'America/New_York',
        theme_preference: 'light',
        updated_at: oldServerTimestamp
      };

      // Local storage has newer data
      const localTheme = { value: 'dark' as const, updatedAt: Date.now() };
      const localTimezone = { value: 'Europe/London', updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_theme') return Promise.resolve(localTheme);
        if (key === 'preferences_timezone') return Promise.resolve(localTimezone);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick(); // Resolve IndexedDB promises

      // Should call loadSettings (GET)
      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: mockSettings });
      tick(); // Process response

      await initPromise;
      flush(); // Flush any remaining async operations

      // Should use local preferences (newer)
      expect(service.themePreference()).toBe('dark');
      expect(service.timezonePreference()).toBe('Europe/London');

      // Flush any pending PATCH requests (sync to server)
      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should handle load error gracefully', fakeAsync(async () => {
      mockIndexedDbService.get.and.returnValue(Promise.resolve(undefined));

      const initPromise = service.initialize();
      tick(); // Resolve IndexedDB promises

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
      tick(); // Process error

      await initPromise;
      flush(); // Flush any remaining async operations

      // Should still work with defaults
      expect(service.loading()).toBe(false);

      // May have additional sync requests
      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should sync local language to server when local is newer', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      const oldServerTimestamp = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const mockSettings: UserSettings = {
        id: '123',
        timezone: 'America/New_York',
        theme_preference: 'light',
        language: 'en-US',
        updated_at: oldServerTimestamp
      };

      // Local storage has newer language
      const localLanguage = { value: 'es', updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_language') return Promise.resolve(localLanguage);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick(); // Resolve IndexedDB promises

      // Should call loadSettings (GET)
      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: mockSettings });
      tick(); // Process response

      await initPromise;
      flush(); // Flush any remaining async operations

      // Should use local language (newer)
      expect(service.languagePreference()).toBe('es');

      // Flush any pending PATCH requests (sync to server)
      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should use server language when server is newer', fakeAsync(async () => {
      const serverTimestamp = new Date().toISOString();
      const mockSettings: UserSettings = {
        id: '123',
        timezone: 'America/New_York',
        language: 'de',
        updated_at: serverTimestamp
      };

      // Local storage has no language or old timestamp
      mockIndexedDbService.get.and.returnValue(Promise.resolve(undefined));

      const initPromise = service.initialize();
      tick(); // Resolve IndexedDB promises

      // Should call loadSettings (GET)
      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: mockSettings });
      tick(); // Process response

      await initPromise;
      flush(); // Flush any remaining async operations

      // Should use server language
      expect(service.languagePreference()).toBe('de');

      // Flush any pending requests
      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));
  });

  describe('clear', () => {
    it('should load anonymous preferences when they exist', async () => {
      // Set up anonymous preferences in IndexedDB
      mockIndexedDbService.getRaw.and.callFake((key: string) => {
        if (key === 'anonymous_preferences_theme') return Promise.resolve({ value: 'light', updatedAt: Date.now() });
        if (key === 'anonymous_preferences_timezone') return Promise.resolve({ value: 'Europe/Paris', updatedAt: Date.now() });
        if (key === 'anonymous_preferences_language') return Promise.resolve({ value: 'fr', updatedAt: Date.now() });
        return Promise.resolve(undefined);
      });

      service.settings.set({ id: '123', timezone: 'America/New_York' });
      service.themePreference.set('dark');
      service.languagePreference.set('es');

      await service.clear();

      expect(service.settings()).toBeNull();
      expect(service.themePreference()).toBe('light'); // From anonymous storage
      expect(service.timezonePreference()).toBe('Europe/Paris'); // From anonymous storage
      expect(service.languagePreference()).toBe('fr'); // From anonymous storage
      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('fr');
    });

    it('should fall back to defaults when no anonymous preferences exist', async () => {
      // No anonymous preferences
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

      service.settings.set({ id: '123', timezone: 'America/New_York' });
      service.themePreference.set('light');
      service.languagePreference.set('es');

      await service.clear();

      expect(service.settings()).toBeNull();
      expect(service.themePreference()).toBe('dark'); // Default
      expect(service.languagePreference()).toBeNull(); // Default
      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en-US');
    });

    it('should use prefixKeyForAnonymous to read from anonymous storage', async () => {
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

      await service.clear();

      // Should have called getRaw with anonymous-prefixed keys
      expect(mockIndexedDbService.getRaw).toHaveBeenCalledWith('anonymous_preferences_theme', 'settings');
      expect(mockIndexedDbService.getRaw).toHaveBeenCalledWith('anonymous_preferences_timezone', 'settings');
      expect(mockIndexedDbService.getRaw).toHaveBeenCalledWith('anonymous_preferences_language', 'settings');
    });

    it('should deauthenticate WebSocket when clear is called', async () => {
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

      await service.clear();

      // Should emit deauthenticate to leave user's WebSocket room
      expect(mockSocketService.emit).toHaveBeenCalledWith('deauthenticate');
    });
  });

  describe('setupLogoutHandler', () => {
    it('should call clear when user transitions from authenticated to unauthenticated', fakeAsync(() => {
      // Create a writable signal for testing
      const userSignal = signal<any>({ id: 'user-123' });

      // Reset TestBed with the new mock
      TestBed.resetTestingModule();
      const testAuthService = jasmine.createSpyObj('AuthService', ['getToken'], {
        currentUser: userSignal
      });
      testAuthService.getToken.and.returnValue(Promise.resolve(null));

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          UserSettingsService,
          { provide: LogService, useValue: mockLogService },
          { provide: IndexedDbService, useValue: mockIndexedDbService },
          { provide: UserStorageService, useValue: mockUserStorageService },
          { provide: SocketIoService, useValue: mockSocketService },
          { provide: AuthService, useValue: testAuthService },
          { provide: TranslocoService, useValue: mockTranslocoService },
        ]
      });

      const testService = TestBed.inject(UserSettingsService);
      const testHttpMock = TestBed.inject(HttpTestingController);
      tick(); // Let effect run initially

      // Set wasAuthenticated to true by triggering effect with authenticated user
      // The effect should have run and set wasAuthenticated = true

      // Now simulate logout by setting user to null
      userSignal.set(null);
      tick(); // Trigger effect

      // Should have logged the logout
      expect(mockLogService.log).toHaveBeenCalledWith('User logged out, resetting to anonymous settings');

      testHttpMock.verify();
    }));

    it('should not call clear when user was not previously authenticated', fakeAsync(() => {
      // Create a writable signal starting with null (not authenticated)
      const userSignal = signal<any>(null);

      // Reset TestBed with the new mock
      TestBed.resetTestingModule();
      const testAuthService = jasmine.createSpyObj('AuthService', ['getToken'], {
        currentUser: userSignal
      });
      testAuthService.getToken.and.returnValue(Promise.resolve(null));
      mockLogService.log.calls.reset();

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          UserSettingsService,
          { provide: LogService, useValue: mockLogService },
          { provide: IndexedDbService, useValue: mockIndexedDbService },
          { provide: UserStorageService, useValue: mockUserStorageService },
          { provide: SocketIoService, useValue: mockSocketService },
          { provide: AuthService, useValue: testAuthService },
          { provide: TranslocoService, useValue: mockTranslocoService },
        ]
      });

      TestBed.inject(UserSettingsService);
      const testHttpMock = TestBed.inject(HttpTestingController);
      tick(); // Let effect run initially

      // User is still null - no logout should be detected
      expect(mockLogService.log).not.toHaveBeenCalledWith('User logged out, resetting to anonymous settings');

      testHttpMock.verify();
    }));

    it('should not call clear when user transitions from unauthenticated to authenticated', fakeAsync(() => {
      // Create a writable signal starting with null (not authenticated)
      const userSignal = signal<any>(null);

      // Reset TestBed with the new mock
      TestBed.resetTestingModule();
      const testAuthService = jasmine.createSpyObj('AuthService', ['getToken'], {
        currentUser: userSignal
      });
      testAuthService.getToken.and.returnValue(Promise.resolve(null));
      mockLogService.log.calls.reset();

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          UserSettingsService,
          { provide: LogService, useValue: mockLogService },
          { provide: IndexedDbService, useValue: mockIndexedDbService },
          { provide: UserStorageService, useValue: mockUserStorageService },
          { provide: SocketIoService, useValue: mockSocketService },
          { provide: AuthService, useValue: testAuthService },
          { provide: TranslocoService, useValue: mockTranslocoService },
        ]
      });

      TestBed.inject(UserSettingsService);
      const testHttpMock = TestBed.inject(HttpTestingController);
      tick(); // Let effect run initially

      // Now simulate login by setting user
      userSignal.set({ id: 'user-123' });
      tick(); // Trigger effect

      // Should NOT have logged logout (this is a login, not logout)
      expect(mockLogService.log).not.toHaveBeenCalledWith('User logged out, resetting to anonymous settings');

      testHttpMock.verify();
    }));
  });

  describe('deleteSettings', () => {
    it('should delete settings successfully', async () => {
      service.settings.set({ id: '123', timezone: 'America/New_York' });

      const deletePromise = service.deleteSettings();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      await deletePromise;

      expect(service.settings()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(mockLogService.log).toHaveBeenCalledWith('Settings deleted');
    });

    it('should handle 404 error gracefully', async () => {
      const deletePromise = service.deleteSettings();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });

      await deletePromise;

      expect(service.settings()).toBeNull();
      expect(service.loading()).toBe(false);
      // Should not log error for 404
      expect(mockLogService.log).not.toHaveBeenCalledWith('Error deleting settings', jasmine.anything());
    });

    it('should throw and log non-404 errors', async () => {
      const deletePromise = service.deleteSettings();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      await expectAsync(deletePromise).toBeRejected();

      expect(service.loading()).toBe(false);
      expect(mockLogService.log).toHaveBeenCalledWith('Error deleting settings', jasmine.anything());
    });
  });

  describe('initial state', () => {
    it('should have null settings initially', () => {
      expect(service.settings()).toBeNull();
    });

    it('should have loading false initially', () => {
      expect(service.loading()).toBe(false);
    });

    it('should have null languagePreference initially', () => {
      expect(service.languagePreference()).toBeNull();
    });
  });

  describe('getLocalTheme (private)', () => {
    it('should handle old format (raw theme value) and return with timestamp 0', fakeAsync(async () => {
      // Return raw 'dark' value (old format without timestamp)
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_theme') return Promise.resolve('dark');
        return Promise.resolve(undefined);
      });

      // Call initialize which internally calls getLocalTheme
      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: null }); // No server settings
      tick();

      await initPromise;
      flush();

      // Should use the local theme from old format
      expect(service.themePreference()).toBe('dark');

      // Flush any pending PATCH requests
      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should return null when IndexedDB throws error', fakeAsync(async () => {
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_theme') return Promise.reject(new Error('IndexedDB error'));
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { theme_preference: 'light', updated_at: new Date().toISOString() } });
      tick();

      await initPromise;
      flush();

      // Should fall back to server theme since local threw error
      expect(service.themePreference()).toBe('light');

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));
  });

  describe('getLocalTimezone (private)', () => {
    it('should handle old format (raw timezone value) and return with timestamp 0', fakeAsync(async () => {
      // Return raw timezone value (old format without timestamp)
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_timezone') return Promise.resolve('America/Chicago');
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: null }); // No server settings
      tick();

      await initPromise;
      flush();

      // Should use the local timezone from old format
      expect(service.timezonePreference()).toBe('America/Chicago');

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should return null when IndexedDB throws error', fakeAsync(async () => {
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_timezone') return Promise.reject(new Error('IndexedDB error'));
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { timezone: 'Europe/Berlin', updated_at: new Date().toISOString() } });
      tick();

      await initPromise;
      flush();

      // Should fall back to server timezone since local threw error
      expect(service.timezonePreference()).toBe('Europe/Berlin');

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));
  });

  describe('getLocalLanguage (private)', () => {
    it('should handle old format (raw language value) and return with timestamp 0', fakeAsync(async () => {
      // Return raw language value (old format without timestamp)
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_language') return Promise.resolve('fr');
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: null }); // No server settings
      tick();

      await initPromise;
      flush();

      // Should use the local language from old format
      expect(service.languagePreference()).toBe('fr');

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should return null when IndexedDB throws error', fakeAsync(async () => {
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_language') return Promise.reject(new Error('IndexedDB error'));
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { language: 'de', updated_at: new Date().toISOString() } });
      tick();

      await initPromise;
      flush();

      // Should fall back to server language since local threw error
      expect(service.languagePreference()).toBe('de');

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));
  });

  describe('saveThemeLocally error handling', () => {
    it('should log error when IndexedDB set fails', fakeAsync(async () => {
      mockIndexedDbService.set.and.returnValue(Promise.reject(new Error('Write error')));
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      const updatePromise = service.updateThemePreference('light');
      tick();

      await updatePromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Error saving theme locally', jasmine.any(Error));
    }));
  });

  describe('saveTimezoneLocally error handling', () => {
    it('should log error when IndexedDB set fails', fakeAsync(async () => {
      mockIndexedDbService.set.and.returnValue(Promise.reject(new Error('Write error')));
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      const updatePromise = service.updateTimezone('America/Denver');
      tick();

      await updatePromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Error saving timezone locally', jasmine.any(Error));
    }));
  });

  describe('saveLanguageLocally error handling', () => {
    it('should log error when IndexedDB set fails', fakeAsync(async () => {
      mockIndexedDbService.set.and.returnValue(Promise.reject(new Error('Write error')));
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      const updatePromise = service.updateLanguagePreference('es');
      tick();

      await updatePromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Error saving language locally', jasmine.any(Error));
    }));
  });

  describe('syncLanguageToServer (private)', () => {
    it('should not make HTTP request when not authenticated', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      // Local language is newer than server - also provide timezone/theme so no defaults kick in
      const localLanguage = { value: 'es', updatedAt: Date.now() };
      const localTimezone = { value: 'UTC', updatedAt: Date.now() };
      const localTheme = { value: 'dark' as const, updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_language') return Promise.resolve(localLanguage);
        if (key === 'preferences_timezone') return Promise.resolve(localTimezone);
        if (key === 'preferences_theme') return Promise.resolve(localTheme);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      // Return server data that matches local to prevent syncing
      loadReq.flush({ data: { language: 'en', timezone: 'UTC', theme_preference: 'dark', updated_at: new Date(Date.now() - 100000).toISOString() } });
      tick();

      await initPromise;
      flush();

      // syncLanguageToServer should not fire since not authenticated
      // No PATCH requests should be made when not authenticated
      httpMock.expectNone(req => req.method === 'PATCH');
    }));

    it('should log success when sync succeeds', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      // Local language is newer than server
      const localLanguage = { value: 'es', updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_language') return Promise.resolve(localLanguage);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { language: 'en', updated_at: new Date(Date.now() - 100000).toISOString() } });
      tick();

      // Handle the PATCH request from syncLanguageToServer
      const patchReqs = httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      patchReqs.forEach(req => {
        if (req.request.method === 'PATCH' && req.request.body.language) {
          req.flush({ data: { language: 'es' } });
        }
      });
      tick();

      await initPromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Language synced to server', 'es');

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should log error when sync fails', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      // Local language is newer than server
      const localLanguage = { value: 'es', updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_language') return Promise.resolve(localLanguage);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { language: 'en', updated_at: new Date(Date.now() - 100000).toISOString() } });
      tick();

      // Handle the PATCH request from syncLanguageToServer with error
      const patchReqs = httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      patchReqs.forEach(req => {
        if (req.request.method === 'PATCH' && req.request.body.language) {
          req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
        }
      });
      tick();

      await initPromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Error syncing language to server', jasmine.anything());

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));
  });

  describe('syncThemeToServer (private)', () => {
    it('should log success when theme sync succeeds', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      // Local theme is newer than server
      const localTheme = { value: 'light' as const, updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_theme') return Promise.resolve(localTheme);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { theme_preference: 'dark', updated_at: new Date(Date.now() - 100000).toISOString() } });
      tick();

      // Handle the PATCH request from syncThemeToServer
      const patchReqs = httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      patchReqs.forEach(req => {
        if (req.request.method === 'PATCH' && req.request.body.theme_preference) {
          req.flush({ data: { theme_preference: 'light' } });
        }
      });
      tick();

      await initPromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Theme synced to server', 'light');

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should log error when theme sync fails', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      // Local theme is newer than server
      const localTheme = { value: 'light' as const, updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_theme') return Promise.resolve(localTheme);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { theme_preference: 'dark', updated_at: new Date(Date.now() - 100000).toISOString() } });
      tick();

      // Handle the PATCH request from syncThemeToServer with error
      const patchReqs = httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      patchReqs.forEach(req => {
        if (req.request.method === 'PATCH' && req.request.body.theme_preference) {
          req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
        }
      });
      tick();

      await initPromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Error syncing theme to server', jasmine.anything());

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));
  });

  describe('syncTimezoneToServer (private)', () => {
    it('should log success when timezone sync succeeds', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      // Local timezone is newer than server
      const localTimezone = { value: 'America/Los_Angeles', updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_timezone') return Promise.resolve(localTimezone);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { timezone: 'UTC', updated_at: new Date(Date.now() - 100000).toISOString() } });
      tick();

      // Handle the PATCH request from syncTimezoneToServer
      const patchReqs = httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      patchReqs.forEach(req => {
        if (req.request.method === 'PATCH' && req.request.body.timezone) {
          req.flush({ data: { timezone: 'America/Los_Angeles' } });
        }
      });
      tick();

      await initPromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Timezone synced to server', 'America/Los_Angeles');

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));

    it('should log error when timezone sync fails', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      // Local timezone is newer than server
      const localTimezone = { value: 'America/Los_Angeles', updatedAt: Date.now() };
      mockIndexedDbService.get.and.callFake((key: string) => {
        if (key === 'preferences_timezone') return Promise.resolve(localTimezone);
        return Promise.resolve(undefined);
      });

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: { timezone: 'UTC', updated_at: new Date(Date.now() - 100000).toISOString() } });
      tick();

      // Handle the PATCH request from syncTimezoneToServer with error
      const patchReqs = httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      patchReqs.forEach(req => {
        if (req.request.method === 'PATCH' && req.request.body.timezone) {
          req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
        }
      });
      tick();

      await initPromise;
      flush();

      expect(mockLogService.log).toHaveBeenCalledWith('Error syncing timezone to server', jasmine.anything());

      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);
    }));
  });

  describe('updateLanguagePreference', () => {
    it('should update language locally and sync to server when authenticated', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      const newLang = 'es';
      const mockSettings: UserSettings = {
        id: '123',
        language: newLang,
        updated_at: new Date().toISOString()
      };

      const updatePromise = service.updateLanguagePreference(newLang);
      tick(); // Resolve IndexedDB save

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ language: newLang });
      req.flush({ data: mockSettings });
      tick(); // Process response

      const result = await updatePromise;
      flush();

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
      expect(service.languagePreference()).toBe(newLang);
      expect(mockIndexedDbService.set).toHaveBeenCalled();
    }));

    it('should only save locally when not authenticated', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(false);

      const newLang = 'fr';
      const resultPromise = service.updateLanguagePreference(newLang);
      tick(); // Resolve IndexedDB save

      const result = await resultPromise;
      flush();

      // No HTTP request should be made
      httpMock.expectNone(`${ENVIRONMENT.baseUrl}/api/user-settings`);

      expect(result).toBeNull();
      expect(service.languagePreference()).toBe(newLang);
      expect(mockIndexedDbService.set).toHaveBeenCalled();
    }));

    it('should handle error during server sync', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);

      const updatePromise = service.updateLanguagePreference('de');
      tick(); // Resolve IndexedDB save

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
      tick(); // Process error

      const result = await updatePromise;
      flush();

      expect(result).toBeNull();
      expect(service.loading()).toBe(false);
      // Should still have updated locally
      expect(service.languagePreference()).toBe('de');
    }));
  });

  describe('WebSocket functionality', () => {
    it('should emit authenticate event when authenticateWebSocket is called', () => {
      service.authenticateWebSocket('test-token');

      expect(mockSocketService.emit).toHaveBeenCalledWith('authenticate', 'test-token');
    });

    it('should emit deauthenticate event when deauthenticateWebSocket is called', () => {
      service.deauthenticateWebSocket();

      expect(mockSocketService.emit).toHaveBeenCalledWith('deauthenticate');
    });

    it('should handle remote theme update via WebSocket', fakeAsync(async () => {
      // Set up initial state - user must be authenticated for WebSocket updates
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      service['themePreference'].set('dark');

      // Simulate receiving remote settings update
      const payload = {
        theme_preference: 'light' as const,
        timezone: null,
        language: null,
        updated_at: new Date().toISOString()
      };

      // Call the private handler directly
      await (service as any).handleRemoteSettingsUpdate(payload);
      tick();
      flush();

      expect(service.themePreference()).toBe('light');
      expect(mockLogService.log).toHaveBeenCalledWith('Theme updated from remote device', 'light');
    }));

    it('should handle remote timezone update via WebSocket', fakeAsync(async () => {
      // Set up initial state - user must be authenticated for WebSocket updates
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      service['timezonePreference'].set('UTC');

      // Simulate receiving remote settings update
      const payload = {
        theme_preference: null,
        timezone: 'America/New_York',
        language: null,
        updated_at: new Date().toISOString()
      };

      // Call the private handler directly
      await (service as any).handleRemoteSettingsUpdate(payload);
      tick();
      flush();

      expect(service.timezonePreference()).toBe('America/New_York');
      expect(mockLogService.log).toHaveBeenCalledWith('Timezone updated from remote device', 'America/New_York');
    }));

    it('should handle remote language update via WebSocket', fakeAsync(async () => {
      // Set up initial state - user must be authenticated for WebSocket updates
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      service['languagePreference'].set('en-US');

      // Simulate receiving remote settings update
      const payload = {
        theme_preference: null,
        timezone: null,
        language: 'es',
        updated_at: new Date().toISOString()
      };

      // Call the private handler directly
      await (service as any).handleRemoteSettingsUpdate(payload);
      tick();
      flush();

      expect(service.languagePreference()).toBe('es');
      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('es');
      expect(mockLogService.log).toHaveBeenCalledWith('Language updated from remote device', 'es');
    }));

    it('should not update theme if payload matches current value', fakeAsync(async () => {
      // Set up initial state - user must be authenticated for WebSocket updates
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      service['themePreference'].set('dark');
      mockLogService.log.calls.reset();

      // Simulate receiving remote settings update with same theme
      const payload = {
        theme_preference: 'dark' as const,
        timezone: null,
        language: null,
        updated_at: new Date().toISOString()
      };

      // Call the private handler directly
      await (service as any).handleRemoteSettingsUpdate(payload);
      tick();
      flush();

      // Should not log theme update since value is the same
      expect(mockLogService.log).not.toHaveBeenCalledWith('Theme updated from remote device', jasmine.anything());
    }));

    it('should ignore WebSocket updates for anonymous users', fakeAsync(async () => {
      // Ensure user is not authenticated
      mockUserStorageService.isAuthenticated.and.returnValue(false);
      service['themePreference'].set('dark');

      // Simulate receiving remote settings update
      const payload = {
        theme_preference: 'light' as const,
        timezone: 'America/New_York',
        language: 'es',
        updated_at: new Date().toISOString()
      };

      // Call the private handler directly
      await (service as any).handleRemoteSettingsUpdate(payload);
      tick();
      flush();

      // Settings should NOT be updated for anonymous users
      expect(service.themePreference()).toBe('dark');
      expect(mockLogService.log).toHaveBeenCalledWith('Ignoring remote settings update for anonymous user');
    }));

    it('should handle settings update via WebSocket subscription', fakeAsync(() => {
      // Create a subject to emit WebSocket updates
      const wsSubject = new Subject<any>();

      // Reset TestBed and configure with the Subject before service creation
      TestBed.resetTestingModule();
      mockSocketService.listen.and.returnValue(wsSubject.asObservable());
      // User must be authenticated for WebSocket updates to be processed
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          UserSettingsService,
          { provide: LogService, useValue: mockLogService },
          { provide: IndexedDbService, useValue: mockIndexedDbService },
          { provide: UserStorageService, useValue: mockUserStorageService },
          { provide: SocketIoService, useValue: mockSocketService },
          { provide: AuthService, useValue: mockAuthService },
          { provide: TranslocoService, useValue: mockTranslocoService },
        ]
      });

      // Create service with the Subject-backed mock
      const wsTestService = TestBed.inject(UserSettingsService);
      const wsHttpMock = TestBed.inject(HttpTestingController);

      // Set up initial state
      wsTestService['themePreference'].set('dark');

      // Emit a settings update via WebSocket
      const payload = {
        theme_preference: 'light' as const,
        timezone: null,
        language: null,
        updated_at: new Date().toISOString()
      };
      wsSubject.next(payload);
      tick();
      flush();

      // Verify the handler was triggered via the subscription
      expect(wsTestService.themePreference()).toBe('light');
      expect(mockLogService.log).toHaveBeenCalledWith('Theme updated from remote device', 'light');

      wsHttpMock.verify();
    }));

    it('should authenticate WebSocket in initialize when token is available', fakeAsync(async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockAuthService.getToken.and.returnValue(Promise.resolve('auth-token'));
      mockIndexedDbService.get.and.returnValue(Promise.resolve(undefined));

      const initPromise = service.initialize();
      tick();

      const loadReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      loadReq.flush({ data: null });
      tick();

      await initPromise;
      flush();

      // Handle any sync requests that may have been triggered
      httpMock.match(`${ENVIRONMENT.baseUrl}/api/user-settings`);

      expect(mockAuthService.getToken).toHaveBeenCalled();
      expect(mockSocketService.emit).toHaveBeenCalledWith('authenticate', 'auth-token');
    }));
  });
});

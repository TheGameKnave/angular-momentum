import { TestBed } from '@angular/core/testing';
import { DataExportService, ExportedData } from './data-export.service';
import { IndexedDbService } from './indexeddb.service';
import { UserStorageService } from './user-storage.service';
import { LogService } from './log.service';
import { ENVIRONMENT } from 'src/environments/environment';

describe('DataExportService', () => {
  let service: DataExportService;
  let mockIndexedDbService: jasmine.SpyObj<IndexedDbService>;
  let mockUserStorageService: jasmine.SpyObj<UserStorageService>;
  let mockLogService: jasmine.SpyObj<LogService>;

  beforeEach(() => {
    mockIndexedDbService = jasmine.createSpyObj('IndexedDbService', ['getRaw']);
    mockUserStorageService = jasmine.createSpyObj('UserStorageService', [
      'getUserId',
      'isAuthenticated',
      'prefixKey',
    ]);
    mockLogService = jasmine.createSpyObj('LogService', ['log']);

    // Default implementations
    mockUserStorageService.getUserId.and.returnValue(null);
    mockUserStorageService.isAuthenticated.and.returnValue(false);
    mockUserStorageService.prefixKey.and.callFake((key: string) => `anonymous_${key}`);
    mockIndexedDbService.getRaw.and.returnValue(Promise.resolve(undefined));

    TestBed.configureTestingModule({
      providers: [
        DataExportService,
        { provide: IndexedDbService, useValue: mockIndexedDbService },
        { provide: UserStorageService, useValue: mockUserStorageService },
        { provide: LogService, useValue: mockLogService },
      ],
    });

    service = TestBed.inject(DataExportService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('collectUserData', () => {
    it('should collect data for anonymous users', async () => {
      localStorage.setItem('anonymous_app_notifications', JSON.stringify([{ id: '1' }]));
      localStorage.setItem('anonymous_lang', 'en');

      const data = await service.collectUserData();

      expect(data.userScope).toBe('anonymous');
      expect(data.userId).toBeUndefined();
      expect(data.data.localStorage['app_notifications']).toBe(JSON.stringify([{ id: '1' }]));
      expect(data.data.localStorage['lang']).toBe('en');
      expect(data.appVersion).toBeDefined();
      expect(data.exportedAt).toBeDefined();
    });

    it('should collect data for authenticated users', async () => {
      mockUserStorageService.getUserId.and.returnValue('user-123');
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      mockUserStorageService.prefixKey.and.callFake((key: string) => `user_user-123_${key}`);

      localStorage.setItem('user_user-123_app_notifications', '[]');

      const data = await service.collectUserData();

      expect(data.userScope).toBe('authenticated');
      expect(data.userId).toBe('user-123');
    });

    it('should collect IndexedDB data', async () => {
      mockIndexedDbService.getRaw.and.callFake((key: string) => {
        if (key === 'anonymous_key') return Promise.resolve('test value');
        return Promise.resolve(undefined);
      });

      const data = await service.collectUserData();

      expect(data.data.indexedDb['key']).toBe('test value');
    });

    it('should handle localStorage read errors', async () => {
      spyOn(localStorage, 'getItem').and.throwError('Storage error');

      const data = await service.collectUserData();

      expect(data.data.localStorage).toEqual({});
      expect(mockLogService.log).toHaveBeenCalledWith(
        'Failed to read localStorage key: anonymous_app_notifications',
        jasmine.any(Error)
      );
    });

    it('should handle IndexedDB read errors', async () => {
      mockIndexedDbService.getRaw.and.rejectWith(new Error('DB error'));

      const data = await service.collectUserData();

      expect(data.data.indexedDb).toEqual({});
      expect(mockLogService.log).toHaveBeenCalledWith(
        'Failed to read IndexedDB key: anonymous_key',
        jasmine.any(Error)
      );
    });

    it('should fetch server data when requested with token', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      const mockServerData = { settings: { theme: 'dark' } };

      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(JSON.stringify(mockServerData), { status: 200 }))
      );

      const data = await service.collectUserData({
        includeServerData: true,
        accessToken: 'test-token',
      });

      expect(data.data.server).toEqual(mockServerData);
      expect(window.fetch).toHaveBeenCalledWith(
        `${ENVIRONMENT.baseUrl}/api/auth/export-data`,
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-token' },
        }
      );
    });

    it('should handle server data fetch failure', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(null, { status: 500 }))
      );

      const data = await service.collectUserData({
        includeServerData: true,
        accessToken: 'test-token',
      });

      expect(data.data.server).toBeUndefined();
    });

    it('should handle server data fetch network error', async () => {
      // Note: fetchServerData has its own try-catch that returns null on error,
      // so the outer catch block in collectUserData is never reached for network errors.
      // The error is silently handled and server data is just undefined.
      spyOn(window, 'fetch').and.rejectWith(new Error('Network error'));

      const data = await service.collectUserData({
        includeServerData: true,
        accessToken: 'test-token',
      });

      expect(data.data.server).toBeUndefined();
    });

    it('should not fetch server data without token', async () => {
      spyOn(window, 'fetch');

      const data = await service.collectUserData({ includeServerData: true });

      expect(window.fetch).not.toHaveBeenCalled();
      expect(data.data.server).toBeUndefined();
    });
  });

  describe('exportUserData', () => {
    it('should create and download JSON file', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: jasmine.createSpy('click'),
        remove: jasmine.createSpy('remove'),
      };
      spyOn(document, 'createElement').and.returnValue(mockLink as any);
      spyOn(document.body, 'appendChild');
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
      spyOn(URL, 'revokeObjectURL');

      await service.exportUserData();

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:test');
      expect(mockLink.download).toMatch(/angular-momentum-data-\d{4}-\d{2}-\d{2}\.json/);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.remove).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
      expect(mockLogService.log).toHaveBeenCalledWith('User data exported', jasmine.any(Object));
    });

    it('should log server data count when server data is included', async () => {
      mockUserStorageService.isAuthenticated.and.returnValue(true);
      const mockServerData = { settings: { theme: 'dark' }, username: 'test' };

      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(JSON.stringify(mockServerData), { status: 200 }))
      );

      const mockLink = {
        href: '',
        download: '',
        click: jasmine.createSpy('click'),
        remove: jasmine.createSpy('remove'),
      };
      spyOn(document, 'createElement').and.returnValue(mockLink as any);
      spyOn(document.body, 'appendChild');
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
      spyOn(URL, 'revokeObjectURL');

      await service.exportUserData({
        includeServerData: true,
        accessToken: 'test-token',
      });

      expect(mockLogService.log).toHaveBeenCalledWith('User data exported', jasmine.objectContaining({
        server: 2, // settings and username
      }));
    });
  });

  describe('hasUserData', () => {
    it('should return true if localStorage has data', async () => {
      localStorage.setItem('anonymous_app_notifications', '[]');

      const result = await service.hasUserData();

      expect(result).toBe(true);
    });

    it('should return true if IndexedDB has data', async () => {
      mockIndexedDbService.getRaw.and.returnValue(Promise.resolve('some data'));

      const result = await service.hasUserData();

      expect(result).toBe(true);
    });

    it('should return false if no data exists', async () => {
      const result = await service.hasUserData();

      expect(result).toBe(false);
    });

    it('should handle IndexedDB errors gracefully', async () => {
      mockIndexedDbService.getRaw.and.rejectWith(new Error('DB error'));

      const result = await service.hasUserData();

      expect(result).toBe(false);
    });
  });
});

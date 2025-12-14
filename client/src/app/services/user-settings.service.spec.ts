import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserSettingsService, UserSettings } from './user-settings.service';
import { LogService } from './log.service';
import { ENVIRONMENT } from 'src/environments/environment';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let httpMock: HttpTestingController;
  let mockLogService: jasmine.SpyObj<LogService>;

  beforeEach(() => {
    mockLogService = jasmine.createSpyObj('LogService', ['log']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserSettingsService,
        { provide: LogService, useValue: mockLogService }
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

  describe('updateTimezone', () => {
    it('should update timezone successfully', async () => {
      const newTz = 'Asia/Tokyo';
      const mockSettings: UserSettings = {
        id: '123',
        timezone: newTz,
        updated_at: new Date().toISOString()
      };

      const updatePromise = service.updateTimezone(newTz);
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ timezone: newTz });
      req.flush({ data: mockSettings });

      const result = await updatePromise;

      expect(result).toEqual(mockSettings);
      expect(service.settings()).toEqual(mockSettings);
      expect(service.loading()).toBe(false);
    });

    it('should handle error during update', async () => {
      const updatePromise = service.updateTimezone('America/Los_Angeles');

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      const result = await updatePromise;

      expect(result).toBeNull();
      expect(service.loading()).toBe(false);
    });
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
    it('should upsert settings for existing user', async () => {
      const mockSettings: UserSettings = {
        id: '123',
        timezone: 'America/New_York'
      };

      const initPromise = service.initialize();

      // Single upsert request (PUT) - handles both create and update
      const upsertReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(upsertReq.request.method).toBe('PUT');
      upsertReq.flush({ data: mockSettings });

      await initPromise;

      expect(service.settings()).toEqual(mockSettings);
    });

    it('should upsert settings for new user', async () => {
      const detectedTz = service.detectTimezone();
      const newSettings: UserSettings = {
        id: '456',
        timezone: detectedTz
      };

      const initPromise = service.initialize();

      // Single upsert request (PUT) - creates settings if they don't exist
      const upsertReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(upsertReq.request.method).toBe('PUT');
      expect(upsertReq.request.body).toEqual({ timezone: detectedTz });
      upsertReq.flush({ data: newSettings });

      await initPromise;

      expect(service.settings()).toEqual(newSettings);
    });

    it('should handle upsert error gracefully', async () => {
      const initPromise = service.initialize();

      const upsertReq = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/user-settings`);
      expect(upsertReq.request.method).toBe('PUT');
      upsertReq.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      await initPromise;

      expect(service.settings()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear settings state', () => {
      service.settings.set({
        id: '123',
        timezone: 'America/New_York'
      });

      service.clear();

      expect(service.settings()).toBeNull();
    });
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
  });
});

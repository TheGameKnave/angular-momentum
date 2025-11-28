import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UsernameService, UsernameData } from './username.service';
import { ENVIRONMENT } from 'src/environments/environment';

describe('UsernameService', () => {
  let service: UsernameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UsernameService]
    });

    service = TestBed.inject(UsernameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadUsername', () => {
    it('should load username successfully', async () => {
      const mockResponse = {
        success: true,
        username: 'testuser',
        fingerprint: 'test-fingerprint'
      };

      const loadPromise = service.loadUsername();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const result = await loadPromise;

      expect(result).toEqual({
        username: 'testuser',
        fingerprint: 'test-fingerprint'
      });
      expect(service.username()).toEqual({
        username: 'testuser',
        fingerprint: 'test-fingerprint'
      });
      expect(service.loading()).toBe(false);
    });

    it('should handle null username in response', async () => {
      const mockResponse = {
        success: true,
        username: null,
        fingerprint: null
      };

      const loadPromise = service.loadUsername();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(mockResponse);

      const result = await loadPromise;

      expect(result).toEqual({
        username: null,
        fingerprint: null
      });
      expect(service.username()).toEqual({
        username: null,
        fingerprint: null
      });
    });

    it('should handle undefined username in response using nullish coalescing', async () => {
      const mockResponse = {
        success: true
        // username and fingerprint undefined
      };

      const loadPromise = service.loadUsername();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(mockResponse);

      const result = await loadPromise;

      expect(result).toEqual({
        username: null,
        fingerprint: null
      });
    });

    it('should handle error and return null', async () => {
      spyOn(console, 'error');

      const loadPromise = service.loadUsername();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      const result = await loadPromise;

      expect(result).toBeNull();
      expect(service.username()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(console.error).toHaveBeenCalledWith('[UsernameService] Error loading username', jasmine.any(Object));
    });
  });

  describe('updateUsername', () => {
    it('should update username successfully', async () => {
      const mockResponse = {
        success: true,
        username: 'newuser',
        fingerprint: 'new-fingerprint'
      };

      const updatePromise = service.updateUsername('newuser');
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ username: 'newuser' });
      req.flush(mockResponse);

      const result = await updatePromise;

      expect(result).toEqual({
        username: 'newuser',
        fingerprint: 'new-fingerprint'
      });
      expect(service.username()).toEqual({
        username: 'newuser',
        fingerprint: 'new-fingerprint'
      });
      expect(service.creationFailed()).toBe(false);
      expect(service.loading()).toBe(false);
    });

    it('should handle null username in update response', async () => {
      const mockResponse = {
        success: true,
        username: null,
        fingerprint: null
      };

      const updatePromise = service.updateUsername('newuser');

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(mockResponse);

      const result = await updatePromise;

      expect(result).toEqual({
        username: null,
        fingerprint: null
      });
    });

    it('should handle unsuccessful response in regular flow', async () => {
      spyOn(console, 'error');
      const mockResponse = {
        success: false,
        error: 'Username already taken'
      };

      const updatePromise = service.updateUsername('existinguser');

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(mockResponse);

      const result = await updatePromise;

      expect(result).toBeNull();
      expect(service.creationFailed()).toBe(false);
      expect(service.loading()).toBe(false);
      expect(console.error).toHaveBeenCalledWith('[UsernameService] Error updating username:', 'Username already taken');
    });

    it('should set creationFailed flag in signup flow on unsuccessful response', async () => {
      spyOn(console, 'error');
      const mockResponse = {
        success: false,
        error: 'Username already taken'
      };

      const updatePromise = service.updateUsername('existinguser', true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(mockResponse);

      const result = await updatePromise;

      expect(result).toBeNull();
      expect(service.creationFailed()).toBe(true);
      expect(service.loading()).toBe(false);
    });

    it('should handle HTTP error in regular flow', async () => {
      spyOn(console, 'error');

      const updatePromise = service.updateUsername('newuser');

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      // When there's no error code from the server, parseApiError returns the default error
      await expectAsync(updatePromise).toBeRejectedWithError('error.Login failed');
      expect(service.creationFailed()).toBe(false);
      expect(service.loading()).toBe(false);
      expect(console.error).toHaveBeenCalledWith('[UsernameService] Error updating username', jasmine.any(Object));
    });

    it('should set creationFailed flag in signup flow on HTTP error', async () => {
      spyOn(console, 'error');

      const updatePromise = service.updateUsername('newuser', true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      // When there's no error code from the server, parseApiError returns the default error
      await expectAsync(updatePromise).toBeRejectedWithError('error.Login failed');
      expect(service.creationFailed()).toBe(true);
      expect(service.loading()).toBe(false);
    });

    it('should extract error message from nested error object', async () => {
      spyOn(console, 'error');

      const updatePromise = service.updateUsername('newuser');

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(
        { error: 'Custom error message' },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(updatePromise).toBeRejectedWithError('Custom error message');
      expect(console.error).toHaveBeenCalled();
    });

    it('should clear creationFailed flag on successful update', async () => {
      service.creationFailed.set(true);

      const mockResponse = {
        success: true,
        username: 'newuser',
        fingerprint: 'new-fingerprint'
      };

      const updatePromise = service.updateUsername('newuser');

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(mockResponse);

      await updatePromise;

      expect(service.creationFailed()).toBe(false);
    });
  });

  describe('deleteUsername', () => {
    it('should delete username successfully', async () => {
      const mockResponse = {
        success: true
      };

      service.username.set({ username: 'testuser', fingerprint: 'test-fp' });

      const deletePromise = service.deleteUsername();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);

      const result = await deletePromise;

      expect(result).toBe(true);
      expect(service.username()).toBeNull();
      expect(service.loading()).toBe(false);
    });

    it('should handle unsuccessful delete response with specific error', async () => {
      spyOn(console, 'error');
      const mockResponse = {
        success: false,
        error: 'Cannot delete username at this time'
      };

      const deletePromise = service.deleteUsername();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(mockResponse);

      await expectAsync(deletePromise).toBeRejected();
      expect(service.loading()).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle unsuccessful delete response without error message', async () => {
      spyOn(console, 'error');
      const mockResponse = {
        success: false
      };

      const deletePromise = service.deleteUsername();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(mockResponse);

      // When there's no error code from the server, parseApiError returns the default error
      await expectAsync(deletePromise).toBeRejectedWithError('error.Login failed');
      expect(console.error).toHaveBeenCalledWith('[UsernameService] Error deleting username:', undefined);
    });

    it('should handle HTTP error during delete', async () => {
      spyOn(console, 'error');

      const deletePromise = service.deleteUsername();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      // When there's no error code from the server, parseApiError returns the default error
      await expectAsync(deletePromise).toBeRejectedWithError('error.Login failed');
      expect(service.loading()).toBe(false);
      expect(console.error).toHaveBeenCalledWith('[UsernameService] Error deleting username', jasmine.any(Object));
    });

    it('should extract error message from nested error object during delete', async () => {
      spyOn(console, 'error');

      const deletePromise = service.deleteUsername();

      const req = httpMock.expectOne(`${ENVIRONMENT.baseUrl}/api/auth/username`);
      req.flush(
        { error: 'Custom delete error' },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(deletePromise).toBeRejectedWithError('Custom delete error');
    });
  });

  describe('clear', () => {
    it('should clear username and creationFailed state', () => {
      service.username.set({ username: 'testuser', fingerprint: 'test-fp' });
      service.creationFailed.set(true);

      service.clear();

      expect(service.username()).toBeNull();
      expect(service.creationFailed()).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should have null username initially', () => {
      expect(service.username()).toBeNull();
    });

    it('should have loading false initially', () => {
      expect(service.loading()).toBe(false);
    });

    it('should have creationFailed false initially', () => {
      expect(service.creationFailed()).toBe(false);
    });
  });
});

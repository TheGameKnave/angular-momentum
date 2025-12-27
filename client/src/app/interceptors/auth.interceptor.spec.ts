import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { PlatformService } from '../services/platform.service';

describe('authInterceptor', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockPlatformService: jasmine.SpyObj<PlatformService>;
  let mockHandler: HttpHandler;
  let mockRequest: HttpRequest<unknown>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getToken', 'isAuthenticated', 'logout']);
    mockPlatformService = jasmine.createSpyObj('PlatformService', ['isSSR']);

    mockHandler = {
      handle: jasmine.createSpy('handle').and.returnValue(of({} as HttpEvent<unknown>))
    } as any;

    mockRequest = new HttpRequest('GET', '/api/test');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PlatformService, useValue: mockPlatformService }
      ]
    });
  });

  it('should skip auth for SSR', (done) => {
    mockPlatformService.isSSR.and.returnValue(true);

    TestBed.runInInjectionContext(() => {
      const result = authInterceptor(mockRequest, mockHandler.handle);

      result.subscribe(() => {
        expect(mockPlatformService.isSSR).toHaveBeenCalled();
        expect(mockAuthService.getToken).not.toHaveBeenCalled();
        expect(mockHandler.handle).toHaveBeenCalledWith(mockRequest);
        done();
      });
    });
  });

  it('should add Authorization header when token is available', (done) => {
    const testToken = 'test-token-123';
    mockPlatformService.isSSR.and.returnValue(false);
    mockAuthService.getToken.and.returnValue(Promise.resolve(testToken));

    TestBed.runInInjectionContext(() => {
      const result = authInterceptor(mockRequest, mockHandler.handle);

      result.subscribe(() => {
        expect(mockPlatformService.isSSR).toHaveBeenCalled();
        expect(mockAuthService.getToken).toHaveBeenCalled();
        expect(mockHandler.handle).toHaveBeenCalled();

        const callArgs = (mockHandler.handle as jasmine.Spy).calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(callArgs.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
        done();
      });
    });
  });

  it('should not add Authorization header when token is null', (done) => {
    mockPlatformService.isSSR.and.returnValue(false);
    mockAuthService.getToken.and.returnValue(Promise.resolve(null));

    TestBed.runInInjectionContext(() => {
      const result = authInterceptor(mockRequest, mockHandler.handle);

      result.subscribe(() => {
        expect(mockPlatformService.isSSR).toHaveBeenCalled();
        expect(mockAuthService.getToken).toHaveBeenCalled();
        expect(mockHandler.handle).toHaveBeenCalledWith(mockRequest);

        const callArgs = (mockHandler.handle as jasmine.Spy).calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(callArgs.headers.has('Authorization')).toBe(false);
        done();
      });
    });
  });

  it('should not add Authorization header when token is undefined', (done) => {
    mockPlatformService.isSSR.and.returnValue(false);
    mockAuthService.getToken.and.returnValue(Promise.resolve(undefined as any));

    TestBed.runInInjectionContext(() => {
      const result = authInterceptor(mockRequest, mockHandler.handle);

      result.subscribe(() => {
        expect(mockAuthService.getToken).toHaveBeenCalled();
        expect(mockHandler.handle).toHaveBeenCalledWith(mockRequest);

        const callArgs = (mockHandler.handle as jasmine.Spy).calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(callArgs.headers.has('Authorization')).toBe(false);
        done();
      });
    });
  });

  it('should not modify original request when adding Authorization header', (done) => {
    const testToken = 'test-token-456';
    mockPlatformService.isSSR.and.returnValue(false);
    mockAuthService.getToken.and.returnValue(Promise.resolve(testToken));

    TestBed.runInInjectionContext(() => {
      const result = authInterceptor(mockRequest, mockHandler.handle);

      result.subscribe(() => {
        // Original request should not be modified
        expect(mockRequest.headers.has('Authorization')).toBe(false);

        // Modified request should have the header
        const callArgs = (mockHandler.handle as jasmine.Spy).calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(callArgs.headers.get('Authorization')).toBe(`Bearer ${testToken}`);
        expect(callArgs).not.toBe(mockRequest); // Should be a clone
        done();
      });
    });
  });

  it('should logout user on 401 response when authenticated', (done) => {
    const testToken = 'expired-token';
    mockPlatformService.isSSR.and.returnValue(false);
    mockAuthService.getToken.and.returnValue(Promise.resolve(testToken));
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.logout.and.returnValue(Promise.resolve());

    const error401 = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    mockHandler.handle = jasmine.createSpy('handle').and.returnValue(throwError(() => error401));

    TestBed.runInInjectionContext(() => {
      const result = authInterceptor(mockRequest, mockHandler.handle);

      result.subscribe({
        error: () => {
          expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
          expect(mockAuthService.logout).toHaveBeenCalled();
          done();
        }
      });
    });
  });

  it('should not logout user on 401 response when not authenticated', (done) => {
    const testToken = 'some-token';
    mockPlatformService.isSSR.and.returnValue(false);
    mockAuthService.getToken.and.returnValue(Promise.resolve(testToken));
    mockAuthService.isAuthenticated.and.returnValue(false);

    const error401 = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    mockHandler.handle = jasmine.createSpy('handle').and.returnValue(throwError(() => error401));

    TestBed.runInInjectionContext(() => {
      const result = authInterceptor(mockRequest, mockHandler.handle);

      result.subscribe({
        error: () => {
          expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
          expect(mockAuthService.logout).not.toHaveBeenCalled();
          done();
        }
      });
    });
  });

  it('should not logout user on non-401 errors', (done) => {
    const testToken = 'valid-token';
    mockPlatformService.isSSR.and.returnValue(false);
    mockAuthService.getToken.and.returnValue(Promise.resolve(testToken));
    mockAuthService.isAuthenticated.and.returnValue(true);

    const error500 = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
    mockHandler.handle = jasmine.createSpy('handle').and.returnValue(throwError(() => error500));

    TestBed.runInInjectionContext(() => {
      const result = authInterceptor(mockRequest, mockHandler.handle);

      result.subscribe({
        error: () => {
          expect(mockAuthService.logout).not.toHaveBeenCalled();
          done();
        }
      });
    });
  });
});

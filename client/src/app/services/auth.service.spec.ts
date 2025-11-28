import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService, AuthResult, LoginCredentials } from './auth.service';
import { PlatformService } from './platform.service';
import { LogService } from './log.service';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { ENVIRONMENT } from 'src/environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let mockPlatformService: jasmine.SpyObj<PlatformService>;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTranslocoService: jasmine.SpyObj<TranslocoService>;
  let mockSupabaseClient: any;
  let mockSupabaseAuth: any;

  // Helper to create mock user
  const createMockUser = (email: string): User => ({
    id: 'test-user-id',
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User);

  // Helper to create mock session
  const createMockSession = (user: User): Session => ({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session);

  beforeEach(() => {
    // Mock Supabase auth methods
    mockSupabaseAuth = {
      getSession: jasmine.createSpy('getSession').and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      ),
      signUp: jasmine.createSpy('signUp'),
      signInWithPassword: jasmine.createSpy('signInWithPassword'),
      verifyOtp: jasmine.createSpy('verifyOtp'),
      resend: jasmine.createSpy('resend'),
      signOut: jasmine.createSpy('signOut'),
      onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({
        data: { subscription: { unsubscribe: () => {} } }
      }),
      setSession: jasmine.createSpy('setSession'),
      resetPasswordForEmail: jasmine.createSpy('resetPasswordForEmail'),
      updateUser: jasmine.createSpy('updateUser'),
    };

    // Mock Supabase client
    mockSupabaseClient = {
      auth: mockSupabaseAuth
    };

    // Mock services
    mockPlatformService = jasmine.createSpyObj('PlatformService', [
      'isSSR',
      'isWeb',
      'isTauri'
    ]);
    mockPlatformService.isSSR.and.returnValue(false);
    mockPlatformService.isWeb.and.returnValue(true);
    mockPlatformService.isTauri.and.returnValue(false);

    mockLogService = jasmine.createSpyObj('LogService', ['log']);

    mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
      routerState: {
        root: {
          firstChild: null,
          snapshot: {
            routeConfig: {
              canActivate: []
            }
          }
        }
      }
    });

    mockTranslocoService = jasmine.createSpyObj('TranslocoService', ['getActiveLang']);
    mockTranslocoService.getActiveLang.and.returnValue('en');

    // Mock global fetch
    spyOn(window, 'fetch');

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: PlatformService, useValue: mockPlatformService },
        { provide: LogService, useValue: mockLogService },
        { provide: Router, useValue: mockRouter },
        { provide: TranslocoService, useValue: mockTranslocoService }
      ]
    });

    service = TestBed.inject(AuthService);

    // Inject mock Supabase client after service creation
    (service as any).supabase = mockSupabaseClient;
    service['loading'].set(false);
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null user and session', () => {
      expect(service.currentUser()).toBeNull();
      expect(service.currentSession()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should skip initialization on SSR', () => {
      mockPlatformService.isSSR.and.returnValue(true);

      const ssrService = new (AuthService as any)(mockPlatformService, mockLogService, mockRouter);

      expect(ssrService.loading()).toBe(false);
    });

    it('should handle missing Supabase configuration', () => {
      const originalSupabase = ENVIRONMENT.supabase;
      (ENVIRONMENT as any).supabase = undefined;

      mockLogService.log.calls.reset();

      const testService = new (AuthService as any)(mockPlatformService, mockLogService, mockRouter);

      expect(testService.loading()).toBe(false);
      expect(mockLogService.log).toHaveBeenCalledWith('Supabase not configured');

      (ENVIRONMENT as any).supabase = originalSupabase;
    });
  });

  describe('validateUsername', () => {
    it('should accept valid username', () => {
      expect(service.validateUsername('validuser')).toBe(true);
    });

    it('should accept username with minimum length', () => {
      expect(service.validateUsername('abc')).toBe(true);
    });

    it('should accept username with maximum length', () => {
      expect(service.validateUsername('a'.repeat(30))).toBe(true);
    });

    it('should reject username too short', () => {
      expect(service.validateUsername('ab')).toBe(false);
    });

    it('should reject username too long', () => {
      expect(service.validateUsername('a'.repeat(31))).toBe(false);
    });

    it('should reject username with control characters', () => {
      expect(service.validateUsername('user\x00name')).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully with email', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          user: mockUser,
          session: mockSession
        }), { status: 200 }))
      );

      mockSupabaseAuth.setSession.and.returnValue(Promise.resolve({ data: {}, error: null }));

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await service.login(credentials);

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.setSession).toHaveBeenCalled();
    });

    it('should login successfully with username', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          user: mockUser,
          session: mockSession
        }), { status: 200 }))
      );

      mockSupabaseAuth.setSession.and.returnValue(Promise.resolve({ data: {}, error: null }));

      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'password123'
      };

      const result = await service.login(credentials);

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle login failure', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        }), { status: 401 }))
      );

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const result = await service.login(credentials);

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Invalid credentials');
    });

    it('should use fallback message when error is null', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({
          success: false,
          error: null
        }), { status: 401 }))
      );

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const result = await service.login(credentials);

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('error.Invalid credentials');
    });

    it('should handle network error', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await service.login(credentials);

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should return error when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await service.login(credentials);

      expect(result.error?.message).toBe('error.Authentication service not initialized');
    });
  });

  describe('signUp', () => {
    it('should sign up successfully', async () => {
      const mockUser = createMockUser('test@example.com');

      mockSupabaseAuth.signUp.and.returnValue(
        Promise.resolve({
          data: { user: mockUser, session: null },
          error: null
        })
      );

      const result = await service.signUp('test@example.com', 'Password123!');

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        options: {
          data: {
            username: null,
            turnstile_token: null,
            language: 'en'
          }
        }
      });
    });

    it('should sign up with username', async () => {
      const mockUser = createMockUser('test@example.com');

      mockSupabaseAuth.signUp.and.returnValue(
        Promise.resolve({
          data: { user: mockUser, session: null },
          error: null
        })
      );

      const result = await service.signUp('test@example.com', 'Password123!', 'testuser');

      expect(result.user).toEqual(mockUser);
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith(
        jasmine.objectContaining({
          options: jasmine.objectContaining({
            data: jasmine.objectContaining({
              username: 'testuser'
            })
          })
        })
      );
    });

    it('should sign up with turnstile token', async () => {
      const mockUser = createMockUser('test@example.com');

      mockSupabaseAuth.signUp.and.returnValue(
        Promise.resolve({
          data: { user: mockUser, session: null },
          error: null
        })
      );

      const result = await service.signUp('test@example.com', 'Password123!', 'testuser', 'turnstile-token-123');

      expect(result.user).toEqual(mockUser);
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith(
        jasmine.objectContaining({
          options: jasmine.objectContaining({
            data: jasmine.objectContaining({
              username: 'testuser',
              turnstile_token: 'turnstile-token-123'
            })
          })
        })
      );
    });

    it('should reject invalid username', async () => {
      const result = await service.signUp('test@example.com', 'Password123!', 'ab');

      expect(result.user).toBeNull();
      expect(result.error?.message).toBe('error.Invalid username format');
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it('should handle signup error', async () => {
      const mockError: AuthError = {
        message: 'User already exists',
        status: 400
      } as AuthError;

      mockSupabaseAuth.signUp.and.returnValue(
        Promise.resolve({ data: { user: null, session: null }, error: mockError })
      );

      const result = await service.signUp('test@example.com', 'Password123!');

      expect(result.error).toEqual(mockError);
    });

    it('should return error when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.signUp('test@example.com', 'Password123!');

      expect(result.error?.message).toBe('error.Authentication service not initialized');
    });

    it('should handle exception during signup', async () => {
      mockSupabaseAuth.signUp.and.throwError('Network error');

      const result = await service.signUp('test@example.com', 'Password123!');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error?.message).toBe('error.Sign up failed');
      expect(result.error?.status).toBe(500);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.verifyOtp.and.returnValue(
        Promise.resolve({
          data: { user: mockUser, session: mockSession },
          error: null
        })
      );

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email'
      });
    });

    it('should handle invalid OTP', async () => {
      const mockError: AuthError = {
        message: 'Invalid OTP',
        status: 400
      } as AuthError;

      mockSupabaseAuth.verifyOtp.and.returnValue(
        Promise.resolve({ data: { user: null, session: null }, error: mockError })
      );

      const result = await service.verifyOtp('test@example.com', '000000');

      expect(result.error).toEqual(mockError);
    });

    it('should return error when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle exception during OTP verification', async () => {
      mockSupabaseAuth.verifyOtp.and.throwError('Network error');

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error?.message).toBe('error.Verification failed');
      expect(result.error?.status).toBe(500);
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP successfully', async () => {
      mockSupabaseAuth.resend.and.returnValue(
        Promise.resolve({ error: null })
      );

      const result = await service.resendOtp('test@example.com');

      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com'
      });
    });

    it('should handle resend error', async () => {
      const mockError: AuthError = {
        message: 'Too many requests',
        status: 429
      } as AuthError;

      mockSupabaseAuth.resend.and.returnValue(
        Promise.resolve({ error: mockError })
      );

      const result = await service.resendOtp('test@example.com');

      expect(result.error).toEqual(mockError);
    });

    it('should return error when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.resendOtp('test@example.com');

      expect(result.error?.message).toBe('error.Authentication service not initialized');
      expect(result.error?.status).toBe(500);
    });

    it('should handle exception during resend', async () => {
      mockSupabaseAuth.resend.and.throwError('Network error');

      const result = await service.resendOtp('test@example.com');

      expect(result.error?.message).toBe('error.Failed to resend verification code');
      expect(result.error?.status).toBe(500);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Set up default router state (no guards)
      Object.defineProperty(mockRouter, 'routerState', {
        get: () => ({
          root: {
            firstChild: null
          }
        }),
        configurable: true
      });
    });

    it('should logout successfully', async () => {
      // Set authenticated state
      service['currentUser'].set(createMockUser('test@example.com'));
      service['currentSession'].set(createMockSession(createMockUser('test@example.com')));

      mockSupabaseAuth.signOut.and.returnValue(
        Promise.resolve({ error: null })
      );

      await service.logout();

      expect(service.currentUser()).toBeNull();
      expect(service.currentSession()).toBeNull();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('should clear state even on logout error', async () => {
      service['currentUser'].set(createMockUser('test@example.com'));

      const mockError: AuthError = {
        message: 'Logout failed',
        status: 500
      } as AuthError;

      mockSupabaseAuth.signOut.and.returnValue(
        Promise.resolve({ error: mockError })
      );

      await service.logout();

      expect(service.currentUser()).toBeNull();
    });

    it('should return early when Supabase not initialized', async () => {
      (service as any).supabase = null;
      service['currentUser'].set(createMockUser('test@example.com'));

      await service.logout();

      // User should still be set since logout didn't complete
      expect(service.currentUser()).not.toBeNull();
      expect(mockSupabaseAuth.signOut).not.toHaveBeenCalled();
    });

    it('should not redirect when on public route', async () => {
      mockSupabaseAuth.signOut.and.returnValue(
        Promise.resolve({ error: null })
      );

      await service.logout();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should not redirect when route has empty guards array', async () => {
      Object.defineProperty(mockRouter, 'routerState', {
        get: () => ({
          root: {
            firstChild: {
              snapshot: {
                routeConfig: { canActivate: [] }
              } as any,
              firstChild: null
            }
          }
        }),
        configurable: true
      });

      mockSupabaseAuth.signOut.and.returnValue(
        Promise.resolve({ error: null })
      );

      await service.logout();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should redirect when on protected route with AuthGuard', async () => {
      // Use a class declaration instead of function expression
      class AuthGuard {}

      // Update routerState with protected route
      Object.defineProperty(mockRouter, 'routerState', {
        get: () => ({
          root: {
            firstChild: {
              snapshot: {
                routeConfig: {
                  canActivate: [AuthGuard]
                }
              } as any,
              firstChild: null
            }
          }
        }),
        configurable: true
      });

      mockSupabaseAuth.signOut.and.returnValue(
        Promise.resolve({ error: null })
      );

      await service.logout();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should not redirect when route has guards but not AuthGuard', async () => {
      // Create a different guard
      const OtherGuard = function OtherGuard() {};

      // Update routerState with non-auth route
      Object.defineProperty(mockRouter, 'routerState', {
        get: () => ({
          root: {
            firstChild: {
              snapshot: {
                routeConfig: {
                  canActivate: [OtherGuard]
                }
              } as any
            }
          }
        }),
        configurable: true
      });

      mockSupabaseAuth.signOut.and.returnValue(
        Promise.resolve({ error: null })
      );

      await service.logout();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle nested route structure when checking auth', async () => {
      // Use a class declaration
      class AuthGuard {}

      // Update routerState with nested route structure
      Object.defineProperty(mockRouter, 'routerState', {
        get: () => ({
          root: {
            firstChild: {
              firstChild: {
                snapshot: {
                  routeConfig: {
                    canActivate: [AuthGuard]
                  }
                } as any,
                firstChild: null
              }
            }
          }
        }),
        configurable: true
      });

      mockSupabaseAuth.signOut.and.returnValue(
        Promise.resolve({ error: null })
      );

      await service.logout();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should recognize AuthGuard as class instance', async () => {
      // Mock guard as class instance (not function)
      const mockAuthGuardInstance = {
        constructor: { name: 'AuthGuard' }
      };

      // Update routerState with class instance guard
      Object.defineProperty(mockRouter, 'routerState', {
        get: () => ({
          root: {
            firstChild: {
              snapshot: {
                routeConfig: {
                  canActivate: [mockAuthGuardInstance as any]
                }
              } as any
            }
          }
        }),
        configurable: true
      });

      mockSupabaseAuth.signOut.and.returnValue(
        Promise.resolve({ error: null })
      );

      await service.logout();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('getToken', () => {
    it('should return access token when authenticated', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      const token = await service.getToken();

      expect(token).toBe('mock-access-token');
    });

    it('should return null when not authenticated', async () => {
      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );

      const token = await service.getToken();

      expect(token).toBeNull();
    });

    it('should return null on SSR', async () => {
      mockPlatformService.isSSR.and.returnValue(true);

      const token = await service.getToken();

      expect(token).toBeNull();
    });

    it('should handle exception during token retrieval', async () => {
      mockSupabaseAuth.getSession.and.throwError('Network error');

      const token = await service.getToken();

      expect(token).toBeNull();
    });
  });

  describe('password reset', () => {
    it('should request password reset successfully', async () => {
      mockSupabaseAuth.resetPasswordForEmail.and.returnValue(
        Promise.resolve({ error: null })
      );

      const result = await service.requestPasswordReset('test@example.com');

      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalled();
    });

    it('should handle requestPasswordReset error response', async () => {
      const mockError: AuthError = {
        message: 'Rate limit exceeded',
        status: 429
      } as AuthError;

      mockSupabaseAuth.resetPasswordForEmail.and.returnValue(
        Promise.resolve({ error: mockError })
      );

      const result = await service.requestPasswordReset('test@example.com');

      expect(result.error).toEqual(mockError);
    });

    it('should verify password reset OTP', async () => {
      mockSupabaseAuth.verifyOtp.and.returnValue(
        Promise.resolve({ data: {}, error: null })
      );

      const result = await service.verifyPasswordResetOtp('test@example.com', '123456');

      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'recovery'
      });
    });

    it('should handle verifyPasswordResetOtp error response', async () => {
      const mockError: AuthError = {
        message: 'Invalid OTP',
        status: 400
      } as AuthError;

      mockSupabaseAuth.verifyOtp.and.returnValue(
        Promise.resolve({ data: {}, error: mockError })
      );

      const result = await service.verifyPasswordResetOtp('test@example.com', '123456');

      expect(result.error).toEqual(mockError);
    });

    it('should update password successfully', async () => {
      mockSupabaseAuth.updateUser.and.returnValue(
        Promise.resolve({ data: {}, error: null })
      );

      service['isPasswordRecovery'].set(true);

      const result = await service.updatePassword('NewPassword123!');

      expect(result.error).toBeNull();
      expect(service.isPasswordRecovery()).toBe(false);
    });

    it('should handle updatePassword error response', async () => {
      const mockError: AuthError = {
        message: 'Password too weak',
        status: 400
      } as AuthError;

      mockSupabaseAuth.updateUser.and.returnValue(
        Promise.resolve({ data: {}, error: mockError })
      );

      const result = await service.updatePassword('weak');

      expect(result.error).toEqual(mockError);
    });

    it('should handle requestPasswordReset when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.requestPasswordReset('test@example.com');

      expect(result.error?.message).toBe('error.Authentication service not initialized');
      expect(result.error?.status).toBe(500);
    });

    it('should handle exception during requestPasswordReset', async () => {
      mockSupabaseAuth.resetPasswordForEmail.and.throwError('Network error');

      const result = await service.requestPasswordReset('test@example.com');

      expect(result.error?.message).toBe('error.Password reset failed');
      expect(result.error?.status).toBe(500);
    });

    it('should handle verifyPasswordResetOtp when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.verifyPasswordResetOtp('test@example.com', '123456');

      expect(result.error?.message).toBe('error.Authentication service not initialized');
      expect(result.error?.status).toBe(500);
    });

    it('should handle exception during verifyPasswordResetOtp', async () => {
      mockSupabaseAuth.verifyOtp.and.throwError('Network error');

      const result = await service.verifyPasswordResetOtp('test@example.com', '123456');

      expect(result.error?.message).toBe('error.Verification failed');
      expect(result.error?.status).toBe(500);
    });

    it('should handle updatePassword when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.updatePassword('NewPassword123!');

      expect(result.error?.message).toBe('error.Authentication service not initialized');
      expect(result.error?.status).toBe(500);
    });

    it('should handle exception during updatePassword', async () => {
      mockSupabaseAuth.updateUser.and.throwError('Network error');

      const result = await service.updatePassword('NewPassword123!');

      expect(result.error?.message).toBe('error.Password update failed');
      expect(result.error?.status).toBe(500);
    });
  });

  describe('updateEmail', () => {
    it('should update email successfully', async () => {
      mockSupabaseAuth.updateUser.and.returnValue(
        Promise.resolve({ data: {}, error: null })
      );

      const result = await service.updateEmail('newemail@example.com');

      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
        email: 'newemail@example.com'
      });
    });

    it('should handle email update error', async () => {
      const mockError: AuthError = {
        message: 'Email already exists',
        status: 400
      } as AuthError;

      mockSupabaseAuth.updateUser.and.returnValue(
        Promise.resolve({ data: {}, error: mockError })
      );

      const result = await service.updateEmail('newemail@example.com');

      expect(result.error).toEqual(mockError);
    });

    it('should handle updateEmail when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.updateEmail('newemail@example.com');

      expect(result.error?.message).toBe('error.Authentication service not initialized');
      expect(result.error?.status).toBe(500);
    });

    it('should handle exception during updateEmail', async () => {
      mockSupabaseAuth.updateUser.and.throwError('Network error');

      const result = await service.updateEmail('newemail@example.com');

      expect(result.error?.message).toBe('error.Email update failed');
      expect(result.error?.status).toBe(500);
    });
  });

  describe('return URL management', () => {
    it('should set return URL', () => {
      service.setReturnUrl('/profile');

      expect(service.hasReturnUrl()).toBe(true);
    });

    it('should get and clear return URL', () => {
      service.setReturnUrl('/profile');

      const url = service.getAndClearReturnUrl();

      expect(url).toBe('/profile');
      expect(service.hasReturnUrl()).toBe(false);
    });

    it('should return null when no return URL set', () => {
      const url = service.getAndClearReturnUrl();

      expect(url).toBeNull();
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      const mockBlob = new Blob(['{"test": "data"}'], { type: 'application/json' });
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(mockBlob, { status: 200 }))
      );

      // Mock DOM methods
      const mockAnchor = document.createElement('a');
      spyOn(document, 'createElement').and.returnValue(mockAnchor);
      spyOn(mockAnchor, 'click');
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');

      const result = await service.exportUserData();

      expect(result.error).toBeNull();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should handle export error when not authenticated', async () => {
      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );

      const result = await service.exportUserData();

      expect(result.error?.message).toBe('Not authenticated');
    });

    it('should handle exportUserData when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.exportUserData();

      expect(result.error?.message).toBe('Supabase not initialized');
    });

    it('should handle export error response', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({ error: 'Export failed' }), { status: 500 }))
      );

      const result = await service.exportUserData();

      expect(result.error?.message).toBe('Export failed');
    });

    it('should use fallback message when export error is null', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({ error: null }), { status: 500 }))
      );

      const result = await service.exportUserData();

      expect(result.error?.message).toBe('Failed to export data');
    });

    it('should handle exception during exportUserData', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      (window.fetch as jasmine.Spy).and.throwError('Network error');

      const result = await service.exportUserData();

      expect(result.error).toBeTruthy();
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      );

      service['currentUser'].set(mockUser);

      const result = await service.deleteAccount();

      expect(result.error).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.currentSession()).toBeNull();
    });

    it('should handle delete error when not authenticated', async () => {
      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );

      const result = await service.deleteAccount();

      expect(result.error?.message).toBe('Not authenticated');
    });

    it('should handle deleteAccount when Supabase not initialized', async () => {
      (service as any).supabase = null;

      const result = await service.deleteAccount();

      expect(result.error?.message).toBe('Supabase not initialized');
    });

    it('should handle delete error response', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500 }))
      );

      const result = await service.deleteAccount();

      expect(result.error?.message).toBe('Delete failed');
    });

    it('should use fallback message when delete error is null', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(JSON.stringify({ error: null }), { status: 500 }))
      );

      const result = await service.deleteAccount();

      expect(result.error?.message).toBe('Failed to delete account');
    });

    it('should handle exception during deleteAccount', async () => {
      const mockUser = createMockUser('test@example.com');
      const mockSession = createMockSession(mockUser);

      mockSupabaseAuth.getSession.and.returnValue(
        Promise.resolve({ data: { session: mockSession }, error: null })
      );

      (window.fetch as jasmine.Spy).and.throwError('Network error');

      const result = await service.deleteAccount();

      expect(result.error).toBeTruthy();
    });
  });
});

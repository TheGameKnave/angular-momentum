import request from 'supertest';
import express, { Express } from 'express';
import { createAuthRoutes } from './auth.routes';

describe('Auth Routes', () => {
  let app: Express;
  let mockSupabase: any;
  let mockUsernameService: any;
  let mockTurnstileService: any;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset all mocks completely to prevent state leakage
    jest.resetAllMocks();

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Restore NODE_ENV to original value before each test
    process.env.NODE_ENV = originalNodeEnv;

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        signInWithPassword: jest.fn(),
        admin: {
          deleteUser: jest.fn(),
          getUserById: jest.fn(),
        },
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    // Mock UsernameService
    mockUsernameService = {
      validateUsername: jest.fn(),
      checkAvailability: jest.fn(),
      createUsername: jest.fn(),
      getEmailByUsername: jest.fn(),
    };

    // Mock TurnstileService
    mockTurnstileService = {
      verifyFromMetadata: jest.fn(),
    };

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRoutes(mockSupabase, mockUsernameService, mockTurnstileService));
  });

  afterEach(() => {
    // Restore NODE_ENV to original value
    process.env.NODE_ENV = originalNodeEnv;
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('POST /webhook/signup-verification', () => {
    it('should return 503 if Supabase is not configured', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/auth', createAuthRoutes(null, mockUsernameService, mockTurnstileService));

      const response = await request(appWithoutSupabase)
        .post('/api/auth/webhook/signup-verification')
        .send({ record: { id: 'user-123' } });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED',
      });
    });

    it('should return 400 if webhook payload is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/webhook/signup-verification')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'WEBHOOK_INVALID_PAYLOAD',
      });
    });

    it('should skip verification in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/auth/webhook/signup-verification')
        .send({
          record: {
            id: 'user-123',
            raw_user_meta_data: { turnstile_token: 'token' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'User verified (dev mode - no CAPTCHA check)',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should verify user successfully with valid CAPTCHA', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockTurnstileService.verifyFromMetadata.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/webhook/signup-verification')
        .send({
          record: {
            id: 'user-123',
            raw_user_meta_data: { turnstile_token: 'valid-token' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'User verified',
      });
      expect(mockTurnstileService.verifyFromMetadata).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should delete user if CAPTCHA verification fails', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockTurnstileService.verifyFromMetadata.mockResolvedValue({
        success: false,
        error: 'Invalid CAPTCHA',
      });
      mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/auth/webhook/signup-verification')
        .send({
          record: {
            id: 'user-123',
            raw_user_meta_data: { turnstile_token: 'invalid-token' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'CAPTCHA verification failed - user deleted',
        verification_failed: true,
      });
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');

      process.env.NODE_ENV = originalEnv;
    });

    it('should return 500 if user deletion fails after CAPTCHA failure', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockTurnstileService.verifyFromMetadata.mockResolvedValue({
        success: false,
        error: 'Invalid CAPTCHA',
      });
      mockSupabase.auth.admin.deleteUser.mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      const response = await request(app)
        .post('/api/auth/webhook/signup-verification')
        .send({
          record: {
            id: 'user-123',
            raw_user_meta_data: { turnstile_token: 'invalid-token' },
          },
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'CAPTCHA_CLEANUP_FAILED',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should return 500 if an unexpected error occurs in webhook (catch block line 118-124)', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Make verifyFromMetadata throw an exception
      mockTurnstileService.verifyFromMetadata.mockImplementation(() => {
        throw new Error('Turnstile service error');
      });

      const response = await request(app)
        .post('/api/auth/webhook/signup-verification')
        .send({
          record: {
            id: 'user-123',
            raw_user_meta_data: { turnstile_token: 'token' },
          },
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Turnstile service error',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle non-Error throws in webhook catch block', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Make verifyFromMetadata throw a non-Error value
      mockTurnstileService.verifyFromMetadata.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .post('/api/auth/webhook/signup-verification')
        .send({
          record: {
            id: 'user-123',
            raw_user_meta_data: { turnstile_token: 'token' },
          },
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Unknown error',
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('POST /username/validate', () => {
    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/username/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        valid: false,
        error: 'USERNAME_REQUIRED',
      });
    });

    it('should return 503 if username service is not configured', async () => {
      const appWithoutService = express();
      appWithoutService.use(express.json());
      appWithoutService.use('/api/auth', createAuthRoutes(mockSupabase, null, mockTurnstileService));

      const response = await request(appWithoutService)
        .post('/api/auth/username/validate')
        .send({ username: 'testuser' });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        valid: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED',
      });
    });

    it('should validate username successfully', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/username/validate')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        valid: true,
        fingerprint: 'testuser',
        error: null,
      });
      expect(mockUsernameService.validateUsername).toHaveBeenCalledWith('TestUser');
    });

    it('should return validation error for invalid username', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: false,
        error: 'Username too short',
      });

      const response = await request(app)
        .post('/api/auth/username/validate')
        .send({ username: 'ab' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        valid: false,
        error: 'USERNAME_NOT_AVAILABLE',
      });
    });
  });

  describe('POST /username/check', () => {
    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/username/check')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        available: false,
        error: 'USERNAME_REQUIRED',
      });
    });

    it('should return 503 if username service is not configured', async () => {
      const appWithoutService = express();
      appWithoutService.use(express.json());
      appWithoutService.use('/api/auth', createAuthRoutes(mockSupabase, null, mockTurnstileService));

      const response = await request(appWithoutService)
        .post('/api/auth/username/check')
        .send({ username: 'testuser' });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        available: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED',
      });
    });

    it('should return unavailable if validation fails', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: false,
        error: 'Username contains invalid characters',
      });

      const response = await request(app)
        .post('/api/auth/username/check')
        .send({ username: 'invalid@user' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        available: false,
        error: 'USERNAME_NOT_AVAILABLE',
      });
    });

    it('should check username availability', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });
      mockUsernameService.checkAvailability.mockResolvedValue({
        available: true,
      });

      const response = await request(app)
        .post('/api/auth/username/check')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        available: true,
        fingerprint: 'testuser',
      });
      expect(mockUsernameService.checkAvailability).toHaveBeenCalledWith('testuser');
    });

    it('should return unavailable if username is taken', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });
      mockUsernameService.checkAvailability.mockResolvedValue({
        available: false,
        error: 'Username already taken',
      });

      const response = await request(app)
        .post('/api/auth/username/check')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        available: false,
        error: 'Username already taken',
        fingerprint: 'testuser',
      });
    });
  });

  describe('POST /username/create', () => {
    it('should return 400 if userId or username is missing', async () => {
      const response1 = await request(app)
        .post('/api/auth/username/create')
        .send({ username: 'testuser' });

      expect(response1.status).toBe(400);
      expect(response1.body).toEqual({
        success: false,
        error: 'USERNAME_REQUIRED',
      });

      const response2 = await request(app)
        .post('/api/auth/username/create')
        .send({ userId: 'user-123' });

      expect(response2.status).toBe(400);
      expect(response2.body).toEqual({
        success: false,
        error: 'USERNAME_REQUIRED',
      });
    });

    it('should return 503 if username service is not configured', async () => {
      const appWithoutService = express();
      appWithoutService.use(express.json());
      appWithoutService.use('/api/auth', createAuthRoutes(mockSupabase, null, mockTurnstileService));

      const response = await request(appWithoutService)
        .post('/api/auth/username/create')
        .send({ userId: 'user-123', username: 'testuser' });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED',
      });
    });

    it('should return error if validation fails', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: false,
        error: 'Username too short',
      });

      const response = await request(app)
        .post('/api/auth/username/create')
        .send({ userId: 'user-123', username: 'ab' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_NOT_AVAILABLE',
      });
    });

    it('should create username successfully', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });
      mockUsernameService.createUsername.mockResolvedValue({
        success: true,
        fingerprint: 'testuser',
      });

      const response = await request(app)
        .post('/api/auth/username/create')
        .send({ userId: 'user-123', username: 'TestUser' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        fingerprint: 'testuser',
      });
      expect(mockUsernameService.createUsername).toHaveBeenCalledWith(
        'user-123',
        'TestUser',
        'testuser'
      );
    });
  });

  describe('POST /login', () => {
    it('should return 400 if identifier or password is missing', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response1.status).toBe(400);
      expect(response1.body).toEqual({
        success: false,
        error: 'AUTH_INVALID_CREDENTIALS',
      });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'user@example.com' });

      expect(response2.status).toBe(400);
      expect(response2.body).toEqual({
        success: false,
        error: 'AUTH_INVALID_CREDENTIALS',
      });
    });

    it('should return 503 if services are not configured', async () => {
      const appWithoutServices = express();
      appWithoutServices.use(express.json());
      appWithoutServices.use('/api/auth', createAuthRoutes(null, null, mockTurnstileService));

      const response = await request(appWithoutServices)
        .post('/api/auth/login')
        .send({ identifier: 'user@example.com', password: 'password123' });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED',
      });
    });

    it('should login with email successfully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockSession = { access_token: 'token-123' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'user@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        user: mockUser,
        session: mockSession,
      });
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    it('should login with username successfully', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockSession = { access_token: 'token-123' };

      mockUsernameService.getEmailByUsername.mockResolvedValue('user@example.com');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        user: mockUser,
        session: mockSession,
      });
      expect(mockUsernameService.getEmailByUsername).toHaveBeenCalledWith('testuser');
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    it('should return 401 if username not found', async () => {
      mockUsernameService.getEmailByUsername.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'nonexistent', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_INVALID_CREDENTIALS',
      });
    });

    it('should return 401 if password is incorrect', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'user@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_INVALID_CREDENTIALS',
      });
    });
  });

  describe('GET /username', () => {
    it('should return 503 if Supabase is not configured', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/auth', createAuthRoutes(null, mockUsernameService, mockTurnstileService));

      const response = await request(appWithoutSupabase)
        .get('/api/auth/username')
        .set('Authorization', 'Bearer token-123');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED',
      });
    });

    it('should return 401 if Authorization header is missing', async () => {
      const response = await request(app).get('/api/auth/username');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED',
      });
    });

    it('should return 401 if Authorization header is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/username')
        .set('Authorization', 'Invalid token-123');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED',
      });
    });

    it('should return 401 if token is invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .get('/api/auth/username')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED',
      });
    });

    it('should return username if found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { username: 'TestUser', fingerprint: 'testuser' },
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        username: 'TestUser',
        fingerprint: 'testuser',
      });
    });

    it('should return null if username not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        username: null,
        fingerprint: null,
      });
    });

    it('should return 500 for database errors (not PGRST116, lines 411-412)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'OTHER_ERROR', message: 'Database error' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'DATABASE_ERROR',
      });
    });

    it('should return 500 if an unexpected error occurs (catch block)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Make the database query throw an exception
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const response = await request(app)
        .get('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'UNKNOWN_ERROR',
      });
    });

    it('should handle non-Error throws in GET /username catch block', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Make the database query throw a non-Error value
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .get('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'UNKNOWN_ERROR',
      });
    });
  });

  describe('PUT /username', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
    });

    it('should return 503 if Supabase is not configured (line 462)', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/auth', createAuthRoutes(null, mockUsernameService, mockTurnstileService));

      const response = await request(appWithoutSupabase)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED'
      });
    });

    it('should return 503 if usernameService is not configured (line 462)', async () => {
      const appWithoutUsernameService = express();
      appWithoutUsernameService.use(express.json());
      appWithoutUsernameService.use('/api/auth', createAuthRoutes(mockSupabase, null, mockTurnstileService));

      const response = await request(appWithoutUsernameService)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED'
      });
    });

    it('should return 401 if authentication fails (line 482)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer invalid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED'
      });
    });

    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_REQUIRED',
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .put('/api/auth/username')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED',
      });
    });

    it('should return 400 if validation fails', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: false,
        error: 'Username too short',
      });

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'ab' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_NOT_AVAILABLE',
      });
    });

    it('should update display name when fingerprint belongs to current user', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Mock availability check - fingerprint belongs to current user
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: 'user-123' },
              error: null,
            }),
          }),
        }),
      };

      // Mock getting current username - user has one
      const getCurrentMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { username: 'testuser' },
              error: null,
            }),
          }),
        }),
      };

      // Mock update - updates display name
      const updateMock = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { username: 'TestUser', fingerprint: 'testuser' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockReturnValueOnce(getCurrentMock)
        .mockReturnValueOnce(updateMock);

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        username: 'TestUser',
        fingerprint: 'testuser',
      });
    });

    it('should return 409 if username is taken by another user', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: 'different-user' },
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_NOT_AVAILABLE',
      });
    });

    it('should update existing username', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'newusername',
      });

      // Mock availability check - username is available
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Mock getting current username - user has one
      const getCurrentMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { username: 'OldUsername' },
              error: null,
            }),
          }),
        }),
      };

      // Mock update
      const updateMock = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { username: 'NewUsername', fingerprint: 'newusername' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockReturnValueOnce(getCurrentMock)
        .mockReturnValueOnce(updateMock);

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'NewUsername' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        username: 'NewUsername',
        fingerprint: 'newusername',
      });
    });

    it('should create new username if user does not have one', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Mock availability check - username is available
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Mock getting current username - user doesn't have one
      const getCurrentMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Mock insert
      const insertMock = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { username: 'TestUser', fingerprint: 'testuser' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockReturnValueOnce(getCurrentMock)
        .mockReturnValueOnce(insertMock);

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        username: 'TestUser',
        fingerprint: 'testuser',
      });
    });

    it('should return 500 if availability check returns error (lines 507-508)', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Make availability check return an error in response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection error' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'DATABASE_ERROR',
      });
    });

    it('should return 500 if availability check throws exception (catch block)', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Make availability check throw an exception
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_UPDATE_FAILED',
      });
    });

    it('should return 500 if getting current username returns error (lines 539-540)', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Mock availability check succeeds
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Make getting current username return error in response
      const getCurrentMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed to query current username' },
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockReturnValueOnce(getCurrentMock);

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_UPDATE_FAILED',
      });
    });

    it('should return 500 if getting current username throws exception (catch block)', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Mock availability check succeeds
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Make getting current username throw an exception
      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockImplementationOnce(() => {
          throw new Error('Unexpected error');
        });

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_UPDATE_FAILED',
      });
    });

    it('should return 500 if username update returns error (lines 561-562)', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'newusername',
      });

      // Mock availability check - username is available
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Mock getting current username - user has one
      const getCurrentMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { username: 'OldUsername' },
              error: null,
            }),
          }),
        }),
      };

      // Make update return error in response
      const updateMock = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update operation failed' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockReturnValueOnce(getCurrentMock)
        .mockReturnValueOnce(updateMock);

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'NewUsername' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_UPDATE_FAILED',
      });
    });

    it('should return 500 if username update throws exception (catch block)', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'newusername',
      });

      // Mock availability check - username is available
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Mock getting current username - user has one
      const getCurrentMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { username: 'OldUsername' },
              error: null,
            }),
          }),
        }),
      };

      // Make update throw an exception
      const updateMock = {
        update: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockReturnValueOnce(getCurrentMock)
        .mockReturnValueOnce(updateMock);

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'NewUsername' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_UPDATE_FAILED',
      });
    });

    it('should return 500 if username insert returns error (lines 582-583)', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Mock availability check - username is available
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Mock getting current username - user doesn't have one
      const getCurrentMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Make insert return error in response
      const insertMock = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert operation failed' },
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockReturnValueOnce(getCurrentMock)
        .mockReturnValueOnce(insertMock);

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_UPDATE_FAILED',
      });
    });

    it('should return 500 if username insert throws exception (catch block)', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Mock availability check - username is available
      const availabilityMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Mock getting current username - user doesn't have one
      const getCurrentMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      // Make insert throw an exception
      const insertMock = {
        insert: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(availabilityMock)
        .mockReturnValueOnce(getCurrentMock)
        .mockReturnValueOnce(insertMock);

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_UPDATE_FAILED',
      });
    });

    it('should handle non-Error throws in PUT /username catch block', async () => {
      mockUsernameService.validateUsername.mockReturnValue({
        valid: true,
        fingerprint: 'testuser',
      });

      // Make availability check throw a non-Error value
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .put('/api/auth/username')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'TestUser' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_UPDATE_FAILED',
      });
    });
  });

  describe('DELETE /username', () => {
    it('should return 503 if Supabase is not configured (line 620)', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/auth', createAuthRoutes(null, mockUsernameService, mockTurnstileService));

      const response = await request(appWithoutSupabase)
        .delete('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED'
      });
    });

    it('should return 401 if authentication fails (line 640)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .delete('/api/auth/username')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED'
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).delete('/api/auth/username');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED',
      });
    });

    it('should delete username successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const response = await request(app)
        .delete('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
      });
    });

    it('should return 500 if deletion fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Database error' },
          }),
        }),
      });

      const response = await request(app)
        .delete('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_DELETE_FAILED',
      });
    });

    it('should return 500 if an unexpected error occurs (catch block line 666-667)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Make the database query throw an exception
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected delete error');
      });

      const response = await request(app)
        .delete('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_DELETE_FAILED',
      });
    });

    it('should handle non-Error throws in DELETE /username catch block', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Make the database query throw a non-Error value
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .delete('/api/auth/username')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'USERNAME_DELETE_FAILED',
      });
    });
  });

  describe('GET /export-data', () => {
    it('should return 503 if Supabase is not configured (line 685)', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/auth', createAuthRoutes(null, mockUsernameService, mockTurnstileService));

      const response = await request(appWithoutSupabase)
        .get('/api/auth/export-data')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED'
      });
    });

    it('should return 401 if authentication fails (line 705)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .get('/api/auth/export-data')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED'
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/auth/export-data');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED',
      });
    });

    it('should export user data successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        last_sign_in_at: '2024-01-03',
        user_metadata: { foo: 'bar' },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock username query
      const usernameMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { username: 'TestUser', fingerprint: 'testuser' },
            }),
          }),
        }),
      };

      // Mock settings query
      const settingsMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { timezone: 'America/New_York' },
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(usernameMock)
        .mockReturnValueOnce(settingsMock);

      const response = await request(app)
        .get('/api/auth/export-data')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('export_date');
      expect(response.body).toHaveProperty('user_profile');
      expect(response.body.user_profile.id).toBe('user-123');
      expect(response.body.username).toEqual({
        username: 'TestUser',
        fingerprint: 'testuser',
      });
      expect(response.body.user_settings).toEqual({
        timezone: 'America/New_York',
      });
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
    });

    it('should handle missing username and settings', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        last_sign_in_at: '2024-01-03',
        user_metadata: {},
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const emptyMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(emptyMock)
        .mockReturnValueOnce(emptyMock);

      const response = await request(app)
        .get('/api/auth/export-data')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.username).toBeNull();
      expect(response.body.user_settings).toBeNull();
    });

    it('should return 500 if an unexpected error occurs (catch block line 765-766)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      });

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      });

      // Make the database query throw an exception
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Failed to export data');
      });

      const response = await request(app)
        .get('/api/auth/export-data')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'DATA_EXPORT_FAILED',
      });
    });

    it('should handle non-Error throws in GET /export-data catch block', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      });

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      });

      // Make the database query throw a non-Error value
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .get('/api/auth/export-data')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'DATA_EXPORT_FAILED',
      });
    });

    it('should return 500 if admin.getUserById returns error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      });

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found' },
      });

      const response = await request(app)
        .get('/api/auth/export-data')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'DATA_EXPORT_FAILED',
      });
    });
  });

  describe('DELETE /delete-account', () => {
    it('should return 503 if Supabase is not configured (line 788)', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/auth', createAuthRoutes(null, mockUsernameService, mockTurnstileService));

      const response = await request(appWithoutSupabase)
        .delete('/api/auth/delete-account')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED'
      });
    });

    it('should return 401 if authentication fails (line 808)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED'
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).delete('/api/auth/delete-account');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_UNAUTHORIZED',
      });
    });

    it('should delete account and all data successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const deleteMock = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValue(deleteMock);

      mockSupabase.auth.admin.deleteUser.mockResolvedValue({
        error: null,
      });

      const response = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
      });
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should return 500 if user deletion fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const deleteMock = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(deleteMock);

      mockSupabase.auth.admin.deleteUser.mockResolvedValue({
        error: { message: 'Failed to delete user' },
      });

      const response = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'DATA_DELETE_FAILED',
      });
    });

    it('should return 500 if an unexpected error occurs (catch block line 854-855)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Make the database query throw an exception
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected account deletion error');
      });

      const response = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'DATA_DELETE_FAILED',
      });
    });

    it('should handle non-Error throws in DELETE /delete-account catch block', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Make the database query throw a non-Error value
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'DATA_DELETE_FAILED',
      });
    });
  });

  describe('POST /login', () => {
    it('should return 500 if an unexpected error occurs (catch block line 342-348)', async () => {
      // Make getEmailByUsername throw an exception
      mockUsernameService.getEmailByUsername.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'testuser', password: 'password123' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_LOGIN_FAILED',
      });
    });
  });
});

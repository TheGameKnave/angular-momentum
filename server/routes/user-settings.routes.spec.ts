import request from 'supertest';
import express, { Express } from 'express';
import { createUserSettingsRoutes } from './user-settings.routes';

describe('User Settings Routes', () => {
  let app: Express;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    // Reset all mocks completely to prevent state leakage between tests
    jest.resetAllMocks();

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Mock Supabase client pair - separate auth and db clients
    // This matches the new architecture where auth client handles token validation
    // and db client handles database operations (to ensure service role bypasses RLS)
    const mockAuthClient = {
      auth: {
        getUser: jest.fn(),
      },
    };

    const mockDbClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    };

    mockSupabase = {
      auth: mockAuthClient as any,
      db: mockDbClient as any,
    };

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/user-settings', createUserSettingsRoutes(mockSupabase));
  });

  afterEach(() => {
    // Restore console methods and reset mocks
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('GET /', () => {
    it('should return 500 if Supabase is not configured', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/user-settings', createUserSettingsRoutes(null));

      const response = await request(appWithoutSupabase)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer token-123');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Supabase not configured',
      });
    });

    it('should return 401 if Authorization header is missing', async () => {
      const response = await request(app).get('/api/user-settings');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should return 401 if Authorization header is invalid', async () => {
      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Invalid token-123');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should return 401 if token is invalid', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should return user settings if found', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'America/New_York',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockSupabase.db.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
      expect(mockSupabase.auth.auth.getUser).toHaveBeenCalledWith('valid-token');
    });

    it('should return 404 if settings not found', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // Supabase no rows found error
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ data: null });
    });

    it('should return 500 for other database errors', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'OTHER' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database error' });
    });

    it('should handle exceptions during query', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unexpected error' });
    });

    it('should handle non-Error throws in GET catch block', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unknown error' });
    });
  });

  describe('POST /', () => {
    it('should return 500 if Supabase is not configured', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/user-settings', createUserSettingsRoutes(null));

      const response = await request(appWithoutSupabase)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer token-123')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Supabase not configured',
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/user-settings')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should return 400 if timezone is missing', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Timezone is required',
      });
    });

    it('should return 400 if timezone is not a string', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Timezone is required',
      });
    });

    it('should create user settings successfully', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'America/New_York',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockSupabase.db.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ data: mockSettings });
    });

    it('should return 500 if database insert fails', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Insert failed' });
    });

    it('should handle exceptions during insert', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unexpected error' });
    });

    it('should handle non-Error throws in POST catch block', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unknown error' });
    });
  });

  describe('PUT /', () => {
    it('should return 500 if Supabase is not configured', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/user-settings', createUserSettingsRoutes(null));

      const response = await request(appWithoutSupabase)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer token-123')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Supabase not configured',
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .put('/api/user-settings')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should return 400 if timezone is missing', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Timezone is required',
      });
    });

    it('should return 400 if timezone is not a string', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: null });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Timezone is required',
      });
    });

    it('should upsert user settings successfully (create new)', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'America/New_York',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
    });

    it('should upsert user settings successfully (update existing)', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'Europe/London',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Europe/London' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
    });

    it('should call upsert with correct parameters', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockUpsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      });

      mockSupabase.db.from.mockReturnValue({
        upsert: mockUpsert,
      });

      await request(app)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Asia/Tokyo' });

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user-123',
          timezone: 'Asia/Tokyo',
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      );
    });

    it('should return 500 if database upsert fails', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Upsert failed' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Upsert failed' });
    });

    it('should handle exceptions during upsert', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unexpected error' });
    });

    it('should handle non-Error throws in PUT catch block', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .put('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unknown error' });
    });
  });

  describe('PATCH /', () => {
    it('should return 500 if Supabase is not configured', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/user-settings', createUserSettingsRoutes(null));

      const response = await request(appWithoutSupabase)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer token-123')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Supabase not configured',
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .patch('/api/user-settings')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should return 400 if no valid fields provided', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'At least one valid field is required (timezone, theme_preference, or language)',
      });
    });

    it('should return 400 if timezone is invalid type', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'At least one valid field is required (timezone, theme_preference, or language)',
      });
    });

    it('should return 400 if theme_preference is invalid', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ theme_preference: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'At least one valid field is required (timezone, theme_preference, or language)',
      });
    });

    it('should update timezone successfully', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'Europe/London',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Europe/London' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
    });

    it('should broadcast settings update via WebSocket when io is configured', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'America/New_York',
        theme_preference: 'dark',
        language: 'en-US',
        created_at: '2024-01-01',
        updated_at: '2024-01-02T12:00:00Z',
      };

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      // Set up mock io on the app
      const mockIo = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      app.set('io', mockIo);

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(200);
      expect(mockIo.to).toHaveBeenCalledWith('user:user-123');
      expect(mockIo.emit).toHaveBeenCalledWith('user-settings-updated', {
        timezone: 'America/New_York',
        theme_preference: 'dark',
        language: 'en-US',
        updated_at: '2024-01-02T12:00:00Z',
      });
    });

    it('should return 500 if database update fails', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Upsert failed' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Europe/London' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Upsert failed' });
    });

    it('should return 404 if user was deleted (foreign key violation)', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23503', message: 'foreign key violation' },
            }),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Europe/London' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });

    it('should handle exceptions during update', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Europe/London' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unexpected error' });
    });

    it('should handle non-Error throws in PATCH catch block', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Europe/London' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unknown error' });
    });

    it('should update theme_preference to dark successfully', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'UTC',
        theme_preference: 'dark',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ theme_preference: 'dark' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
    });

    it('should update theme_preference to light successfully', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'UTC',
        theme_preference: 'light',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ theme_preference: 'light' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
    });

    it('should update both timezone and theme_preference together', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'America/New_York',
        theme_preference: 'light',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      const mockUpsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });

      mockSupabase.db.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York', theme_preference: 'light' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
      expect(mockUpsert).toHaveBeenCalledWith(
        { user_id: 'user-123', timezone: 'America/New_York', theme_preference: 'light' },
        { onConflict: 'user_id', ignoreDuplicates: false }
      );
    });

    it('should update language successfully', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'UTC',
        language: 'es',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockSupabase.db.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ language: 'es' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
    });

    it('should update all fields together', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockSettings = {
        id: 'settings-123',
        user_id: 'user-123',
        timezone: 'America/New_York',
        theme_preference: 'light',
        language: 'fr',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      const mockUpsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });

      mockSupabase.db.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'America/New_York', theme_preference: 'light', language: 'fr' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: mockSettings });
      expect(mockUpsert).toHaveBeenCalledWith(
        { user_id: 'user-123', timezone: 'America/New_York', theme_preference: 'light', language: 'fr' },
        { onConflict: 'user_id', ignoreDuplicates: false }
      );
    });

    it('should return 400 if language is invalid type', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ language: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'At least one valid field is required (timezone, theme_preference, or language)',
      });
    });
  });

  describe('DELETE /', () => {
    it('should return 500 if Supabase is not configured', async () => {
      const appWithoutSupabase = express();
      appWithoutSupabase.use(express.json());
      appWithoutSupabase.use('/api/user-settings', createUserSettingsRoutes(null));

      const response = await request(appWithoutSupabase)
        .delete('/api/user-settings')
        .set('Authorization', 'Bearer token-123');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Supabase not configured',
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .delete('/api/user-settings');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should delete user settings successfully', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const response = await request(app)
        .delete('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(204);
    });

    it('should return 500 if database delete fails', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      });

      const response = await request(app)
        .delete('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Delete failed' });
    });

    it('should handle exceptions during delete', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .delete('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unexpected error' });
    });

    it('should handle non-Error throws in DELETE catch block', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .delete('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unknown error' });
    });
  });

  describe('Authentication helper', () => {
    it('should extract user ID from valid Bearer token', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { timezone: 'UTC' },
              error: null,
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer test-token-123');

      expect(mockSupabase.auth.auth.getUser).toHaveBeenCalledWith('test-token-123');
      expect(response.status).toBe(200);
    });

    it('should handle malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'NotBearer token-123');

      expect(response.status).toBe(401);
    });

    it('should handle empty Bearer token', async () => {
      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
    });
  });

  describe('Error handling', () => {
    it('should return 401 if auth service throws error', async () => {
      mockSupabase.auth.auth.getUser.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.db.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          }),
        }),
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});

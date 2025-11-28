import request from 'supertest';
import express, { Express } from 'express';
import { createUserSettingsRoutes } from './user-settings.routes';

describe('User Settings Routes', () => {
  let app: Express;
  let mockSupabase: any;

  beforeEach(() => {
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    };

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/user-settings', createUserSettingsRoutes(mockSupabase));
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
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
      mockSupabase.auth.getUser.mockResolvedValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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

      mockSupabase.from.mockReturnValue({
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
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });

    it('should return 404 if settings not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unexpected error' });
    });

    it('should handle non-Error throws in GET catch block', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
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
      mockSupabase.auth.getUser.mockResolvedValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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

      mockSupabase.from.mockReturnValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
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
      mockSupabase.auth.getUser.mockResolvedValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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

      mockSupabase.from.mockReturnValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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

      mockSupabase.from.mockReturnValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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

      mockSupabase.from.mockReturnValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
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

    it('should return 400 if timezone is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Timezone is required',
      });
    });

    it('should update timezone successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
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

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSettings,
                error: null,
              }),
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

    it('should return 500 if database update fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Europe/London' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Update failed' });
    });

    it('should handle exceptions during update', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

      const response = await request(app)
        .patch('/api/user-settings')
        .set('Authorization', 'Bearer valid-token')
        .send({ timezone: 'Europe/London' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Unknown error' });
    });
  });

  describe('Authentication helper', () => {
    it('should extract user ID from valid Bearer token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
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

      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('test-token-123');
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
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
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

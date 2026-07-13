import http from 'http';
import express, { Express, Router } from 'express';
import request from 'supertest';
import { SupabaseClient } from '@supabase/supabase-js';
import { isAuthEnforced, requireAuthForMutations } from './requireAuth';

describe('Require Auth Middleware', () => {
  let app: Express;
  let server: http.Server;
  let activeRouter: Router;
  const originalNodeEnv = process.env.NODE_ENV;

  // Single keep-alive listener per file. Each test composes its middleware
  // chain into a fresh Router and assigns it to activeRouter, so per-test
  // configuration variation (enforced env, supabase presence) still works.
  beforeAll(async () => {
    app = express();
    app.use((req, res, next) => activeRouter(req, res, next));
    server = app.listen(0);
    await new Promise<void>(resolve => server.once('listening', () => resolve()));
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  beforeEach(() => {
    activeRouter = Router();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  function mockSupabase(getUserResult: { data: { user: { id: string } | null }; error: Error | null }): SupabaseClient {
    return {
      auth: {
        getUser: jest.fn().mockResolvedValue(getUserResult)
      }
    } as unknown as SupabaseClient;
  }

  function mountRoutes(supabase: SupabaseClient | null) {
    activeRouter.use(requireAuthForMutations(supabase));
    activeRouter.get('/test', (_req, res) => res.json({ read: true }));
    activeRouter.put('/test', (_req, res) => res.json({ written: true }));
  }

  describe('isAuthEnforced', () => {
    it('should not enforce in test or development environments', () => {
      process.env.NODE_ENV = 'test';
      expect(isAuthEnforced()).toBe(false);

      process.env.NODE_ENV = 'development';
      expect(isAuthEnforced()).toBe(false);
    });

    it('should enforce in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isAuthEnforced()).toBe(true);
    });
  });

  describe('requireAuthForMutations', () => {
    it('should pass mutations through when auth is not enforced (test env)', async () => {
      mountRoutes(null);

      const response = await request(server).put('/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ written: true });
    });

    it('should pass safe methods through without auth even when enforced', async () => {
      process.env.NODE_ENV = 'production';
      const supabase = mockSupabase({ data: { user: null }, error: new Error('unused') });
      mountRoutes(supabase);

      const response = await request(server).get('/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ read: true });
      expect(supabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should return 503 for mutations when supabase is not configured and auth is enforced', async () => {
      process.env.NODE_ENV = 'production';
      mountRoutes(null);

      const response = await request(server).put('/test');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ error: 'AUTH_SERVICE_NOT_CONFIGURED' });
    });

    it('should return 401 for mutations without a bearer token when enforced', async () => {
      process.env.NODE_ENV = 'production';
      const supabase = mockSupabase({ data: { user: { id: 'user-123' } }, error: null });
      mountRoutes(supabase);

      const response = await request(server).put('/test');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'AUTH_UNAUTHORIZED' });
      expect(supabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should return 401 for mutations with an invalid token when enforced', async () => {
      process.env.NODE_ENV = 'production';
      const supabase = mockSupabase({ data: { user: null }, error: new Error('bad token') });
      mountRoutes(supabase);

      const response = await request(server)
        .put('/test')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'AUTH_UNAUTHORIZED' });
      expect(supabase.auth.getUser).toHaveBeenCalledWith('invalid-token');
    });

    it('should allow mutations with a valid token when enforced', async () => {
      process.env.NODE_ENV = 'production';
      const supabase = mockSupabase({ data: { user: { id: 'user-123' } }, error: null });
      mountRoutes(supabase);

      const response = await request(server)
        .put('/test')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ written: true });
      expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });
  });
});

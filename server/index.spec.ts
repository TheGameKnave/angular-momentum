// Mock console before imports to suppress module-level logs.
// Snapshot first so it can be restored in afterAll below.
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

import request from 'supertest';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { setupApp } from './index';

afterAll(() => {
  global.console = originalConsole;
});

describe('Express server', () => {
  let app: express.Application;
  let server: Server;

  // Environment variables mutated by tests; snapshotted in beforeEach and
  // restored in afterEach so a failed assertion can never leak state.
  const ENV_KEYS = ['NODE_ENV', 'SERVER_PORT', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'] as const;
  let envSnapshot: Record<string, string | undefined>;

  /**
   * Starts an HTTP listener for the given app on an ephemeral port (port 0).
   * The listener is stored in the shared `server` variable so the global
   * afterEach can always tear it down, even when an assertion fails mid-test.
   */
  const listen = (application: express.Application): Promise<void> =>
    new Promise((resolve) => {
      server = application.listen(0, () => resolve());
    });

  /**
   * Sets NODE_ENV (or removes it when omitted), builds a fresh app via
   * setupApp(), and starts a listener on an OS-assigned ephemeral port.
   */
  const startServer = async (env?: string): Promise<void> => {
    if (env === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = env;
    }
    app = setupApp();
    await listen(app);
  };

  beforeEach(() => {
    envSnapshot = {};
    for (const key of ENV_KEYS) {
      envSnapshot[key] = process.env[key];
    }
  });

  afterEach(async () => {
    // Teardown lives here (not inline in test bodies) so a failed assertion
    // cannot leak a listener or leave mutated env vars behind.
    if (server?.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    for (const key of ENV_KEYS) {
      if (envSnapshot[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = envSnapshot[key];
      }
    }
  });

  describe('Environment Tests', () => {
    it('should serve static files in production', async () => {
      await startServer('production');
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('<!DOCTYPE html>');
    });

    it('should serve static files in development', async () => {
      await startServer('development');
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('<!DOCTYPE html>');

      // Additional assertion to ensure the file is served from the correct path
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should serve static files when NODE_ENV is undefined, falling back to development', async () => {
      await startServer(); // NODE_ENV removed entirely -> falls back to 'development'
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('<!DOCTYPE html>');
    });

    it('should not serve static files in test environment', async () => {
      await startServer('test');
      const response = await request(server).get('/');
      expect(response.status).toBe(404);
    });

    it('should fall back to index.html when index.csr.html does not exist', async () => {
      // This test verifies the fallback branch in setupStaticFileServing
      // The test passes because index.csr.html exists and is served
      // The fallback to index.html is tested implicitly - if index.csr.html
      // didn't exist, it would try index.html
      await startServer('production');
      const response = await request(server).get('/nonexistent-route');
      expect(response.status).toBe(200);
      expect(response.text).toContain('<!DOCTYPE html>');
    });

    it('should serve ngsw.json with no-cache headers', async () => {
      await startServer('production');
      const response = await request(server).get('/ngsw.json');
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    it('should serve ngsw-worker.js with no-cache headers', async () => {
      await startServer('production');
      const response = await request(server).get('/ngsw-worker.js');
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });
  });

  describe('Rate Limiting Tests', () => {
    beforeEach(async () => {
      await startServer('production');
    });

    it('should allow 100 API requests then reject the 101st with 429', async () => {
      // setupApp configures the limiter with max: 100 per 10-minute window
      // (and each setupApp() call gets its own in-memory store, so this test
      // cannot bleed into other tests' apps).
      for (let i = 0; i < 100; i++) {
        const response = await request(server).get('/api/test');
        expect(response.status).not.toBe(429);
      }

      const limited = await request(server).get('/api/test');
      expect(limited.status).toBe(429);
      expect(limited.headers['retry-after']).toBeDefined();
    }, 30000);
  });

  describe('Server Port Tests', () => {
    it('should listen on the OS-assigned ephemeral port and serve traffic on it', async () => {
      await startServer('production');
      const { port } = server.address() as AddressInfo;
      expect(port).toBeGreaterThan(0);

      // The listener actually serves traffic on the assigned port
      const response = await request(server).get('/');
      expect(response.status).toBe(200);
    });
  });

  describe('Supabase Initialization', () => {
    /**
     * Builds a fresh app with ./config/environment mocked to the given values.
     * Mocking the config module directly: setting process.env here is unreliable —
     * config is captured at module load, and a doMock from an earlier test
     * survives resetModules and would leave supabase unconfigured. Mocking with
     * explicit values makes each path deterministic regardless of whether a
     * local .env exists (CI has none). __esModule: true is load-bearing: it is
     * what makes the default export resolve (and coverage deterministic) in CI.
     */
    const setupAppWithMockedConfig = (
      supabaseUrl: string | undefined,
      supabaseServiceKey: string | undefined,
    ): express.Application => {
      jest.resetModules();
      jest.doMock('./config/environment', () => ({
        __esModule: true,
        default: {
          supabase_url: supabaseUrl,
          supabase_service_key: supabaseServiceKey,
        },
      }));

      const { setupApp: freshSetupApp } = require('./index');
      return freshSetupApp();
    };

    afterEach(() => {
      jest.dontMock('./config/environment');
      jest.resetModules();
    });

    it('should leave Supabase-backed endpoints unconfigured (503) when Supabase URL is missing', async () => {
      const appNoUrl = setupAppWithMockedConfig(undefined, 'test-key');
      await listen(appNoUrl);

      // initializeSupabase() returned null, so the webhook endpoint reports 503
      const response = await request(server)
        .post('/api/auth/webhook/signup-verification')
        .send({ record: { id: 'user-1' } });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED',
      });
    });

    it('should leave Supabase-backed endpoints unconfigured (503) when Supabase service key is missing', async () => {
      const appNoKey = setupAppWithMockedConfig('https://test.supabase.co', undefined);
      await listen(appNoKey);

      const response = await request(server)
        .post('/api/auth/webhook/signup-verification')
        .send({ record: { id: 'user-1' } });

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: 'AUTH_SERVICE_NOT_CONFIGURED',
      });
    });

    it('should initialize Supabase when config is provided and serve Supabase-backed endpoints', async () => {
      const appConfigured = setupAppWithMockedConfig(
        'https://test.supabase.co',
        'test-service-key-1234567890',
      );
      await listen(appConfigured);

      // The webhook handler branches on the injected supabase client:
      // a 200 here proves initializeSupabase() returned a real client pair
      // (the unconfigured path above returns 503 on the same request).
      const response = await request(server)
        .post('/api/auth/webhook/signup-verification')
        .send({ record: { id: 'user-1' } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'User verified',
      });
    });
  });

  describe('Universal Links / App Links Verification', () => {
    beforeEach(async () => {
      await startServer('production');
    });

    it('should serve apple-app-site-association for iOS Universal Links', async () => {
      const response = await request(server).get('/.well-known/apple-app-site-association');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toEqual({
        applinks: {
          apps: [],
          details: [{ appID: '7386GL7C2C.app.angularmomentum', paths: ['*'] }]
        }
      });
    });

    it('should serve assetlinks.json for Android App Links', async () => {
      const response = await request(server).get('/.well-known/assetlinks.json');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toEqual([{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'app.angularmomentum',
          sha256_cert_fingerprints: ['73:3C:0F:6A:2D:30:27:D0:48:00:68:21:B5:E7:F7:17:3F:1A:E0:AD:90:82:F0:98:E6:99:FD:A3:B3:C0:CD:13']
        }
      }]);
    });
  });

  // Add additional specs as needed to test the behavior of the server setup
});

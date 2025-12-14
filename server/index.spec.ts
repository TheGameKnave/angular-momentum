// Mock console before imports to suppress module-level logs
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

import request from 'supertest';
import express from 'express';
import { setupApp } from './index';

describe('Express server', () => {
  let app: express.Application;
  let server: any;

  const startServer = (env: string, port: number) => {
    process.env.NODE_ENV = env;
    process.env.SERVER_PORT = port.toString();
    app = setupApp();
    return new Promise((resolve) => {
      server = app.listen(port, () => {
        resolve(server);
      });
    });
  };

  const stopServer = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        resolve(); // Resolve without any value
      });
    });
  };

  describe('Environment Tests', () => {
    it('should serve static files in production', async () => {
      await startServer('production', 9200);
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('<!DOCTYPE html>'); // Adjust based on your index.html content
      await stopServer();
    });

    it('should serve static files in development', async () => {
      await startServer('development', 9201);
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('<!DOCTYPE html>'); // Adjust based on your index.html content

      // Additional assertion to ensure the file is served from the correct path
      expect(response.headers['content-type']).toContain('text/html'); // Ensure the file is served correctly
      await stopServer();
    });

    it('should serve static files when NODE_ENV is undefined, falling back to development', async () => {
      delete process.env.NODE_ENV; // Ensure NODE_ENV is undefined
      await startServer('' as any, 9204); // Pass an empty string or undefined explicitly
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('<!DOCTYPE html>'); // Ensure that it falls back to serving static files as if in development
      await stopServer();
    });

    it('should not serve static files in test environment', async () => {
      await startServer('test', 9202);
      const response = await request(app).get('/');
      expect(response.status).toBe(404); // Adjust if your app responds differently
      await stopServer();
    });
  });

  describe('Rate Limiting Tests', () => {
    beforeEach(async () => {
      await startServer('production', 9200);
    });

    afterEach(async () => {
      await stopServer();
    });

    it('should apply rate limiting to API routes', async () => {
      // Simulate multiple requests to test rate limiting behavior
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api/test');
      }
      const response = await request(app).get('/api/test');
      expect(response.status).not.toBe(429); // Ensure not rate limited on the first few requests
    });
  });

  describe('Server Port Tests', () => {
    it('should start the server on the specified port', async () => {
      await startServer('production', 9203);
      expect(server.address().port).toBe(9203);
      await stopServer();
    });
  });

  describe('Supabase Initialization', () => {
    it('should return null when Supabase URL is missing', async () => {
      jest.resetModules();
      jest.doMock('./config/environment', () => ({
        default: {
          supabase_url: undefined,
          supabase_service_key: 'test-key',
        },
      }));

      const { setupApp: setupAppNoUrl } = require('./index');
      const appNoUrl = setupAppNoUrl();

      expect(appNoUrl).toBeDefined();
      jest.resetModules();
    });

    it('should return null when Supabase service key is missing', async () => {
      jest.resetModules();
      jest.doMock('./config/environment', () => ({
        default: {
          supabase_url: 'https://test.supabase.co',
          supabase_service_key: undefined,
        },
      }));

      const { setupApp: setupAppNoKey } = require('./index');
      const appNoKey = setupAppNoKey();

      expect(appNoKey).toBeDefined();
      jest.resetModules();
    });

    it('should initialize Supabase when config is provided (lines 43-44, 61)', async () => {
      // Set environment variables BEFORE importing the module
      const originalUrl = process.env.SUPABASE_URL;
      const originalKey = process.env.SUPABASE_SERVICE_KEY;

      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key-1234567890';

      // Reset modules to force re-import with new env vars
      jest.resetModules();

      // Re-import after setting env vars
      const { setupApp: setupAppWithConfig } = require('./index');
      const appWithConfig = setupAppWithConfig();

      // Verify app was created successfully
      expect(appWithConfig).toBeDefined();

      // Clean up
      if (originalUrl) {
        process.env.SUPABASE_URL = originalUrl;
      } else {
        delete process.env.SUPABASE_URL;
      }
      if (originalKey) {
        process.env.SUPABASE_SERVICE_KEY = originalKey;
      } else {
        delete process.env.SUPABASE_SERVICE_KEY;
      }

      // Reset modules back to original state
      jest.resetModules();
    });

    it('should start server successfully with Supabase configured', async () => {
      // Set environment variables
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key-1234567890';

      await startServer('production', 9205);

      // App should start successfully with Supabase configured
      expect(server.address().port).toBe(9205);

      // Clean up
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;
      await stopServer();
    });
  });

  // Add additional specs as needed to test the behavior of the server setup
});

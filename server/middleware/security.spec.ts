import http from 'http';
import express, { Express, Router } from 'express';
import request from 'supertest';
import { securityHeaders } from './security';

describe('Security Headers Middleware', () => {
  let app: Express;
  let server: http.Server;
  let activeRouter: Router;

  // Single keep-alive listener per file. Each test composes its middleware
  // chain into a fresh Router and assigns it to activeRouter, so per-test
  // configuration variation (HSTS on/off, CSP variants, etc.) still works.
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

  it('should set default security headers', async () => {
    activeRouter.use(securityHeaders());
    activeRouter.get('/test', (_req, res) => res.send('ok'));

    const response = await request(server).get('/test');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('0');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['permissions-policy']).toContain('camera=()');
    expect(response.headers['permissions-policy']).toContain('microphone=()');
  });

  it('should remove x-powered-by header', async () => {
    activeRouter.use(securityHeaders());
    activeRouter.get('/test', (_req, res) => res.send('ok'));

    const response = await request(server).get('/test');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should not set HSTS when enableHSTS is false', async () => {
    activeRouter.use(securityHeaders({ enableHSTS: false }));
    activeRouter.get('/test', (_req, res) => res.send('ok'));

    const response = await request(server).get('/test');

    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  it('should set HSTS when enableHSTS is true', async () => {
    activeRouter.use(securityHeaders({ enableHSTS: true }));
    activeRouter.get('/test', (_req, res) => res.send('ok'));

    const response = await request(server).get('/test');

    expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('should use custom HSTS max-age', async () => {
    activeRouter.use(securityHeaders({ enableHSTS: true, hstsMaxAge: 86400 }));
    activeRouter.get('/test', (_req, res) => res.send('ok'));

    const response = await request(server).get('/test');

    expect(response.headers['strict-transport-security']).toBe('max-age=86400; includeSubDomains');
  });

  it('should not set CSP when contentSecurityPolicy is "none"', async () => {
    activeRouter.use(securityHeaders({ contentSecurityPolicy: 'none' }));
    activeRouter.get('/test', (_req, res) => res.send('ok'));

    const response = await request(server).get('/test');

    expect(response.headers['content-security-policy']).toBeUndefined();
  });

  it('should set CSP when contentSecurityPolicy is provided', async () => {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'";
    activeRouter.use(securityHeaders({ contentSecurityPolicy: csp }));
    activeRouter.get('/test', (_req, res) => res.send('ok'));

    const response = await request(server).get('/test');

    expect(response.headers['content-security-policy']).toBe(csp);
  });

  it('should not set CSP when contentSecurityPolicy is undefined', async () => {
    activeRouter.use(securityHeaders());
    activeRouter.get('/test', (_req, res) => res.send('ok'));

    const response = await request(server).get('/test');

    expect(response.headers['content-security-policy']).toBeUndefined();
  });
});

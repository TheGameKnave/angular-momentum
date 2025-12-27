import express, { Express } from 'express';
import request from 'supertest';
import { securityHeaders } from './security';

describe('Security Headers Middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
  });

  it('should set default security headers', async () => {
    app.use(securityHeaders());
    app.get('/test', (_req, res) => res.send('ok'));

    const response = await request(app).get('/test');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('0');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['permissions-policy']).toContain('camera=()');
    expect(response.headers['permissions-policy']).toContain('microphone=()');
  });

  it('should remove x-powered-by header', async () => {
    app.use(securityHeaders());
    app.get('/test', (_req, res) => res.send('ok'));

    const response = await request(app).get('/test');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should not set HSTS when enableHSTS is false', async () => {
    app.use(securityHeaders({ enableHSTS: false }));
    app.get('/test', (_req, res) => res.send('ok'));

    const response = await request(app).get('/test');

    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  it('should set HSTS when enableHSTS is true', async () => {
    app.use(securityHeaders({ enableHSTS: true }));
    app.get('/test', (_req, res) => res.send('ok'));

    const response = await request(app).get('/test');

    expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('should use custom HSTS max-age', async () => {
    app.use(securityHeaders({ enableHSTS: true, hstsMaxAge: 86400 }));
    app.get('/test', (_req, res) => res.send('ok'));

    const response = await request(app).get('/test');

    expect(response.headers['strict-transport-security']).toBe('max-age=86400; includeSubDomains');
  });

  it('should not set CSP when contentSecurityPolicy is "none"', async () => {
    app.use(securityHeaders({ contentSecurityPolicy: 'none' }));
    app.get('/test', (_req, res) => res.send('ok'));

    const response = await request(app).get('/test');

    expect(response.headers['content-security-policy']).toBeUndefined();
  });

  it('should set CSP when contentSecurityPolicy is provided', async () => {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'";
    app.use(securityHeaders({ contentSecurityPolicy: csp }));
    app.get('/test', (_req, res) => res.send('ok'));

    const response = await request(app).get('/test');

    expect(response.headers['content-security-policy']).toBe(csp);
  });

  it('should not set CSP when contentSecurityPolicy is undefined', async () => {
    app.use(securityHeaders());
    app.get('/test', (_req, res) => res.send('ok'));

    const response = await request(app).get('/test');

    expect(response.headers['content-security-policy']).toBeUndefined();
  });
});

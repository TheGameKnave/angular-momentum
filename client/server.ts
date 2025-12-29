import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import compression from 'compression';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import bootstrap from './src/main.server';
import { ACCEPT_LANGUAGE } from './src/app/providers/ssr-language.provider';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const API_PORT = process.env['API_PORT'] || 4201;

const app = express();
app.disable('x-powered-by');

// Security headers middleware
app.use((_req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Disable XSS auditor (CSP is preferred)
  res.setHeader('X-XSS-Protection', '0');
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Restrict browser features
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  // HSTS - production only (Heroku handles SSL termination)
  if (process.env['NODE_ENV'] === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Enable gzip compression for all responses
app.use(compression());

const commonEngine = new CommonEngine();

/**
 * Proxy /api, /gql, and /socket.io requests to the backend server.
 * Note: We use pathFilter instead of app.use('/path') to preserve the full path
 */
const apiProxy = createProxyMiddleware({
  target: `http://localhost:${API_PORT}`,
  changeOrigin: true,
  ws: true,
  pathFilter: ['/api', '/gql', '/socket.io'],
  on: {
    error: (err, _req, res) => {
      console.error('[Proxy Error]', err.message);
      if ('headersSent' in res && !res.headersSent) {
        (res as express.Response).status(502).json({ error: 'Backend unavailable' });
      }
    },
  },
});
app.use(apiProxy);

// Service worker manifest must never be cached - it tells the SW when updates are available
app.get('/ngsw.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(join(browserDistFolder, 'ngsw.json'));
});

// Serve static files from browser dist folder
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
  })
);

// SSR render timeout to prevent hanging
const SSR_TIMEOUT = 5000;

/**
 * Parse a cookie value from Cookie header.
 * @param cookieHeader - The Cookie header value
 * @param name - The cookie name to find
 * @returns The cookie value or null
 */
function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const pattern = new RegExp(String.raw`(?:^|;\s*)${name}=([^;]+)`);
  const match = pattern.exec(cookieHeader);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Check if request has an authenticated session (Supabase auth token cookie).
 * @param cookieHeader - The Cookie header value
 * @returns True if authenticated
 */
function hasAuthToken(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  // Supabase auth cookie pattern: sb-{project-ref}-auth-token
  return /sb-[a-z]+-auth-token/.test(cookieHeader);
}

// All regular routes use the Angular engine
app.get('*', (req, res) => {
  const { protocol, originalUrl, headers } = req;

  // Skip SSR for authenticated users - no SEO benefit, reduces server load
  if (hasAuthToken(headers.cookie)) {
    return res.sendFile(join(browserDistFolder, 'index.csr.html'));
  }

  // Prefer lang cookie over Accept-Language header
  const langCookie = parseCookie(headers.cookie, 'lang');
  const acceptLanguage = langCookie || headers['accept-language'] || '';

  const renderPromise = commonEngine.render({
    bootstrap,
    documentFilePath: indexHtml,
    url: `${protocol}://${headers.host}${originalUrl}`,
    publicPath: browserDistFolder,
    providers: [
      { provide: 'REQUEST', useValue: req },
      { provide: ACCEPT_LANGUAGE, useValue: acceptLanguage },
    ],
  });

  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('SSR render timeout')), SSR_TIMEOUT);
  });

  Promise.race([renderPromise, timeoutPromise])
    .then((html) => res.send(html))
    .catch((err) => {
      console.error('SSR Error:', err.message);
      // Fallback to client-side rendering
      res.sendFile(join(browserDistFolder, 'index.csr.html'));
    });
});

const port = process.env['PORT'] || process.env['SSR_PORT'] || 4000;

// Create HTTP server and attach WebSocket upgrade handler for socket.io proxy
const server = createServer(app);
server.on('upgrade', apiProxy.upgrade);

server.listen(port, () => {
  /**/console.log(`Node Express server listening on http://localhost:${port}`);
});

export { app, server };

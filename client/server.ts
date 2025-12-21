import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import compression from 'compression';
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

// Enable gzip compression for all responses
app.use(compression());

const commonEngine = new CommonEngine();

// Proxy API and GraphQL requests to backend server
app.use(
  ['/api', '/gql'],
  createProxyMiddleware({
    target: `http://localhost:${API_PORT}`,
    changeOrigin: true,
  })
);

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

app.listen(port, () => {
  /**/console.log(`Node Express server listening on http://localhost:${port}`);
});

export { app };

# Server-Side Rendering (SSR)

This project uses Angular SSR with an Express server for production builds.

## Configuration

SSR is configured differently per environment:

| Environment | SSR Enabled | Configuration |
|-------------|-------------|---------------|
| Development | No | `ng serve` uses CSR only for fast rebuilds |
| Staging | Yes | Mirrors production |
| Production | Yes | Full SSR with Express server |

## Architecture

The production deployment uses two servers:

```
┌─────────────────────────────────────────────────────────────┐
│                         Heroku                              │
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────────┐  │
│  │   SSR Server        │      │   API Server            │  │
│  │   (PORT from env)   │─────▶│   (API_PORT=4201)       │  │
│  │                     │      │                         │  │
│  │  • Angular SSR      │      │  • REST API             │  │
│  │  • Static files     │      │  • GraphQL              │  │
│  │  • Proxies /api,/gql│      │  • WebSocket            │  │
│  └─────────────────────┘      └─────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **SSR Server** (`client/server.ts`): Handles all incoming HTTP requests on the main port
  - Serves SSR-rendered pages for anonymous users (SEO)
  - Serves CSR fallback for authenticated users
  - Proxies `/api` and `/gql` requests to the API server
- **API Server** (`server/index.ts`): Runs on port 4201
  - REST API endpoints
  - GraphQL endpoint
  - WebSocket connections

## Testing SSR Locally

Since SSR is disabled for development, use a production build to test SSR locally:

```bash
# Build with production config (SSR enabled)
cd client && npm run build

# Terminal 1: Start API server on port 4201
cd server && API_PORT=4201 ts-node index.ts

# Terminal 2: Start SSR server on port 4000
cd client && node dist/angular-momentum/server/server.mjs
```

The SSR server runs on port 4000 by default (configurable via `PORT` or `SSR_PORT` env vars). It proxies API requests to port 4201.

## SSR Server Features

The Express SSR server (`client/server.ts`) provides:

- **Auth-aware rendering**: Authenticated users (with Supabase auth cookie) get CSR for speed; anonymous users get SSR for SEO
- **Language detection**: Reads `lang` cookie first, falls back to browser's `Accept-Language` header, then defaults to English
- **Gzip compression**: All responses are compressed for faster transfer
- **Render timeout**: 5-second timeout prevents hanging; falls back to CSR on timeout
- **API proxy**: Routes `/api` and `/gql` to the backend server
- **Static file serving**: Serves browser assets with 1-year cache

## Writing SSR-Safe Code

Browser-only APIs (`localStorage`, `window`, `document`, `navigator`, `requestAnimationFrame`, etc.) are not available during SSR. Use platform guards:

```typescript
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class MyService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  doSomething(): void {
    // istanbul ignore next - SSR guard
    if (!this.isBrowser) return;

    // Safe to use browser APIs here
    localStorage.setItem('key', 'value');
  }
}
```

For directives that access the DOM in lifecycle hooks:

```typescript
ngOnInit(): void {
  // istanbul ignore next - SSR guard
  if (!this.isBrowser) return;

  this.hostElement = this.el.nativeElement;
}
```

## Common SSR Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `localStorage is not defined` | Accessing localStorage during SSR | Add `isBrowser` guard |
| `window is not defined` | Accessing window during SSR | Add `isBrowser` guard |
| `document is not defined` | Accessing document during SSR | Add `isBrowser` guard |
| `requestAnimationFrame is not defined` | Using rAF during SSR | Add `isBrowser` guard |
| `navigator is not defined` | Accessing navigator during SSR | Add `isBrowser` guard |

## E2E Tests

E2E tests run against the development server (CSR only) to avoid SSR complexity during testing. The Playwright config starts `npm run start:e2e` which uses the development configuration with e2e-specific settings.

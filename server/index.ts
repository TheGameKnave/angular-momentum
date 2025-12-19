import path from 'path';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import pino from 'express-pino-logger';
import config from './config/environment';
import rateLimit from 'express-rate-limit';
import { setupWebSocket } from './services/websocketService';
import { graphqlMiddleware } from './services/graphqlService';
import { createApiRoutes } from './routes/index';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UsernameService } from './services/usernameService';
import turnstileService from './services/turnstileService';
import { ALLOWED_ORIGINS } from './constants/server.constants';

/**
 * Configures static file serving for the Angular application based on the environment.
 * Sets up static file serving with 1-hour caching and SPA routing fallback for production, staging, and development environments.
 * All routes are redirected to index.html to support client-side routing.
 * @param app - Express application instance to configure
 * @param env - Environment string (production, staging, or development)
 */
function setupStaticFileServing(app: express.Application, env: string) {
  if (env === 'production' || env === 'staging' || env === 'development') {
    const dirname = path.resolve(__dirname, '../client/dist/angular-momentum/browser');
    app.use(express.static(dirname, { maxAge: 3600000 }));

    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(dirname, 'index.html'));
    });
  }
}

/**
 * Initialize Supabase client
 * @returns Supabase client or null if not configured
 */
function initializeSupabase(): SupabaseClient | null {
  if (!config.supabase_url || !config.supabase_service_key) {
    return null;
  }

  return createClient(config.supabase_url, config.supabase_service_key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Initialize Username Service
 * @returns Username service or null if not configured
 */
function initializeUsernameService(): UsernameService | null {
  if (!config.supabase_url || !config.supabase_service_key) {
    return null;
  }

  return new UsernameService(
    config.supabase_url,
    config.supabase_service_key
  );
}

/**
 * Creates and configures the Express application with all middleware and routes.
 * Sets up CORS (allowing multiple origins including localhost, staging, and production domains),
 * error logging via Pino, JSON body parsing, rate limiting (100 requests per 10 minutes),
 * GraphQL API endpoint at /api, and static file serving for the Angular app.
 * @returns Configured Express application instance ready to be attached to an HTTP server
 */
export function setupApp(): express.Application {
  const app = express();
  const logger = pino({level: 'error'});

  // CORS: 🔐 allow origins before anything else
  app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  }));
  app.set('trust proxy', 1);
  app.use(logger);
  app.use(express.json());

  // Rate limiting for API endpoints (disabled in dev/test environments)
  const apiLimiter = rateLimit({
    windowMs: 10/*minutes*/ * 60/*seconds*/ * 1000/*milliseconds*/,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => {
      // Disable rate limiting entirely in development/test environments
      return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    }
  });

  app.use(express.urlencoded({ extended: true }));

  // Initialize dependencies
  const supabase = initializeSupabase();
  const usernameService = initializeUsernameService();

  // Create API routes with dependency injection
  const apiRoutes = createApiRoutes(supabase, usernameService, turnstileService);

  // REST API routes (preferred) - MUST come before static file serving
  app.use('/api', apiLimiter, apiRoutes);

  // GraphQL endpoint - MUST come before static file serving
  // Uses /gql to avoid collision with /graphql-api client route
  app.all('/gql', apiLimiter, graphqlMiddleware());

  // Static file serving with catch-all MUST come last
  setupStaticFileServing(app, process.env.NODE_ENV || 'development');

  return app;
}

// Initialize server and WebSocket
// istanbul ignore next
if (require.main === module) {
  const app = setupApp();
  const server = createServer(app);

  // Initialize Supabase for WebSocket auth
  const supabase = initializeSupabase();
  const io = setupWebSocket(server, supabase);

  app.set('io', io);

  const PORT = Number(config.server_port);
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  server.listen(PORT, '0.0.0.0', () => {});
}

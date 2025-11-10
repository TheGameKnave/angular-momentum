import path from 'path';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import pino from 'express-pino-logger';
import config from './config/environment';
import rateLimit from 'express-rate-limit';
import { setupWebSocket } from './services/websocketService';
import { graphqlMiddleware } from './services/graphqlService';

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

    app.get('*', (req, res) => {
      res.sendFile(path.join(dirname, 'index.html'));
    });
  }
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
    origin: [
      'http://localhost:4200',
      'http://192.168.1.x:4200',
      'https://dev.angularmomentum.app',
      'https://staging.angularmomentum.app',
      'https://angularmomentum.app',
      'https://angularmomentum.app',
      'tauri://localhost', // for tauri ios
      'http://tauri.localhost', // for tauri android
    ],
    credentials: true,
  }));
  app.options('*', cors()); // Optional: preflight all routes
  
  app.set('trust proxy', 1);
  app.use(logger);
  app.use(express.json());

  setupStaticFileServing(app, process.env.NODE_ENV || 'development');
  
  // Initialize GraphQL
  const graphqlLimiter = rateLimit({
    windowMs: 10/*minutes*/ * 60/*seconds*/ * 1000/*milliseconds*/,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(express.urlencoded({ extended: true })); // Add this line
  app.all('/api', graphqlLimiter, graphqlMiddleware());
  
  return app;
}

// Initialize server and WebSocket
// istanbul ignore next
if (require.main === module) {
  const app = setupApp();
  const server = createServer(app);

  const io = setupWebSocket(server);

  app.set('io', io);

  const PORT = Number(config.server_port);
  server.listen(PORT, '0.0.0.0', () => {
    /**/console.log(`Server is running on http://localhost:${PORT}`);
  });
}

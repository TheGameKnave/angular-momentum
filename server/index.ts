import path from 'path';
import express from 'express';
import { createServer } from 'http';
import pino from 'express-pino-logger';
import config from './config/environment';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/api';
import { setupWebSocket } from './services/websocketService';
import { graphqlMiddleware } from './services/graphqlService';

declare global {
  var cache: {
    [resource: string]: {
      time: Date;
      data: any;
    };
  };
}
global.cache = {};

function setupStaticFileServing(app: express.Application, env: string) {
  if (env === 'production' || env === 'staging' || env === 'development') {
    const dirname = path.resolve(__dirname, '../client/dist/angular-boilerplate/browser');
    app.use(express.static(dirname, { maxAge: 3600000 }));

    app.get('*', (req, res) => {
      res.sendFile(path.join(dirname, 'index.html'));
    });
  }
}

export function setupApp(): express.Application {
  const app = express();
  const logger = pino({level: 'error'});
  
  app.use(logger);
  app.use(express.json());

  const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use((req, res, next) => {
    next();
  });
  app.use('/api', apiLimiter);
  app.use('/api', apiRouter);

  setupStaticFileServing(app, process.env.NODE_ENV || 'development');
  
  const graphqlLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Initialize GraphQL
  app.use(express.urlencoded({ extended: true })); // Add this line
  app.all('/graphql', graphqlLimiter, graphqlMiddleware());
  
  return app;
}

// Initialize server and WebSocket
// istanbul ignore next
if (require.main === module) {
  const app = setupApp();
  const server = createServer(app);

  const io = setupWebSocket(server);

  app.set('io', io);

  const PORT = config.server_port;
  server.listen(PORT, () => {
  });
}

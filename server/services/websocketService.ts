import { Server as SocketIOServer } from 'socket.io';
import { readFeatureFlags } from './lowDBService';
import { Server as HTTPServer } from 'http';
import { ALLOWED_ORIGINS } from '../constants/server.constants';

/**
 * Initializes and configures the Socket.IO WebSocket server
 * @param server - HTTP server instance to attach Socket.IO to
 * @returns Configured Socket.IO server instance
 * @description Sets up WebSocket with CORS configuration, connection handlers, and automatic feature flag synchronization for new clients
 */
export function setupWebSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization"],
      credentials: true
    },
  });

  /* eslint-disable @typescript-eslint/no-empty-function */
  // istanbul ignore next
  io.engine.on('headers', (_headers, _request) => {});
  // istanbul ignore next
  io.engine.on('connection', (_socket) => {});
  // istanbul ignore next
  io.engine.on('disconnect', (_socket) => {});
  // istanbul ignore next
  io.use((socket, next) => {
    // Proceed with connection
    next();
  });
  io.on('connect_error', (_err) => {});
  /* eslint-enable @typescript-eslint/no-empty-function */
  // Handle WebSocket connections
  io.on('connection', async (socket) => {

    // Send the current flags when a client connects
    const featureFlags = await readFeatureFlags();
    socket.emit('update-feature-flags', featureFlags);

    /* eslint-disable @typescript-eslint/no-empty-function */
    // istanbul ignore next
    socket.onAny((_event, ..._args) => {});

    socket.on('disconnect', () => {});
    /* eslint-enable @typescript-eslint/no-empty-function */
  });

  return io;
}
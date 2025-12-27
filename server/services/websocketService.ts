import { Server as SocketIOServer } from 'socket.io';
import { readFeatureFlags } from './lowDBService';
import { Server as HTTPServer } from 'node:http';
import { ALLOWED_ORIGINS } from '../constants/server.constants';
import { joinUserRoom, leaveUserRoom } from './userSettingsSocketService';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Initializes and configures the Socket.IO WebSocket server
 * @param server - HTTP server instance to attach Socket.IO to
 * @param supabase - Optional Supabase client for user authentication
 * @returns Configured Socket.IO server instance
 * @description Sets up WebSocket with CORS configuration, connection handlers, and automatic feature flag synchronization for new clients
 */
export function setupWebSocket(server: HTTPServer, supabase?: SupabaseClient | null) {
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
    // Track authenticated user ID for this socket
    let authenticatedUserId: string | null = null;

    // Send the current flags when a client connects
    const featureFlags = await readFeatureFlags();
    socket.emit('update-feature-flags', featureFlags);

    // Handle user authentication for settings sync
    socket.on('authenticate', async (token: string) => {
      if (!supabase || !token) {
        socket.emit('auth-error', { message: 'Authentication failed' });
        return;
      }

      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          socket.emit('auth-error', { message: 'Invalid token' });
          return;
        }

        // Leave old room if re-authenticating
        if (authenticatedUserId) {
          leaveUserRoom(socket, authenticatedUserId);
        }

        authenticatedUserId = data.user.id;
        joinUserRoom(socket, authenticatedUserId);
        socket.emit('authenticated', { userId: authenticatedUserId });
      } catch {
        socket.emit('auth-error', { message: 'Authentication failed' });
      }
    });

    // Handle user logout - leave the user room but keep socket connected
    socket.on('deauthenticate', () => {
      if (authenticatedUserId) {
        leaveUserRoom(socket, authenticatedUserId);
        authenticatedUserId = null;
        socket.emit('deauthenticated');
      }
    });

    /* eslint-disable @typescript-eslint/no-empty-function */
    // istanbul ignore next
    socket.onAny((_event, ..._args) => {});

    socket.on('disconnect', () => {
      // Clean up user room on disconnect
      if (authenticatedUserId) {
        leaveUserRoom(socket, authenticatedUserId);
      }
    });
    /* eslint-enable @typescript-eslint/no-empty-function */
  });

  return io;
}
import { Server as SocketIOServer } from 'socket.io';
import { readFeatureFlags } from './lowDBService';
import { Server as HTTPServer } from 'node:http';
import { ALLOWED_ORIGINS } from '../constants/server.constants';
import { joinUserRoom, leaveUserRoom } from './userSettingsSocketService';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Extracts the expiry claim (unix seconds) from a JWT without verifying it.
 * Verification already happened via supabase.auth.getUser; this only reads
 * when the validated token will stop being valid.
 * @param token - JWT access token
 * @returns Expiry in unix seconds, or null if the token has no readable exp
 */
export function decodeTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

/** setTimeout's max delay (~24.8 days); anything longer overflows to 0 */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Test-support handle onto a connected socket's auth state.
 * Registered on connection, removed on disconnect.
 */
interface SocketAuthHandle {
  /** Returns the user id the socket is currently authenticated as, or null */
  getUserId: () => string | null;
  /** Fires the exact eviction the expiry timer runs when the token's exp passes */
  expireNow: () => void;
}

/**
 * Registry of live sockets' auth handles. Exists solely so the
 * loopback-guarded POST /api/auth/test/expire-socket-auth endpoint can fire
 * the real expiry-eviction path in e2e tests without waiting out a token's
 * lifetime. Registration is unconditional (cheap), but nothing outside the
 * test endpoint ever calls into it.
 */
const socketAuthHandles = new Set<SocketAuthHandle>();

/**
 * Force-fires the auth-expiry eviction for every socket currently
 * authenticated as the given user, exactly as if their token's exp had just
 * passed: each socket leaves its user room and receives 'auth-expired'.
 * Test-support only — invoked by the loopback-guarded
 * /api/auth/test/expire-socket-auth endpoint.
 * @param userId - The user whose sockets should be expired
 * @param dryRun - When true, only counts matching sockets (room-membership probe)
 * @returns Number of sockets authenticated as the user
 */
export function forceExpireUserSocketAuth(userId: string, dryRun = false): number {
  let matched = 0;
  socketAuthHandles.forEach((handle) => {
    if (handle.getUserId() === userId) {
      matched++;
      if (!dryRun) {
        handle.expireNow();
      }
    }
  });
  return matched;
}

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

  // Handle WebSocket connections
  io.on('connection', async (socket) => {
    // Track authenticated user ID for this socket
    let authenticatedUserId: string | null = null;
    // Evicts the socket from its user room when the validated token expires —
    // without this, one successful authenticate kept a socket in user:{id}
    // for the life of the connection, past token expiry or revocation.
    let authExpiryTimer: NodeJS.Timeout | null = null;

    const clearAuthExpiry = () => {
      if (authExpiryTimer) {
        clearTimeout(authExpiryTimer);
        authExpiryTimer = null;
      }
    };

    // The eviction itself — shared by the expiry timer and the test-only
    // forced-expiry path so both exercise the identical code.
    const expireAuth = () => {
      clearAuthExpiry();
      /* istanbul ignore else -- deauth/disconnect/re-auth clear the timer before nulling auth state, and forced expiry only targets authenticated sockets */
      if (authenticatedUserId) {
        leaveUserRoom(socket, authenticatedUserId);
        authenticatedUserId = null;
        socket.emit('auth-expired', { message: 'Session expired' });
      }
    };

    const scheduleAuthExpiry = (token: string) => {
      const exp = decodeTokenExpiry(token);
      if (exp === null) {
        return; // no readable exp claim — nothing to schedule
      }
      const msUntilExpiry = Math.min(Math.max(exp * 1000 - Date.now(), 0), MAX_TIMEOUT_MS);
      authExpiryTimer = setTimeout(expireAuth, msUntilExpiry);
    };

    // Test-support: let the expire-socket-auth test endpoint find and expire
    // this socket. Removed on disconnect.
    const authHandle: SocketAuthHandle = {
      getUserId: () => authenticatedUserId,
      expireNow: expireAuth,
    };
    socketAuthHandles.add(authHandle);

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
        clearAuthExpiry();

        authenticatedUserId = data.user.id;
        joinUserRoom(socket, authenticatedUserId);
        scheduleAuthExpiry(token);
        socket.emit('authenticated', { userId: authenticatedUserId });
      } catch {
        socket.emit('auth-error', { message: 'Authentication failed' });
      }
    });

    // Handle user logout - leave the user room but keep socket connected
    socket.on('deauthenticate', () => {
      clearAuthExpiry();
      if (authenticatedUserId) {
        leaveUserRoom(socket, authenticatedUserId);
        authenticatedUserId = null;
        socket.emit('deauthenticated');
      }
    });

    socket.on('disconnect', () => {
      socketAuthHandles.delete(authHandle);
      clearAuthExpiry();
      // Clean up user room on disconnect
      if (authenticatedUserId) {
        leaveUserRoom(socket, authenticatedUserId);
      }
    });
  });

  return io;
}
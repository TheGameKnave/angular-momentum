import { Server as SocketIOServer, Socket } from 'socket.io';

/**
 * User settings payload for WebSocket broadcasts.
 */
export interface UserSettingsPayload {
  timezone?: string;
  theme_preference?: 'light' | 'dark';
  language?: string;
  updated_at: string;
}

/**
 * Broadcasts updated user settings to all of a user's connected devices.
 * Uses Socket.IO rooms to target only sockets belonging to the user.
 * @param io - Socket.IO server instance
 * @param userId - The user's ID
 * @param settings - Updated settings payload
 */
export function broadcastUserSettingsUpdate(
  io: SocketIOServer,
  userId: string,
  settings: UserSettingsPayload
): void {
  io.to(`user:${userId}`).emit('user-settings-updated', settings);
}

/**
 * Joins a socket to the user's room for receiving settings updates.
 * Called after successful authentication.
 * @param socket - The authenticated socket
 * @param userId - The user's ID
 */
export function joinUserRoom(socket: Socket, userId: string): void {
  socket.join(`user:${userId}`);
}

/**
 * Leaves the user's room (e.g., on logout or disconnect).
 * @param socket - The socket to remove from the room
 * @param userId - The user's ID
 */
export function leaveUserRoom(socket: Socket, userId: string): void {
  socket.leave(`user:${userId}`);
}

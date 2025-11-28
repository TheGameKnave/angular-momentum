import { Server as SocketIOServer } from 'socket.io';
import { NotificationPayload } from '../models/data.model';

/**
 * Broadcasts a push notification to all connected WebSocket clients.
 * Emits a 'notification' event to all connected sockets with the notification payload.
 * @param io - Socket.IO server instance
 * @param notification - Notification payload containing title, body, and optional metadata
 */
export function broadcastNotification(io: SocketIOServer, notification: NotificationPayload): void {
  io.emit('notification', notification);
  console.log('Notification broadcast to all clients:', notification.title);
}

/**
 * Sends a push notification to a specific connected client by socket ID.
 * Emits a 'notification' event only to the targeted socket.
 * @param io - Socket.IO server instance
 * @param socketId - Target socket ID to send the notification to
 * @param notification - Notification payload containing title, body, and optional metadata
 */
export function sendNotificationToUser(io: SocketIOServer, socketId: string, notification: NotificationPayload): void {
  io.to(socketId).emit('notification', notification);
  console.log(`Notification sent to socket ${socketId}:`, notification.title);
}

/**
 * Sends a push notification to all clients in a specific Socket.IO room.
 * Useful for broadcasting to groups of users (e.g., team members, chat rooms).
 * Emits a 'notification' event to all sockets that have joined the specified room.
 * @param io - Socket.IO server instance
 * @param room - Room name/identifier
 * @param notification - Notification payload containing title, body, and optional metadata
 */
export function sendNotificationToRoom(io: SocketIOServer, room: string, notification: NotificationPayload): void {
  io.to(room).emit('notification', notification);
  console.log(`Notification sent to room ${room}:`, notification.title);
}

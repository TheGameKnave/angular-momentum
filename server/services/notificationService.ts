import { Server as SocketIOServer } from 'socket.io';
import { NotificationPayload } from '../models/data.model';

/**
 * Send notification to all connected clients
 */
export function broadcastNotification(io: SocketIOServer, notification: NotificationPayload): void {
  io.emit('notification', notification);
  console.log('Notification broadcast to all clients:', notification.title);
}

/**
 * Send notification to specific user/socket
 */
export function sendNotificationToUser(io: SocketIOServer, socketId: string, notification: NotificationPayload): void {
  io.to(socketId).emit('notification', notification);
  console.log(`Notification sent to socket ${socketId}:`, notification.title);
}

/**
 * Send notification to a room (e.g., all users in a group)
 */
export function sendNotificationToRoom(io: SocketIOServer, room: string, notification: NotificationPayload): void {
  io.to(room).emit('notification', notification);
  console.log(`Notification sent to room ${room}:`, notification.title);
}

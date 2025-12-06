import { Server as SocketIOServer } from 'socket.io';
import { NotificationPayload, LocalizedNotificationPayload } from '../models/data.model';
import { NOTIFICATIONS, NotificationId } from '../data/notifications';

/**
 * Broadcasts a push notification to all connected WebSocket clients.
 * Emits a 'notification' event to all connected sockets with the notification payload.
 * @param io - Socket.IO server instance
 * @param notification - Notification payload containing title, body, and optional metadata
 */
export function broadcastNotification(io: SocketIOServer, notification: NotificationPayload): void {
  io.emit('notification', notification);
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
}

/**
 * Creates a localized notification payload from a notification ID.
 * Returns all language variants so clients can select their locale.
 * @param notificationId - The notification ID from NOTIFICATIONS constant (validated by caller)
 * @param params - Optional ICU MessageFormat parameters (e.g., {time} for maintenance)
 * @returns LocalizedNotificationPayload with all language variants
 */
export function createLocalizedNotification(
  notificationId: string,
  params?: Record<string, unknown>
): LocalizedNotificationPayload {
  // Assertion safe: caller validates notificationId exists in NOTIFICATIONS before calling
  const notification = NOTIFICATIONS[notificationId as NotificationId]; // NOSONAR
  return {
    title: notification.title,
    body: notification.body,
    label: notification.label,
    params,
    icon: notification.icon,
  };
}

/**
 * Broadcasts a localized push notification to all connected WebSocket clients.
 * Sends all language variants so clients can display in their locale.
 * @param io - Socket.IO server instance
 * @param notificationId - The notification ID from NOTIFICATIONS constant (validated by caller)
 * @param params - Optional ICU MessageFormat parameters
 */
export function broadcastLocalizedNotification(
  io: SocketIOServer,
  notificationId: string,
  params?: Record<string, unknown>
): void {
  const notification = createLocalizedNotification(notificationId, params);
  io.emit('localized-notification', notification);
}

/**
 * Sends a localized push notification to a specific connected client by socket ID.
 * @param io - Socket.IO server instance
 * @param socketId - Target socket ID to send the notification to
 * @param notificationId - The notification ID from NOTIFICATIONS constant (validated by caller)
 * @param params - Optional ICU MessageFormat parameters
 */
export function sendLocalizedNotificationToUser(
  io: SocketIOServer,
  socketId: string,
  notificationId: string,
  params?: Record<string, unknown>
): void {
  const notification = createLocalizedNotification(notificationId, params);
  io.to(socketId).emit('localized-notification', notification);
}

/**
 * Sends a localized push notification to all clients in a specific Socket.IO room.
 * @param io - Socket.IO server instance
 * @param room - Room name/identifier
 * @param notificationId - The notification ID from NOTIFICATIONS constant (validated by caller)
 * @param params - Optional ICU MessageFormat parameters
 */
export function sendLocalizedNotificationToRoom(
  io: SocketIOServer,
  room: string,
  notificationId: string,
  params?: Record<string, unknown>
): void {
  const notification = createLocalizedNotification(notificationId, params);
  io.to(room).emit('localized-notification', notification);
}

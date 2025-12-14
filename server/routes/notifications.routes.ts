import { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { broadcastNotification, sendNotificationToUser } from '../services/notificationService';
import { NotificationPayload } from '../models/data.model';

const router = Router();

/**
 * Send a standard error response.
 * @param res - Express response object
 * @param status - HTTP status code
 * @param message - Error message
 * @returns Response object
 */
function errorResponse(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}

/**
 * Extract and validate notification payload from request body.
 * @param body - Request body object
 * @returns NotificationPayload if valid, null otherwise
 */
function parseNotificationPayload(body: Record<string, unknown>): NotificationPayload | null {
  const { title, body: notificationBody, icon, data } = body;
  if (!title || !notificationBody) return null;
  return {
    title: title as string,
    body: notificationBody as string,
    icon: icon as string | undefined,
    data: data as Record<string, unknown> | undefined
  };
}

/**
 * Get Socket.IO instance or return error response.
 * @param req - Express request object
 * @param res - Express response object
 * @returns SocketIOServer instance or null if unavailable
 */
function getIoOrFail(req: Request, res: Response): SocketIOServer | null {
  const io = req.app.get('io') as SocketIOServer | undefined;
  if (!io) {
    errorResponse(res, 500, 'WebSocket server not available');
    return null;
  }
  return io;
}

/**
 * POST /api/notifications/broadcast
 * Broadcasts a push notification to all connected clients via WebSocket.
 */
router.post('/broadcast', (req: Request, res: Response) => {
  try {
    const payload = parseNotificationPayload(req.body);
    if (!payload) return errorResponse(res, 400, 'Title and body are required');

    const io = getIoOrFail(req, res);
    if (!io) return;

    broadcastNotification(io, payload);
    res.json({ success: true, message: 'Notification sent to all clients' });
  } catch (error) {
    errorResponse(res, 500, `Error: ${error}`);
  }
});

/**
 * POST /api/notifications/send/:socketId
 * Sends a push notification to a specific connected client via WebSocket.
 */
router.post('/send/:socketId', (req: Request, res: Response) => {
  try {
    const { socketId } = req.params;

    const payload = parseNotificationPayload(req.body);
    if (!payload) return errorResponse(res, 400, 'Title and body are required');

    const io = getIoOrFail(req, res);
    if (!io) return;

    sendNotificationToUser(io, socketId, payload);
    res.json({ success: true, message: `Notification sent to socket ${socketId}` });
  } catch (error) {
    errorResponse(res, 500, `Error: ${error}`);
  }
});

export default router;

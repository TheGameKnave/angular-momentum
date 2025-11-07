import { broadcastNotification, sendNotificationToUser, sendNotificationToRoom } from './notificationService';
import { Server as SocketIOServer } from 'socket.io';
import { NotificationPayload } from '../models/data.model';

describe('NotificationService', () => {
  let mockIo: jest.Mocked<SocketIOServer>;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock Socket.IO server
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    } as any;

    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe('broadcastNotification', () => {
    it('should broadcast notification to all clients', () => {
      const notification: NotificationPayload = {
        title: 'Test Notification',
        body: 'This is a test notification',
        icon: '/assets/icons/icon-192x192.png',
      };

      broadcastNotification(mockIo, notification);

      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Notification broadcast to all clients:',
        'Test Notification'
      );
    });

    it('should broadcast notification without icon', () => {
      const notification: NotificationPayload = {
        title: 'Simple Notification',
        body: 'No icon here',
      };

      broadcastNotification(mockIo, notification);

      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Notification broadcast to all clients:',
        'Simple Notification'
      );
    });

    it('should broadcast notification with data payload', () => {
      const notification: NotificationPayload = {
        title: 'Data Notification',
        body: 'Notification with data',
        data: { params: { time: '2025-01-06T12:00:00.000Z' } },
      };

      broadcastNotification(mockIo, notification);

      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Notification broadcast to all clients:',
        'Data Notification'
      );
    });
  });

  describe('sendNotificationToUser', () => {
    it('should send notification to specific socket', () => {
      const socketId = 'socket-123';
      const notification: NotificationPayload = {
        title: 'User Notification',
        body: 'This is for a specific user',
        icon: '/assets/icons/icon-192x192.png',
      };

      sendNotificationToUser(mockIo, socketId, notification);

      expect(mockIo.to).toHaveBeenCalledWith(socketId);
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Notification sent to socket ${socketId}:`,
        'User Notification'
      );
    });

    it('should send notification to user without icon', () => {
      const socketId = 'socket-456';
      const notification: NotificationPayload = {
        title: 'Alert',
        body: 'Important message',
      };

      sendNotificationToUser(mockIo, socketId, notification);

      expect(mockIo.to).toHaveBeenCalledWith(socketId);
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Notification sent to socket ${socketId}:`,
        'Alert'
      );
    });

    it('should send notification to user with data payload', () => {
      const socketId = 'socket-789';
      const notification: NotificationPayload = {
        title: 'Parameterized Notification',
        body: 'Scheduled maintenance will occur tonight at {time}.',
        data: { params: { time: '2025-01-06T22:00:00.000Z' } },
      };

      sendNotificationToUser(mockIo, socketId, notification);

      expect(mockIo.to).toHaveBeenCalledWith(socketId);
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Notification sent to socket ${socketId}:`,
        'Parameterized Notification'
      );
    });
  });

  describe('sendNotificationToRoom', () => {
    it('should send notification to specific room', () => {
      const room = 'admin-room';
      const notification: NotificationPayload = {
        title: 'Room Notification',
        body: 'This is for everyone in the room',
        icon: '/assets/icons/icon-192x192.png',
      };

      sendNotificationToRoom(mockIo, room, notification);

      expect(mockIo.to).toHaveBeenCalledWith(room);
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Notification sent to room ${room}:`,
        'Room Notification'
      );
    });

    it('should send notification to room without icon', () => {
      const room = 'general';
      const notification: NotificationPayload = {
        title: 'General Announcement',
        body: 'Everyone should see this',
      };

      sendNotificationToRoom(mockIo, room, notification);

      expect(mockIo.to).toHaveBeenCalledWith(room);
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Notification sent to room ${room}:`,
        'General Announcement'
      );
    });

    it('should send notification to room with data payload', () => {
      const room = 'users';
      const notification: NotificationPayload = {
        title: 'System Maintenance',
        body: 'Scheduled maintenance will occur tonight at {time}.',
        data: { params: { time: '2025-01-07T00:00:00.000Z' } },
      };

      sendNotificationToRoom(mockIo, room, notification);

      expect(mockIo.to).toHaveBeenCalledWith(room);
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Notification sent to room ${room}:`,
        'System Maintenance'
      );
    });
  });
});

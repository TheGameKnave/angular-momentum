import {
  broadcastNotification,
  sendNotificationToUser,
  sendNotificationToRoom,
  createLocalizedNotification,
  broadcastLocalizedNotification,
  sendLocalizedNotificationToUser,
  sendLocalizedNotificationToRoom
} from './notificationService';
import { Server as SocketIOServer } from 'socket.io';
import { NotificationPayload } from '../models/data.model';
import { NOTIFICATIONS } from '../data/notifications';

describe('NotificationService', () => {
  let mockIo: jest.Mocked<SocketIOServer>;

  beforeEach(() => {
    // Mock Socket.IO server
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    });

    it('should broadcast notification without icon', () => {
      const notification: NotificationPayload = {
        title: 'Simple Notification',
        body: 'No icon here',
      };

      broadcastNotification(mockIo, notification);

      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
    });

    it('should broadcast notification with data payload', () => {
      const notification: NotificationPayload = {
        title: 'Data Notification',
        body: 'Notification with data',
        data: { params: { time: '2025-01-06T12:00:00.000Z' } },
      };

      broadcastNotification(mockIo, notification);

      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
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
    });
  });

  describe('createLocalizedNotification', () => {
    it('should create localized notification payload from notification ID', () => {
      const result = createLocalizedNotification('welcome');

      expect(result.title).toEqual(NOTIFICATIONS.welcome.title);
      expect(result.body).toEqual(NOTIFICATIONS.welcome.body);
      expect(result.label).toEqual(NOTIFICATIONS.welcome.label);
      expect(result.icon).toEqual(NOTIFICATIONS.welcome.icon);
      expect(result.params).toBeUndefined();
    });

    it('should include params in localized notification', () => {
      const params = { time: '2025-01-07T00:00:00.000Z' };
      const result = createLocalizedNotification('maintenance', params);

      expect(result.title).toEqual(NOTIFICATIONS.maintenance.title);
      expect(result.body).toEqual(NOTIFICATIONS.maintenance.body);
      expect(result.params).toEqual(params);
    });

    it('should handle all notification IDs', () => {
      const notificationIds = Object.keys(NOTIFICATIONS) as Array<keyof typeof NOTIFICATIONS>;

      notificationIds.forEach((id) => {
        const result = createLocalizedNotification(id);
        expect(result.title).toEqual(NOTIFICATIONS[id].title);
        expect(result.body).toEqual(NOTIFICATIONS[id].body);
        expect(result.label).toEqual(NOTIFICATIONS[id].label);
      });
    });
  });

  describe('broadcastLocalizedNotification', () => {
    it('should broadcast localized notification to all clients', () => {
      broadcastLocalizedNotification(mockIo, 'welcome');

      expect(mockIo.emit).toHaveBeenCalledWith('localized-notification', {
        title: NOTIFICATIONS.welcome.title,
        body: NOTIFICATIONS.welcome.body,
        label: NOTIFICATIONS.welcome.label,
        icon: NOTIFICATIONS.welcome.icon,
        params: undefined,
      });
    });

    it('should broadcast localized notification with params', () => {
      const params = { time: '2025-01-07T00:00:00.000Z' };
      broadcastLocalizedNotification(mockIo, 'maintenance', params);

      expect(mockIo.emit).toHaveBeenCalledWith('localized-notification', {
        title: NOTIFICATIONS.maintenance.title,
        body: NOTIFICATIONS.maintenance.body,
        label: NOTIFICATIONS.maintenance.label,
        icon: NOTIFICATIONS.maintenance.icon,
        params,
      });
    });
  });

  describe('sendLocalizedNotificationToUser', () => {
    it('should send localized notification to specific socket', () => {
      const socketId = 'socket-123';
      sendLocalizedNotificationToUser(mockIo, socketId, 'feature_update');

      expect(mockIo.to).toHaveBeenCalledWith(socketId);
      expect(mockIo.emit).toHaveBeenCalledWith('localized-notification', {
        title: NOTIFICATIONS.feature_update.title,
        body: NOTIFICATIONS.feature_update.body,
        label: NOTIFICATIONS.feature_update.label,
        icon: NOTIFICATIONS.feature_update.icon,
        params: undefined,
      });
    });

    it('should send localized notification to user with params', () => {
      const socketId = 'socket-456';
      const params = { time: '2025-01-07T22:00:00.000Z' };
      sendLocalizedNotificationToUser(mockIo, socketId, 'maintenance', params);

      expect(mockIo.to).toHaveBeenCalledWith(socketId);
      expect(mockIo.emit).toHaveBeenCalledWith('localized-notification', {
        title: NOTIFICATIONS.maintenance.title,
        body: NOTIFICATIONS.maintenance.body,
        label: NOTIFICATIONS.maintenance.label,
        icon: NOTIFICATIONS.maintenance.icon,
        params,
      });
    });
  });

  describe('sendLocalizedNotificationToRoom', () => {
    it('should send localized notification to specific room', () => {
      const room = 'admin-room';
      sendLocalizedNotificationToRoom(mockIo, room, 'achievement');

      expect(mockIo.to).toHaveBeenCalledWith(room);
      expect(mockIo.emit).toHaveBeenCalledWith('localized-notification', {
        title: NOTIFICATIONS.achievement.title,
        body: NOTIFICATIONS.achievement.body,
        label: NOTIFICATIONS.achievement.label,
        icon: NOTIFICATIONS.achievement.icon,
        params: undefined,
      });
    });

    it('should send localized notification to room with params', () => {
      const room = 'users';
      const params = { time: '2025-01-08T00:00:00.000Z' };
      sendLocalizedNotificationToRoom(mockIo, room, 'maintenance', params);

      expect(mockIo.to).toHaveBeenCalledWith(room);
      expect(mockIo.emit).toHaveBeenCalledWith('localized-notification', {
        title: NOTIFICATIONS.maintenance.title,
        body: NOTIFICATIONS.maintenance.body,
        label: NOTIFICATIONS.maintenance.label,
        icon: NOTIFICATIONS.maintenance.icon,
        params,
      });
    });
  });
});

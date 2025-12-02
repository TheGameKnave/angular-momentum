import request from 'supertest';
import express, { Express } from 'express';
import notificationsRoutes from './notifications.routes';
import * as notificationService from '../services/notificationService';

// Mock notificationService
jest.mock('../services/notificationService');

describe('Notifications Routes', () => {
  let app: Express;
  let mockBroadcastNotification: jest.MockedFunction<typeof notificationService.broadcastNotification>;
  let mockSendNotificationToUser: jest.MockedFunction<typeof notificationService.sendNotificationToUser>;
  let mockIo: any;

  beforeEach(() => {
    // Reset all mocks completely to prevent state leakage
    jest.resetAllMocks();

    // Get mocked functions
    mockBroadcastNotification = notificationService.broadcastNotification as jest.MockedFunction<typeof notificationService.broadcastNotification>;
    mockSendNotificationToUser = notificationService.sendNotificationToUser as jest.MockedFunction<typeof notificationService.sendNotificationToUser>;

    // Reset mock implementations to async no-op functions (for proper async handling)
    mockBroadcastNotification.mockImplementation(() => Promise.resolve());
    mockSendNotificationToUser.mockImplementation(() => Promise.resolve());

    // Setup mock WebSocket io
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.set('io', mockIo);
    app.use('/api/notifications', notificationsRoutes);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /broadcast', () => {
    it('should broadcast notification with all fields', async () => {
      const notificationPayload = {
        title: 'Test Title',
        body: 'Test Body',
        icon: 'https://example.com/icon.png',
        data: { url: '/profile' },
      };

      const response = await request(app)
        .post('/api/notifications/broadcast')
        .send(notificationPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Notification sent to all clients',
      });
      expect(mockBroadcastNotification).toHaveBeenCalledWith(mockIo, notificationPayload);
      expect(mockBroadcastNotification).toHaveBeenCalledTimes(1);
    });

    it('should broadcast notification with only required fields', async () => {
      const notificationPayload = {
        title: 'Test Title',
        body: 'Test Body',
      };

      const response = await request(app)
        .post('/api/notifications/broadcast')
        .send(notificationPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Notification sent to all clients',
      });
      expect(mockBroadcastNotification).toHaveBeenCalledWith(mockIo, {
        title: 'Test Title',
        body: 'Test Body',
        icon: undefined,
        data: undefined,
      });
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/notifications/broadcast')
        .send({ body: 'Test Body' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Title and body are required',
      });
      expect(mockBroadcastNotification).not.toHaveBeenCalled();
    });

    it('should return 400 when body is missing', async () => {
      const response = await request(app)
        .post('/api/notifications/broadcast')
        .send({ title: 'Test Title' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Title and body are required',
      });
      expect(mockBroadcastNotification).not.toHaveBeenCalled();
    });

    it('should return 400 when both title and body are missing', async () => {
      const response = await request(app)
        .post('/api/notifications/broadcast')
        .set('Content-Type', 'application/json')
        .send('{}');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Title and body are required',
      });
      expect(mockBroadcastNotification).not.toHaveBeenCalled();
    });

    it('should return 500 when WebSocket io is not available', async () => {
      app.set('io', null);

      const response = await request(app)
        .post('/api/notifications/broadcast')
        .send({ title: 'Test Title', body: 'Test Body' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'WebSocket server not available',
      });
      expect(mockBroadcastNotification).not.toHaveBeenCalled();
    });

    it('should handle errors in try-catch block', async () => {
      mockBroadcastNotification.mockImplementation(() => {
        throw new Error('Mock error');
      });

      const response = await request(app)
        .post('/api/notifications/broadcast')
        .send({ title: 'Test Title', body: 'Test Body' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Error: Error: Mock error',
      });
    });

    it('should accept empty string for title if provided', async () => {
      const response = await request(app)
        .post('/api/notifications/broadcast')
        .send({ title: '', body: 'Test Body' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept additional optional fields', async () => {
      const notificationPayload = {
        title: 'Test Title',
        body: 'Test Body',
        icon: 'https://example.com/icon.png',
        data: { url: '/profile', userId: 123 },
      };

      const response = await request(app)
        .post('/api/notifications/broadcast')
        .send(notificationPayload);

      expect(response.status).toBe(200);
      expect(mockBroadcastNotification).toHaveBeenCalledWith(mockIo, notificationPayload);
    });
  });

  describe('POST /send/:socketId', () => {
    it('should send notification to specific socket with all fields', async () => {
      const socketId = 'socket123';
      const notificationPayload = {
        title: 'Test Title',
        body: 'Test Body',
        icon: 'https://example.com/icon.png',
        data: { url: '/profile' },
      };

      const response = await request(app)
        .post(`/api/notifications/send/${socketId}`)
        .send(notificationPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: `Notification sent to socket ${socketId}`,
      });
      expect(mockSendNotificationToUser).toHaveBeenCalledWith(mockIo, socketId, notificationPayload);
      expect(mockSendNotificationToUser).toHaveBeenCalledTimes(1);
    });

    it('should send notification with only required fields', async () => {
      const socketId = 'socket456';
      const notificationPayload = {
        title: 'Test Title',
        body: 'Test Body',
      };

      const response = await request(app)
        .post(`/api/notifications/send/${socketId}`)
        .send(notificationPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: `Notification sent to socket ${socketId}`,
      });
      expect(mockSendNotificationToUser).toHaveBeenCalledWith(mockIo, socketId, {
        title: 'Test Title',
        body: 'Test Body',
        icon: undefined,
        data: undefined,
      });
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/notifications/send/socket123')
        .send({ body: 'Test Body' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Title and body are required',
      });
      expect(mockSendNotificationToUser).not.toHaveBeenCalled();
    });

    it('should return 400 when body is missing', async () => {
      const response = await request(app)
        .post('/api/notifications/send/socket123')
        .send({ title: 'Test Title' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Title and body are required',
      });
      expect(mockSendNotificationToUser).not.toHaveBeenCalled();
    });

    it('should return 400 when both title and body are missing', async () => {
      const response = await request(app)
        .post('/api/notifications/send/socket123')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Title and body are required',
      });
      expect(mockSendNotificationToUser).not.toHaveBeenCalled();
    });

    it('should return 500 when WebSocket io is not available', async () => {
      app.set('io', null);

      const response = await request(app)
        .post('/api/notifications/send/socket123')
        .send({ title: 'Test Title', body: 'Test Body' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'WebSocket server not available',
      });
      expect(mockSendNotificationToUser).not.toHaveBeenCalled();
    });

    it('should handle errors in try-catch block', async () => {
      mockSendNotificationToUser.mockImplementation(() => {
        throw new Error('Mock error');
      });

      const response = await request(app)
        .post('/api/notifications/send/socket123')
        .send({ title: 'Test Title', body: 'Test Body' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Error: Error: Mock error',
      });
    });

    it('should handle special characters in socketId', async () => {
      const socketId = 'socket-with-dashes_and_underscores.123';
      const notificationPayload = {
        title: 'Test Title',
        body: 'Test Body',
      };

      const response = await request(app)
        .post(`/api/notifications/send/${socketId}`)
        .send(notificationPayload);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain(socketId);
      expect(mockSendNotificationToUser).toHaveBeenCalledWith(mockIo, socketId, expect.any(Object));
    });

    it('should accept empty socketId parameter', async () => {
      const response = await request(app)
        .post('/api/notifications/send/')
        .send({ title: 'Test Title', body: 'Test Body' });

      // Should hit 404 since the route expects a socketId parameter
      expect(response.status).toBe(404);
    });

    it('should accept additional optional fields', async () => {
      const socketId = 'socket789';
      const notificationPayload = {
        title: 'Test Title',
        body: 'Test Body',
        icon: 'https://example.com/icon.png',
        data: { url: '/profile', userId: 123 },
      };

      const response = await request(app)
        .post(`/api/notifications/send/${socketId}`)
        .send(notificationPayload);

      expect(response.status).toBe(200);
      expect(mockSendNotificationToUser).toHaveBeenCalledWith(mockIo, socketId, notificationPayload);
    });

    it('should handle URL-encoded socketId', async () => {
      const socketId = 'socket%20with%20spaces';
      const decodedSocketId = 'socket with spaces';
      const notificationPayload = {
        title: 'Test Title',
        body: 'Test Body',
      };

      const response = await request(app)
        .post(`/api/notifications/send/${socketId}`)
        .send(notificationPayload);

      expect(response.status).toBe(200);
      expect(mockSendNotificationToUser).toHaveBeenCalledWith(mockIo, decodedSocketId, expect.any(Object));
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown notification routes', async () => {
      const response = await request(app).get('/api/notifications/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should return 404 for GET requests to broadcast endpoint', async () => {
      const response = await request(app).get('/api/notifications/broadcast');

      expect(response.status).toBe(404);
    });
  });
});

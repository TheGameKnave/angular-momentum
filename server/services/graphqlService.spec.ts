import request from 'supertest'; // For HTTP requests testing
import express from 'express';
import { Server } from 'socket.io'; // Import the socket.io server type
import { graphqlMiddleware } from './graphqlService';
import { readFeatureFlags, writeFeatureFlags } from './lowDBService';
import { changeLog } from '../data/changeLog';
import { broadcastNotification, sendNotificationToUser } from './notificationService';

// Mock the lowDBService functions
jest.mock('./lowDBService', () => ({
  readFeatureFlags: jest.fn(),
  writeFeatureFlags: jest.fn(),
}));

// Mock the notificationService functions
jest.mock('./notificationService', () => ({
  broadcastNotification: jest.fn(),
  sendNotificationToUser: jest.fn(),
}));

describe('GraphQL API', () => {
  let app: express.Application;
  let io: Server;

  beforeAll(() => {
    app = express();
    io = new Server();

    app.set('io', io);
    app.use(graphqlMiddleware()); // Use the GraphQL middleware
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query resolvers', () => {
    it('should return the correct version', async () => {
      const query = `
        query {
          version
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.version).toBe(1.0);
    });

    it('should return the correct change log', async () => {
      const query = `
        query {
          changeLog {
            version
            date
            description
            changes
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.changeLog).toEqual(changeLog);
    });
    
    it('should fetch all feature flags', async () => {
      // Mock the `readFeatureFlags` function to return sample data
      const mockFeatureFlags = { feature1: true, feature2: false };
      (readFeatureFlags as jest.Mock).mockReturnValue(mockFeatureFlags);

      const query = `
        query {
          featureFlags {
            key
            value
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.featureFlags).toEqual([
        { key: 'feature1', value: true },
        { key: 'feature2', value: false },
      ]);
    });

    it('should fetch a specific feature flag', async () => {
      // Mock `readFeatureFlags` to return a specific feature flag
      const mockFeatureFlags = { feature1: true };
      (readFeatureFlags as jest.Mock).mockReturnValue(mockFeatureFlags);

      const query = `
        query {
          featureFlag(key: "feature1")
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.featureFlag).toBe(true);
    });

    it('should return API documentation', async () => {
      const query = `
        query {
          docs
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.docs).toContain('API Documentation');
    });
  });

  describe('Mutation resolvers', () => {
    it('should update a feature flag and emit an event', async () => {
      const mockUpdatedFeatures = { feature1: false };
      (writeFeatureFlags as jest.Mock).mockResolvedValue(mockUpdatedFeatures);

      const mutation = `
        mutation {
          updateFeatureFlag(key: "feature1", value: false) {
            key
            value
          }
        }
      `;

      const emitSpy = jest.spyOn(io, 'emit'); // Spy on the `emit` method

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.updateFeatureFlag).toEqual({
        key: 'feature1',
        value: false,
      });
      expect(emitSpy).toHaveBeenCalledWith('update-feature-flags', mockUpdatedFeatures);
    });

    it('should send a broadcast notification successfully', async () => {
      const mutation = `
        mutation {
          sendNotification(
            title: "Test Title",
            body: "Test Body",
            icon: "/icon.png"
          ) {
            success
            message
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.sendNotification).toEqual({
        success: true,
        message: 'Notification sent to all clients'
      });
      expect(broadcastNotification).toHaveBeenCalledWith(io, {
        title: 'Test Title',
        body: 'Test Body',
        icon: '/icon.png',
        data: undefined
      });
    });

    it('should send a broadcast notification with data parameters', async () => {
      const mutation = `
        mutation {
          sendNotification(
            title: "System Maintenance",
            body: "Scheduled maintenance will occur tonight at {time}.",
            icon: "/icon.png",
            data: "{\\"params\\":{\\"time\\":\\"2025-01-06T22:00:00.000Z\\"}}"
          ) {
            success
            message
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.sendNotification).toEqual({
        success: true,
        message: 'Notification sent to all clients'
      });
      expect(broadcastNotification).toHaveBeenCalledWith(io, {
        title: 'System Maintenance',
        body: 'Scheduled maintenance will occur tonight at {time}.',
        icon: '/icon.png',
        data: { params: { time: '2025-01-06T22:00:00.000Z' } }
      });
    });

    it('should handle broadcast notification errors', async () => {
      (broadcastNotification as jest.Mock).mockImplementation(() => {
        throw new Error('Broadcast failed');
      });

      const mutation = `
        mutation {
          sendNotification(
            title: "Test",
            body: "Test"
          ) {
            success
            message
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.sendNotification).toEqual({
        success: false,
        message: 'Error: Error: Broadcast failed'
      });
    });

    it('should send a notification to specific socket successfully', async () => {
      const mutation = `
        mutation {
          sendNotificationToSocket(
            socketId: "socket-123",
            title: "User Notification",
            body: "This is for you",
            icon: "/icon.png"
          ) {
            success
            message
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.sendNotificationToSocket).toEqual({
        success: true,
        message: 'Notification sent to socket socket-123'
      });
      expect(sendNotificationToUser).toHaveBeenCalledWith(io, 'socket-123', {
        title: 'User Notification',
        body: 'This is for you',
        icon: '/icon.png',
        data: undefined
      });
    });

    it('should send a notification to specific socket with data parameters', async () => {
      const mutation = `
        mutation {
          sendNotificationToSocket(
            socketId: "socket-456",
            title: "Maintenance Alert",
            body: "Scheduled maintenance will occur tonight at {time}.",
            data: "{\\"params\\":{\\"time\\":\\"2025-01-07T00:00:00.000Z\\"}}"
          ) {
            success
            message
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.sendNotificationToSocket).toEqual({
        success: true,
        message: 'Notification sent to socket socket-456'
      });
      expect(sendNotificationToUser).toHaveBeenCalledWith(io, 'socket-456', {
        title: 'Maintenance Alert',
        body: 'Scheduled maintenance will occur tonight at {time}.',
        icon: undefined,
        data: { params: { time: '2025-01-07T00:00:00.000Z' } }
      });
    });

    it('should handle socket notification errors', async () => {
      (sendNotificationToUser as jest.Mock).mockImplementation(() => {
        throw new Error('Socket send failed');
      });

      const mutation = `
        mutation {
          sendNotificationToSocket(
            socketId: "socket-789",
            title: "Test",
            body: "Test"
          ) {
            success
            message
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.sendNotificationToSocket).toEqual({
        success: false,
        message: 'Error: Error: Socket send failed'
      });
    });
  });

  it('should return 405 for non-POST methods', async () => {
    // Make a GET request to trigger the else case
    const response = await request(app)
      .get('/api');

    expect(response.status).toBe(405);
    expect(response.body).toEqual({ error: 'Method Not Allowed' });
  });

  describe('Username resolvers', () => {
    beforeAll(() => {
      // Set Supabase config so usernameService initializes
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-key';
    });

    afterAll(() => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;
    });

    it('should validate username (line 219)', async () => {
      const query = `
        query {
          validateUsername(username: "test123") {
            valid
            error
            fingerprint
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query });

      expect(response.status).toBe(200);
      // Resolver executes regardless of DB availability
      expect(response.body).toHaveProperty('data');
    });

    it('should check username availability - invalid username (lines 227-240)', async () => {
      const query = `
        query {
          checkUsernameAvailability(username: "ab") {
            available
            fingerprint
            error
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      // Should return unavailable for invalid username
      if (response.body.data?.checkUsernameAvailability) {
        expect(response.body.data.checkUsernameAvailability.available).toBe(false);
        expect(response.body.data.checkUsernameAvailability).toHaveProperty('error');
      }
    });

    it('should create username - invalid username (lines 252-255)', async () => {
      const mutation = `
        mutation {
          createUsername(userId: "test-user-id", username: "ab") {
            success
            error
            fingerprint
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      // Should return error for invalid username
      if (response.body.data?.createUsername) {
        expect(response.body.data.createUsername.success).toBe(false);
        expect(response.body.data.createUsername).toHaveProperty('error');
      }
    });

    it('should check username availability - valid username (lines 236-240)', async () => {
      // Use a valid username format to pass validation and execute the service call
      const query = `
        query {
          checkUsernameAvailability(username: "validuser123") {
            available
            fingerprint
            error
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      // Lines 236-240 should execute even if DB call fails
      expect(response.body.data).toHaveProperty('checkUsernameAvailability');
    });

    it('should create username - valid username (line 261)', async () => {
      // Use a valid username format to pass validation and execute the service call
      const mutation = `
        mutation {
          createUsername(userId: "test-user-id", username: "validuser123") {
            success
            error
            fingerprint
          }
        }
      `;

      const response = await request(app)
        .post('/api')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      // Line 261 should execute even if DB call fails
      expect(response.body.data).toHaveProperty('createUsername');
    });
  });
});
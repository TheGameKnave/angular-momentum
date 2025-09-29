import request from 'supertest'; // For HTTP requests testing
import express from 'express';
import { Server } from 'socket.io'; // Import the socket.io server type
import { graphqlMiddleware } from './graphqlService';
import { readFeatureFlags, writeFeatureFlags } from './lowDBService';

// Mock the lowDBService functions
jest.mock('./lowDBService', () => ({
  readFeatureFlags: jest.fn(),
  writeFeatureFlags: jest.fn(),
}));

fdescribe('GraphQL API', () => {
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
  });

  it('should return 405 for non-POST methods', async () => {
    // Make a GET request to trigger the else case
    const response = await request(app)
      .get('/api');
  
    expect(response.status).toBe(405);
    expect(response.body).toEqual({ error: 'Method Not Allowed' });
  });
});
  
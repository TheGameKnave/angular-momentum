import request from 'supertest';
import express, { Express } from 'express';
import featureFlagsRoutes from './feature-flags.routes';
import * as lowDBService from '../services/lowDBService';

// Mock lowDBService
jest.mock('../services/lowDBService');

describe('Feature Flags Routes', () => {
  let app: Express;
  let mockReadFeatureFlags: jest.MockedFunction<typeof lowDBService.readFeatureFlags>;
  let mockWriteFeatureFlags: jest.MockedFunction<typeof lowDBService.writeFeatureFlags>;
  let mockIo: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get mocked functions
    mockReadFeatureFlags = lowDBService.readFeatureFlags as jest.MockedFunction<typeof lowDBService.readFeatureFlags>;
    mockWriteFeatureFlags = lowDBService.writeFeatureFlags as jest.MockedFunction<typeof lowDBService.writeFeatureFlags>;

    // Setup mock WebSocket io
    mockIo = {
      emit: jest.fn(),
    };

    // Create Express app
    app = express();
    app.use(express.json());
    app.set('io', mockIo);
    app.use('/api/feature-flags', featureFlagsRoutes);
  });

  describe('GET /', () => {
    it('should return all feature flags as an array', async () => {
      const mockFlags = {
        darkMode: true,
        newFeature: false,
        betaAccess: true,
      };

      mockReadFeatureFlags.mockReturnValue(mockFlags);

      const response = await request(app).get('/api/feature-flags');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      expect(response.body).toEqual([
        { key: 'darkMode', value: true },
        { key: 'newFeature', value: false },
        { key: 'betaAccess', value: true },
      ]);
    });

    it('should return empty array when no feature flags exist', async () => {
      mockReadFeatureFlags.mockReturnValue({});

      const response = await request(app).get('/api/feature-flags');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should call readFeatureFlags', async () => {
      mockReadFeatureFlags.mockReturnValue({});

      await request(app).get('/api/feature-flags');

      expect(mockReadFeatureFlags).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /:key', () => {
    it('should return a specific feature flag', async () => {
      mockReadFeatureFlags.mockReturnValue({
        darkMode: true,
        newFeature: false,
      });

      const response = await request(app).get('/api/feature-flags/darkMode');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        key: 'darkMode',
        value: true,
      });
    });

    it('should return feature flag with false value', async () => {
      mockReadFeatureFlags.mockReturnValue({
        darkMode: true,
        newFeature: false,
      });

      const response = await request(app).get('/api/feature-flags/newFeature');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        key: 'newFeature',
        value: false,
      });
    });

    it('should return 404 if feature flag not found', async () => {
      mockReadFeatureFlags.mockReturnValue({
        darkMode: true,
      });

      const response = await request(app).get('/api/feature-flags/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "Feature flag 'nonexistent' not found",
      });
    });

    it('should call readFeatureFlags', async () => {
      mockReadFeatureFlags.mockReturnValue({ darkMode: true });

      await request(app).get('/api/feature-flags/darkMode');

      expect(mockReadFeatureFlags).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /:key', () => {
    it('should update a feature flag value', async () => {
      mockWriteFeatureFlags.mockResolvedValue({
        darkMode: true,
        newFeature: false,
      });

      const response = await request(app)
        .put('/api/feature-flags/darkMode')
        .send({ value: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        key: 'darkMode',
        value: true,
      });
    });

    it('should call writeFeatureFlags with correct arguments', async () => {
      mockWriteFeatureFlags.mockResolvedValue({});

      await request(app)
        .put('/api/feature-flags/newFeature')
        .send({ value: false });

      expect(mockWriteFeatureFlags).toHaveBeenCalledWith({
        newFeature: false,
      });
    });

    it('should broadcast update via WebSocket', async () => {
      const updatedFlags = {
        darkMode: true,
        newFeature: false,
      };
      mockWriteFeatureFlags.mockResolvedValue(updatedFlags);

      await request(app)
        .put('/api/feature-flags/darkMode')
        .send({ value: true });

      expect(mockIo.emit).toHaveBeenCalledWith('update-feature-flags', updatedFlags);
    });

    it('should not broadcast if WebSocket io is not available', async () => {
      app.set('io', null);
      mockWriteFeatureFlags.mockResolvedValue({});

      const response = await request(app)
        .put('/api/feature-flags/darkMode')
        .send({ value: true });

      expect(response.status).toBe(200);
      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('should return 400 if value is not a boolean', async () => {
      const response = await request(app)
        .put('/api/feature-flags/darkMode')
        .send({ value: 'not-a-boolean' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Value must be a boolean',
      });
      expect(mockWriteFeatureFlags).not.toHaveBeenCalled();
    });

    it('should return 400 if value is a number', async () => {
      const response = await request(app)
        .put('/api/feature-flags/darkMode')
        .send({ value: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Value must be a boolean');
    });

    it('should return 400 if value is missing', async () => {
      const response = await request(app)
        .put('/api/feature-flags/darkMode')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should accept false as a valid value', async () => {
      mockWriteFeatureFlags.mockResolvedValue({ darkMode: false });

      const response = await request(app)
        .put('/api/feature-flags/darkMode')
        .send({ value: false });

      expect(response.status).toBe(200);
      expect(response.body.value).toBe(false);
    });
  });

  describe('DELETE /:key', () => {
    it('should delete a feature flag', async () => {
      mockReadFeatureFlags.mockReturnValue({
        darkMode: true,
        newFeature: false,
      });
      mockWriteFeatureFlags.mockResolvedValue({
        newFeature: false,
      });

      const response = await request(app).delete('/api/feature-flags/darkMode');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Feature flag 'darkMode' deleted",
      });
    });

    it('should call writeFeatureFlags with remaining flags', async () => {
      mockReadFeatureFlags.mockReturnValue({
        darkMode: true,
        newFeature: false,
        betaAccess: true,
      });
      mockWriteFeatureFlags.mockResolvedValue({
        newFeature: false,
        betaAccess: true,
      });

      await request(app).delete('/api/feature-flags/darkMode');

      expect(mockWriteFeatureFlags).toHaveBeenCalledWith({
        newFeature: false,
        betaAccess: true,
      });
    });

    it('should broadcast update via WebSocket after deletion', async () => {
      const remainingFlags = {
        newFeature: false,
      };
      mockReadFeatureFlags.mockReturnValue({
        darkMode: true,
        newFeature: false,
      });
      mockWriteFeatureFlags.mockResolvedValue(remainingFlags);

      await request(app).delete('/api/feature-flags/darkMode');

      expect(mockIo.emit).toHaveBeenCalledWith('update-feature-flags', remainingFlags);
    });

    it('should not broadcast if WebSocket io is not available', async () => {
      app.set('io', null);
      mockReadFeatureFlags.mockReturnValue({ darkMode: true });
      mockWriteFeatureFlags.mockResolvedValue({});

      const response = await request(app).delete('/api/feature-flags/darkMode');

      expect(response.status).toBe(200);
      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('should return 404 if feature flag not found', async () => {
      mockReadFeatureFlags.mockReturnValue({
        darkMode: true,
      });

      const response = await request(app).delete('/api/feature-flags/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "Feature flag 'nonexistent' not found",
      });
      expect(mockWriteFeatureFlags).not.toHaveBeenCalled();
    });

    it('should handle deleting the last remaining flag', async () => {
      mockReadFeatureFlags.mockReturnValue({
        darkMode: true,
      });
      mockWriteFeatureFlags.mockResolvedValue({});

      const response = await request(app).delete('/api/feature-flags/darkMode');

      expect(response.status).toBe(200);
      expect(mockWriteFeatureFlags).toHaveBeenCalledWith({});
    });

    it('should correctly destructure and remove only the deleted flag', async () => {
      const originalFlags = {
        featureA: true,
        featureB: false,
        featureC: true,
      };

      mockReadFeatureFlags.mockReturnValue(originalFlags);
      mockWriteFeatureFlags.mockResolvedValue({
        featureA: true,
        featureC: true,
      });

      await request(app).delete('/api/feature-flags/featureB');

      // Verify the deleted flag is not in the remaining flags
      expect(mockWriteFeatureFlags).toHaveBeenCalledWith({
        featureA: true,
        featureC: true,
      });

      // Verify it wasn't called with the deleted flag
      const calledWith = mockWriteFeatureFlags.mock.calls[0][0];
      expect(calledWith).not.toHaveProperty('featureB');
    });

    it('should handle deleting a flag with a hyphenated key name', async () => {
      mockReadFeatureFlags.mockReturnValue({
        'dark-mode': true,
        'new-feature': false,
      });
      mockWriteFeatureFlags.mockResolvedValue({
        'new-feature': false,
      });

      const response = await request(app).delete('/api/feature-flags/dark-mode');

      expect(response.status).toBe(200);
      expect(mockWriteFeatureFlags).toHaveBeenCalledWith({
        'new-feature': false,
      });
    });
  });
});

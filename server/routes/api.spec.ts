import { Request, Response, NextFunction } from 'express';
import apiRouter from './api';

jest.mock('../services/lowDBService', () => ({
  readFeatureFlags: jest.fn(),
  writeFeatureFlags: jest.fn(),
}));

describe('API Router', () => {
  let request: Request;
  let response: Response;
  let next: jest.Mock; // Update next to use Jest's mocking capabilities
  const lowDBService = require('../services/lowDBService');

  beforeEach(() => {
    request = {} as Request;
    response = {
      send: jest.fn(),
    } as unknown as Response;
    next = jest.fn() as jest.Mock<ReturnType<NextFunction>, Parameters<NextFunction>>;
  });

  it('should handle GET request', () => {
    const getHandler = apiRouter.stack.find((layer: any) => layer.route && layer.route.path === '/');
    if (getHandler && getHandler.route) {
      const handler = getHandler.route.stack[0].handle;
      handler(request, response, next);
      expect(response.send).toHaveBeenCalledWith({ message: 'API works' });
    } else {
      throw new Error('GET handler not found');
    }
  });

  it('should handle GET /flags request', async () => {
    const featureFlagsMock = { feature1: true, feature2: false };
    lowDBService.readFeatureFlags.mockResolvedValue(featureFlagsMock);

    const getHandler = apiRouter.stack.find((layer: any) => layer.route && layer.route.path === '/flags');
    if (getHandler && getHandler.route) {
      const handler = getHandler.route.stack[0].handle;
      await handler(request, response, next);

      expect(lowDBService.readFeatureFlags).toHaveBeenCalledTimes(1);
      expect(response.send).toHaveBeenCalledWith(featureFlagsMock);
    } else {
      throw new Error('GET /flags handler not found');
    }
  });

  it('should handle errors in GET /flags', async () => {
    const error = new Error('Failed to fetch feature flags');
    lowDBService.readFeatureFlags.mockRejectedValue(error);

    const getHandler = apiRouter.stack.find((layer: any) => layer.route && layer.route.path === '/flags');
    if (getHandler && getHandler.route) {
      const handler = getHandler.route.stack[0].handle;
      await handler(request, response, next);

      expect(lowDBService.readFeatureFlags).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalledWith(error);
    } else {
      throw new Error('GET /flags handler not found');
    }
  });

  it('should handle PUT /flags request', async () => {
    const newFeatureFlags = { feature1: true, feature2: true };
    lowDBService.writeFeatureFlags.mockResolvedValue(undefined);
    lowDBService.readFeatureFlags.mockResolvedValue(newFeatureFlags);

    const putHandler = apiRouter.stack.find(
      (layer: any) => layer.route && layer.route.path === '/flags' && layer.route.methods.put
    );
    if (putHandler && putHandler.route) {
      const handler = putHandler.route.stack[0].handle;
      request.body = newFeatureFlags;

      await handler(request, response, next);

      expect(lowDBService.writeFeatureFlags).toHaveBeenCalledWith(newFeatureFlags);
      expect(lowDBService.readFeatureFlags).toHaveBeenCalledTimes(3);
      expect(response.send).toHaveBeenCalledWith(newFeatureFlags);
    } else {
      throw new Error('PUT /flags handler not found');
    }
  });

  it('should handle errors in PUT /flags', async () => {
    const error = new Error('Failed to update feature flags');
    lowDBService.writeFeatureFlags.mockRejectedValue(error);

    const putHandler = apiRouter.stack.find(
      (layer: any) => layer.route && layer.route.path === '/flags' && layer.route.methods.put
    );
    if (putHandler && putHandler.route) {
      const handler = putHandler.route.stack[0].handle;
      request.body = { feature1: true };

      await handler(request, response, next);

      expect(lowDBService.writeFeatureFlags).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalledWith(error);
    } else {
      throw new Error('PUT /flags handler not found');
    }
  });
});

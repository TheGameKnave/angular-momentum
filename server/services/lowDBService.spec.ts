import { readFeatureFlags, writeFeatureFlags } from './lowDBService';

// Mock dependencies
jest.mock('lowdb/adapters/FileSync', () => {
  return jest.fn(() => ({}));
});

jest.mock('lowdb', () => {
  return jest.fn(() => ({
    get: jest.fn(() => ({
      value: jest.fn(() => ({
        featureA: true,
        featureB: false,
      })),
    })),
    set: jest.fn().mockReturnValue({
      write: jest.fn(),
    }),
  }));
});

describe('FeatureFlagsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('readFeatureFlags', () => {
    it('should return the current feature flags', () => {
      const result = readFeatureFlags();
      expect(result).toEqual({
        featureA: true,
        featureB: false,
      });
    });
  });

  describe('writeFeatureFlags', () => {
    it('should update and return the new feature flags', () => {
      const newFeatures = { featureC: true };
      const result = writeFeatureFlags(newFeatures);

      expect(result).toEqual({
        featureA: true,
        featureB: false,
        featureC: true,
      });
    });
  });
});

import { readFeatureFlags, writeFeatureFlags } from './lowDBService';

// Mock dependencies
jest.mock('lowdb/adapters/FileSync', () => {
  return jest.fn(() => ({}));
});

jest.mock('lowdb', () => {
  const mockDb = {
    get: jest.fn().mockImplementation((key) => ({
      value: jest.fn(() => {
        if (key === 'featureFlags') {
          return { featureA: true, featureB: false };
        }
        return undefined;
      }),
    })),
    set: jest.fn().mockReturnValue({
      write: jest.fn(),
    }),
  };
  return jest.fn(() => mockDb);
});

describe('LowDBService', () => {
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
    it('should update and return the new feature flags', async () => {
      const newFeatures = { featureC: true };
      const result = await writeFeatureFlags(newFeatures);  // Await the result

      expect(result).toEqual({
        featureA: true,
        featureB: false,
        featureC: true,
      });
    });
  });
});

// Import lowdb 1.0.0; TODO rip this out as soon as you have a data solution
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// server/services/mockDB.ts
interface MockDB {
  get(key: string): any;
  set(key: string, value: any): void;
}

class LowDBMock implements MockDB {
  private db: any;

  constructor(adapter: any) {
    this.db = low(adapter);
  }

  get(key: string) {
    return this.db.get(key).value();
  }

  set(key: string, value: any) {
    this.db.set(key, value).write();
  }
}

// Usage
const adapter = new FileSync('data/db.json');
const mockDB: MockDB = new LowDBMock(adapter);

// Read feature flags from the mock DB
export const readFeatureFlags = () => {
  return mockDB.get('featureFlags');
};

// Write updated feature flags to the mock DB
export const writeFeatureFlags = (newFeatures: Record<string, boolean>) => {
  const existingFeatures = readFeatureFlags();
  const updatedFeatures = { ...existingFeatures, ...newFeatures };
  mockDB.set('featureFlags', updatedFeatures);
  return updatedFeatures;
};
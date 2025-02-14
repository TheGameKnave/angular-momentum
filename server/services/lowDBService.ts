// Import lowdb 1.0.0; TODO rip this out as soon as you have a data solution
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Path to the mock database file
const adapter = new FileSync('data/db.json');
const db = low(adapter);

// Read feature flags from the JSON mock DB
export const readFeatureFlags = () => {
  return db.get('featureFlags').value();
};


// Write updated feature flags to the JSON mock DB
export const writeFeatureFlags = async (newFeatures: Record<string, boolean>) => {
  const existingFeatures = await readFeatureFlags();
  const updatedFeatures = { ...existingFeatures, ...newFeatures };
  await db.set('featureFlags',updatedFeatures).write();
  return updatedFeatures;
};

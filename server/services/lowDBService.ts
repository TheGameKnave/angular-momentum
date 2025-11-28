// Import lowdb 1.0.0; TODO rip this out as soon as you have a data solution
/* eslint-disable @typescript-eslint/no-require-imports */
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
/* eslint-enable @typescript-eslint/no-require-imports */

// Path to the mock database file
const adapter = new FileSync('data/db.json');
const db = low(adapter);

/**
 * Reads all feature flags from the JSON database.
 * Retrieves the current state of all feature flags from the LowDB database file.
 * @returns Object containing all feature flags as key-value pairs (key: string, value: boolean)
 */
export const readFeatureFlags = () => {
  return db.get('featureFlags').value();
};

/**
 * Updates feature flags in the JSON database.
 * Merges new feature flag values with existing ones and persists changes to the database file.
 * @param newFeatures - Object containing feature flag keys and their new boolean values
 * @returns Promise resolving to the complete updated feature flags object after merge
 */
export const writeFeatureFlags = async (newFeatures: Record<string, boolean>) => {
  const existingFeatures = await readFeatureFlags();
  const updatedFeatures = { ...existingFeatures, ...newFeatures };
  await db.set('featureFlags',updatedFeatures).write();
  return updatedFeatures;
};

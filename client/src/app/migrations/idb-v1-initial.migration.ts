import { IDBPDatabase } from 'idb';
import { IndexedDbMigration } from './index';

/**
 * IndexedDB Migration: v1 - Initial schema
 *
 * Creates the keyval object store for key-value storage.
 */
export const idbV1InitialMigration: IndexedDbMigration = {
  version: 1,
  description: 'Initial schema - create keyval store',
  migrate: (db: IDBPDatabase) => {
    db.createObjectStore('keyval');
  },
};

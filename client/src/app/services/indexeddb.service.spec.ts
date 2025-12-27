import { TestBed } from '@angular/core/testing';
import { IndexedDbService, IDB_STORES } from './indexeddb.service';
import { UserStorageService } from './user-storage.service';

describe('IndexedDbService', () => {
  let service: IndexedDbService;
  let mockStore: Map<string | number, unknown>;
  let mockDb: jasmine.SpyObj<any>;
  let mockUserStorageService: jasmine.SpyObj<UserStorageService>;

  beforeEach(() => {
    // Create an in-memory store to simulate IndexedDB
    mockStore = new Map();

    // Create mock UserStorageService
    mockUserStorageService = jasmine.createSpyObj('UserStorageService', ['prefixKey', 'storagePrefix']);
    mockUserStorageService.prefixKey.and.callFake((key: string) => `anonymous_${key}`);
    mockUserStorageService.storagePrefix.and.returnValue('anonymous');

    // Create mock database with proper typing
    mockDb = jasmine.createSpyObj('IDBPDatabase', ['get', 'put', 'delete', 'clear', 'getAllKeys']);
    mockDb.get.and.callFake((_store: string, key: string | number) => Promise.resolve(mockStore.get(key)));
    mockDb.put.and.callFake((_store: string, val: unknown, key: string | number) => {
      mockStore.set(key, val);
      return Promise.resolve(key);
    });
    mockDb.delete.and.callFake((_store: string, key: string | number) => {
      mockStore.delete(key);
      return Promise.resolve();
    });
    mockDb.clear.and.callFake(() => {
      mockStore.clear();
      return Promise.resolve();
    });
    mockDb.getAllKeys.and.callFake(() => Promise.resolve(Array.from(mockStore.keys())));

    TestBed.configureTestingModule({
      providers: [
        IndexedDbService,
        { provide: UserStorageService, useValue: mockUserStorageService }
      ]
    });

    service = TestBed.inject(IndexedDbService);
    // Replace the real dbPromise with our mock
    (service as any).dbPromise = Promise.resolve(mockDb);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve a value with prefixed key', async () => {
    await service.set('testKey', 'testValue', IDB_STORES.SETTINGS);

    // Verify the prefixed key was used
    expect(mockUserStorageService.prefixKey).toHaveBeenCalledWith('testKey');
    expect(mockStore.get('anonymous_testKey')).toBe('testValue');

    const result = await service.get('testKey', IDB_STORES.SETTINGS);
    expect(result).toBe('testValue');
  });

  it('should return undefined for non-existent key', async () => {
    const result = await service.get('nonExistent', IDB_STORES.SETTINGS);
    expect(result).toBeUndefined();
  });

  it('should overwrite existing value', async () => {
    await service.set('key', 'value1', IDB_STORES.SETTINGS);
    await service.set('key', 'value2', IDB_STORES.SETTINGS);
    const result = await service.get('key', IDB_STORES.SETTINGS);
    expect(result).toBe('value2');
  });

  it('should delete a value with prefixed key', async () => {
    await service.set('key', 'value', IDB_STORES.SETTINGS);
    await service.del('key', IDB_STORES.SETTINGS);

    // Verify prefixed key was deleted
    expect(mockStore.has('anonymous_key')).toBeFalse();

    const result = await service.get('key', IDB_STORES.SETTINGS);
    expect(result).toBeUndefined();
  });

  it('should clear all values for current user scope', async () => {
    await service.set('key1', 'value1', IDB_STORES.SETTINGS);
    await service.set('key2', 'value2', IDB_STORES.SETTINGS);

    // Add a key from a different user scope (shouldn't be cleared)
    mockStore.set('user_other_key', 'otherValue');

    await service.clear(IDB_STORES.SETTINGS);

    // Keys from current scope should be cleared
    expect(mockStore.has('anonymous_key1')).toBeFalse();
    expect(mockStore.has('anonymous_key2')).toBeFalse();

    // Key from other scope should remain
    expect(mockStore.get('user_other_key')).toBe('otherValue');
  });

  it('should retrieve all keys (all scopes)', async () => {
    await service.set('key1', 'value1', IDB_STORES.SETTINGS);
    await service.set('key2', 'value2', IDB_STORES.SETTINGS);

    const keys = await service.keys(IDB_STORES.SETTINGS);
    expect(keys.length).toBe(2);
    // Keys are stored with prefix
    expect(keys.map(k => String(k))).toContain('anonymous_key1');
    expect(keys.map(k => String(k))).toContain('anonymous_key2');
  });

  it('should handle numeric keys', async () => {
    await service.set(123, 'numericKeyValue', IDB_STORES.SETTINGS);
    const result = await service.get(123, IDB_STORES.SETTINGS);
    expect(result).toBe('numericKeyValue');
  });

  it('should store complex objects', async () => {
    const complexValue = { nested: { data: [1, 2, 3] }, flag: true };
    await service.set('complex', complexValue, IDB_STORES.SETTINGS);
    const result = await service.get('complex', IDB_STORES.SETTINGS);
    expect(result).toEqual(complexValue);
  });

  describe('raw methods', () => {
    it('should get value without prefixing using getRaw', async () => {
      mockStore.set('rawKey', 'rawValue');

      const result = await service.getRaw('rawKey', IDB_STORES.BACKUPS);

      expect(result).toBe('rawValue');
      // prefixKey should not have been called for getRaw
    });

    it('should set value without prefixing using setRaw', async () => {
      await service.setRaw('rawKey', 'rawValue', IDB_STORES.BACKUPS);

      expect(mockStore.get('rawKey')).toBe('rawValue');
    });

    it('should delete value without prefixing using delRaw', async () => {
      mockStore.set('rawKey', 'rawValue');

      await service.delRaw('rawKey', IDB_STORES.BACKUPS);

      expect(mockStore.has('rawKey')).toBeFalse();
    });
  });

  describe('version and migration methods', () => {
    it('should return previous version as 0 initially', () => {
      expect(service.getPreviousVersion()).toBe(0);
    });

    it('should return migrated as false initially', () => {
      expect(service.wasMigrated()).toBeFalse();
    });

    it('should return database version via getVersion', async () => {
      mockDb.version = 2;

      const version = await service.getVersion();

      expect(version).toBe(2);
    });
  });

  describe('getCurrentVersionWithoutMigrating', () => {
    it('should call indexedDB.databases and process results', async () => {
      // This test verifies the logic works with the real indexedDB.databases
      // Result depends on whether the test DB exists in the browser
      const version = await service.getCurrentVersionWithoutMigrating();

      // Should return a number (0 if no DB, or the actual version)
      expect(typeof version).toBe('number');
      expect(version).toBeGreaterThanOrEqual(0);
    });
  });

  describe('needsMigration', () => {
    it('should check if migration is needed based on current version', async () => {
      const needs = await service.needsMigration();

      // Should return a boolean
      expect(typeof needs).toBe('boolean');
    });
  });

  describe('openWithoutMigrating', () => {
    it('should return DB or null depending on existence', async () => {
      const db = await service.openWithoutMigrating();

      // Should return null or a database object
      if (db !== null) {
        expect(db.name).toBeDefined();
        db.close();
      }
    });

    it('should return null when database does not exist (version 0)', async () => {
      spyOn(service, 'getCurrentVersionWithoutMigrating').and.returnValue(Promise.resolve(0));

      const db = await service.openWithoutMigrating();

      expect(db).toBeNull();
    });
  });

  describe('init', () => {
    it('should not reinitialize if already initialized', async () => {
      // dbPromise is already set in beforeEach
      const originalPromise = (service as any).dbPromise;

      await service.init();

      // Should still be the same promise
      expect((service as any).dbPromise).toBe(originalPromise);
    });
  });

  describe('clearAll', () => {
    it('should clear all values from all stores for the current user scope', async () => {
      // Add keys to different stores with current user scope
      await service.set('key1', 'value1', IDB_STORES.PERSISTENT);
      await service.set('key2', 'value2', IDB_STORES.SETTINGS);
      await service.set('key3', 'value3', IDB_STORES.BACKUPS);

      // Add a key from a different user scope (shouldn't be cleared)
      mockStore.set('user_other_key', 'otherValue');

      await service.clearAll();

      // Keys from current scope should be cleared from all stores
      expect(mockStore.has('anonymous_key1')).toBeFalse();
      expect(mockStore.has('anonymous_key2')).toBeFalse();
      expect(mockStore.has('anonymous_key3')).toBeFalse();

      // Key from other scope should remain
      expect(mockStore.get('user_other_key')).toBe('otherValue');
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IndexedDbService } from './indexeddb.service';
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
    await service.set('testKey', 'testValue');

    // Verify the prefixed key was used
    expect(mockUserStorageService.prefixKey).toHaveBeenCalledWith('testKey');
    expect(mockStore.get('anonymous_testKey')).toBe('testValue');

    const result = await service.get('testKey');
    expect(result).toBe('testValue');
  });

  it('should return undefined for non-existent key', async () => {
    const result = await service.get('nonExistent');
    expect(result).toBeUndefined();
  });

  it('should overwrite existing value', async () => {
    await service.set('key', 'value1');
    await service.set('key', 'value2');
    const result = await service.get('key');
    expect(result).toBe('value2');
  });

  it('should delete a value with prefixed key', async () => {
    await service.set('key', 'value');
    await service.del('key');

    // Verify prefixed key was deleted
    expect(mockStore.has('anonymous_key')).toBeFalse();

    const result = await service.get('key');
    expect(result).toBeUndefined();
  });

  it('should clear all values for current user scope', async () => {
    await service.set('key1', 'value1');
    await service.set('key2', 'value2');

    // Add a key from a different user scope (shouldn't be cleared)
    mockStore.set('user_other_key', 'otherValue');

    await service.clear();

    // Keys from current scope should be cleared
    expect(mockStore.has('anonymous_key1')).toBeFalse();
    expect(mockStore.has('anonymous_key2')).toBeFalse();

    // Key from other scope should remain
    expect(mockStore.get('user_other_key')).toBe('otherValue');
  });

  it('should retrieve all keys (all scopes)', async () => {
    await service.set('key1', 'value1');
    await service.set('key2', 'value2');

    const keys = await service.keys();
    expect(keys.length).toBe(2);
    // Keys are stored with prefix
    expect(keys.map(k => String(k))).toContain('anonymous_key1');
    expect(keys.map(k => String(k))).toContain('anonymous_key2');
  });

  it('should handle numeric keys', async () => {
    await service.set(123, 'numericKeyValue');
    const result = await service.get(123);
    expect(result).toBe('numericKeyValue');
  });

  it('should store complex objects', async () => {
    const complexValue = { nested: { data: [1, 2, 3] }, flag: true };
    await service.set('complex', complexValue);
    const result = await service.get('complex');
    expect(result).toEqual(complexValue);
  });

  describe('raw methods', () => {
    it('should get value without prefixing using getRaw', async () => {
      mockStore.set('rawKey', 'rawValue');

      const result = await service.getRaw('rawKey');

      expect(result).toBe('rawValue');
      // prefixKey should not have been called for getRaw
    });

    it('should set value without prefixing using setRaw', async () => {
      await service.setRaw('rawKey', 'rawValue');

      expect(mockStore.get('rawKey')).toBe('rawValue');
    });

    it('should delete value without prefixing using delRaw', async () => {
      mockStore.set('rawKey', 'rawValue');

      await service.delRaw('rawKey');

      expect(mockStore.has('rawKey')).toBeFalse();
    });
  });
});

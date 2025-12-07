import { TestBed } from '@angular/core/testing';
import { IndexedDbService } from './indexeddb.service';

describe('IndexedDbService', () => {
  let service: IndexedDbService;
  let mockStore: Map<string | number, unknown>;
  let mockDb: jasmine.SpyObj<any>;

  beforeEach(() => {
    // Create an in-memory store to simulate IndexedDB
    mockStore = new Map();

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
      providers: [IndexedDbService]
    });

    service = TestBed.inject(IndexedDbService);
    // Replace the real dbPromise with our mock
    (service as any).dbPromise = Promise.resolve(mockDb);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve a value', async () => {
    await service.set('testKey', 'testValue');
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

  it('should delete a value', async () => {
    await service.set('key', 'value');
    await service.del('key');
    const result = await service.get('key');
    expect(result).toBeUndefined();
  });

  it('should clear all values', async () => {
    await service.set('key1', 'value1');
    await service.set('key2', 'value2');
    await service.clear();

    const keys = await service.keys();
    expect(keys.length).toBe(0);
  });

  it('should retrieve all keys', async () => {
    await service.set('key1', 'value1');
    await service.set('key2', 'value2');

    const keys = await service.keys();
    expect(keys.length).toBe(2);
    expect(keys.map(k => String(k))).toContain('key1');
    expect(keys.map(k => String(k))).toContain('key2');
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
});

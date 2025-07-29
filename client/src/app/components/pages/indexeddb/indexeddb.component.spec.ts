// client/src/app/indexed-db/indexed-db.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IndexedDBComponent } from './indexeddb.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { openDB, IDBPDatabase } from 'idb';

describe('IndexedDBComponent initialization', () => {
  let component: IndexedDBComponent;
  let fixture: ComponentFixture<IndexedDBComponent>;
  let db: IDBPDatabase;

  beforeEach(async () => {
    db = await openDB('momentum', 1, {
      upgrade(db) {
        db.createObjectStore('keyval');
      },
    });
  
    await TestBed.configureTestingModule({
      imports: [
        IndexedDBComponent,
        getTranslocoModule(),
        ReactiveFormsModule,
      ]
    }).compileComponents();
  
    fixture = TestBed.createComponent(IndexedDBComponent);
    component = fixture.componentInstance;
    component.dbPromise = db.put('keyval', 'Initial data', 'key').then(() => db);

    fixture.detectChanges();
  });

  afterEach(async () => {
    await db.clear('keyval');
    db.close();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create a IndexedDB instance', async () => {
    expect(component.dbPromise).toBeDefined();
  });

  it('should load data from IndexedDB on initialization', async () => {
    await component.getDbValue();
    expect(component.textAreaData.value).toBe('Initial data');
  });
});

describe('IndexedDBComponent operations', () => {
  let component: IndexedDBComponent;
  let fixture: ComponentFixture<IndexedDBComponent>;
  let db: IDBPDatabase;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IndexedDBComponent,
        getTranslocoModule(),
        ReactiveFormsModule,
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndexedDBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Create a mock IndexedDB instance
    db = await openDB('momentum', 1, {
      upgrade(db) {
        db.createObjectStore('keyval');
      },
    });
    await fixture.whenStable();
  });

  afterEach(async () => {
    await db.clear('keyval');
    db.close();
  });

  it('should store text area value in IndexedDB', fakeAsync(async () => {
    const testData = 'Test data';
    let storedValue: any;
    component.textAreaData.setValue(testData);
  
    // Simulate the passage of time for the debounce
    tick(500);
  
    // Verify the value is stored in IndexedDB
    await db.get('keyval', 'key').then((res) => {
      storedValue = res;
    });
    expect(storedValue).toBe(testData);
  }));


  it('should delete an item from IndexedDB', async () => {
    await component.set('key', 'test value'); // Add an item to the database
    await component.del('key'); // Delete the item

    const value = await db.get('keyval', 'key');
    expect(value).toBeUndefined();
  });

  it('should clear all items from IndexedDB', async () => {
    await component.set('key1', 'value1'); // Add an item
    await component.set('key2', 'value2'); // Add another item
    await component.clear(); // Clear all items

    const keys = await db.getAllKeys('keyval');
    expect(keys.length).toBe(0);
  });

  it('should retrieve all keys from IndexedDB', async () => {
    await component.set('key1', 'value1'); // Add an item
    await component.set('key2', 'value2'); // Add another item

    const keys = await component.keys() as string[];
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should handle empty values', async () => {
    component.textAreaData.setValue('');
    await component.getDbValue();
    expect(component.textAreaData.value).toBe('');
  });

  // TODO figure out how to test database upgrades without crashing the test suite
  // it('should create the object store on database upgrade', async () => {
  //   // Open the database with a higher version to trigger the upgrade
  //   const upgradedDb = await openDB('momentum', 2, {
  //     upgrade(db) {
  //       // This block should be executed, covering the `upgrade` function
  //       if (!db.objectStoreNames.contains('keyval')) {
  //         db.createObjectStore('keyval');
  //       }
  //     },
  //   });

  //   // Verify that the object store was created
  //   expect(upgradedDb.objectStoreNames.contains('keyval')).toBeTrue();

  //   await deleteDB('momentum');
  // });
  
  it('should handle multiple simultaneous updates', fakeAsync(async () => {
    component.textAreaData.setValue('test');
    tick(200);
    component.textAreaData.setValue('test2');
    tick(400);
    await component.getDbValue();
    expect(component.textAreaData.value).toBe('test2');
  }));
  
  it('should debounce updates', fakeAsync(async () => {
    spyOn(component, 'set');
    component.textAreaData.setValue('test');
    tick(200);
    expect(component.set).not.toHaveBeenCalled();
    tick(400);
    expect(component.set).toHaveBeenCalledTimes(1);
  }));
  
  it('should handle key collisions', async () => {
    await component.set('key', 'value1');
    await component.set('key', 'value2');
    const data = await component.get('key');
    expect(data).toBe('value2');
  });
  
  it('should clear data', async () => {
    await component.set('key', 'value');
    await component.clear();
    const data = await component.get('key');
    expect(data).toBeUndefined();
  });

  it('should load data from IndexedDB on initialization', async () => {
    // Add some data to the IndexedDB
    await component.set('key', 'Initial data');
  
    // Call getDbValue() to load the data
    await component.getDbValue();
  
    // Check that the textAreaData value is set to 'Initial data'
    expect(component.textAreaData.value).toBe('Initial data');
  });
});

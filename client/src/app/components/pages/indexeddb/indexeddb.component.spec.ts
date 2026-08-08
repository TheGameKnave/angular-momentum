import { ComponentFixture, TestBed, fakeAsync, tick, flush, discardPeriodicTasks } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { IndexedDBComponent } from './indexeddb.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { IndexedDbService, IDB_STORES } from '@app/services/indexeddb.service';
import { UserStorageService } from '@app/services/user-storage.service';

describe('IndexedDBComponent', () => {
  let component: IndexedDBComponent;
  let fixture: ComponentFixture<IndexedDBComponent>;
  let indexedDbServiceSpy: jasmine.SpyObj<IndexedDbService>;
  let storagePrefixSignal: WritableSignal<string>;

  beforeEach(async () => {
    indexedDbServiceSpy = jasmine.createSpyObj('IndexedDbService', ['get', 'set', 'del', 'clear', 'keys']);
    indexedDbServiceSpy.get.and.returnValue(Promise.resolve(undefined));
    indexedDbServiceSpy.set.and.returnValue(Promise.resolve('key'));

    storagePrefixSignal = signal('anonymous');
    const mockUserStorageService = {
      storagePrefix: storagePrefixSignal,
      prefixKey: (key: string) => `anonymous_${key}`,
    };

    await TestBed.configureTestingModule({
      imports: [
        IndexedDBComponent,
        getTranslocoModule(),
        ReactiveFormsModule,
      ],
      providers: [
        { provide: IndexedDbService, useValue: indexedDbServiceSpy },
        { provide: UserStorageService, useValue: mockUserStorageService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndexedDBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Allow the effect to run and loadStoredValue to complete
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load stored value on initialization', async () => {
    indexedDbServiceSpy.get.and.returnValue(Promise.resolve('Stored data'));

    // Re-create component to test ngOnInit
    fixture = TestBed.createComponent(IndexedDBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(indexedDbServiceSpy.get).toHaveBeenCalledWith('key', IDB_STORES.PERSISTENT);
    expect(component.textAreaData.value).toBe('Stored data');
  });

  it('should not set value if stored data is not a string', async () => {
    indexedDbServiceSpy.get.and.returnValue(Promise.resolve({ invalid: 'object' }));

    fixture = TestBed.createComponent(IndexedDBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.textAreaData.value).toBe('');
  });

  it('should save textarea value to IndexedDB after debounce', fakeAsync(() => {
    // Clear any calls from initialization
    indexedDbServiceSpy.set.calls.reset();

    component.textAreaData.setValue('Test data');

    // Should not save immediately
    tick(200);
    expect(indexedDbServiceSpy.set).not.toHaveBeenCalled();

    // Should save after debounce time (400ms)
    tick(300);
    expect(indexedDbServiceSpy.set).toHaveBeenCalledWith('key', 'Test data', IDB_STORES.PERSISTENT);

    discardPeriodicTasks();
  }));

  it('should debounce multiple rapid changes', fakeAsync(() => {
    // Clear any calls from initialization
    indexedDbServiceSpy.set.calls.reset();

    component.textAreaData.setValue('first');
    tick(200);
    component.textAreaData.setValue('second');
    tick(200);
    component.textAreaData.setValue('third');
    tick(500);

    // Should only save the final value once
    expect(indexedDbServiceSpy.set).toHaveBeenCalledTimes(1);
    expect(indexedDbServiceSpy.set).toHaveBeenCalledWith('key', 'third', IDB_STORES.PERSISTENT);

    discardPeriodicTasks();
  }));

  it('should handle empty values', fakeAsync(() => {
    // Clear any calls from initialization
    indexedDbServiceSpy.set.calls.reset();

    component.textAreaData.setValue('');
    tick(500);

    expect(indexedDbServiceSpy.set).toHaveBeenCalledWith('key', '', IDB_STORES.PERSISTENT);

    discardPeriodicTasks();
  }));

  it('should not persist anything as a side effect of loading a new scope', fakeAsync(() => {
    // Regression guard: loading used to dispatch a synthetic 'input' event
    // (for the float label); Angular's value accessor picked it up and the
    // debounced save then wrote the just-loaded value into the new scope —
    // planting '' in every fresh user's storage on login.
    indexedDbServiceSpy.get.and.returnValue(Promise.resolve('other scope data'));
    indexedDbServiceSpy.set.calls.reset();

    storagePrefixSignal.set('user_abc');
    fixture.detectChanges(); // run the scope-switch effect
    tick();                  // let loadStoredValue's IndexedDB read settle
    fixture.detectChanges(); // render the loaded value (float label CD pass)
    tick(2000);              // well past the save debounce

    expect(component.textAreaData.value).toBe('other scope data');
    expect(indexedDbServiceSpy.set).not.toHaveBeenCalled();

    discardPeriodicTasks();
  }));
});

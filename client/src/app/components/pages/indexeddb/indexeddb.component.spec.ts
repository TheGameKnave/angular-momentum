import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IndexedDBComponent } from './indexeddb.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { IndexedDbService } from '@app/services/indexeddb.service';

describe('IndexedDBComponent', () => {
  let component: IndexedDBComponent;
  let fixture: ComponentFixture<IndexedDBComponent>;
  let indexedDbServiceSpy: jasmine.SpyObj<IndexedDbService>;

  beforeEach(async () => {
    indexedDbServiceSpy = jasmine.createSpyObj('IndexedDbService', ['get', 'set', 'del', 'clear', 'keys']);
    indexedDbServiceSpy.get.and.returnValue(Promise.resolve(undefined));
    indexedDbServiceSpy.set.and.returnValue(Promise.resolve('key'));

    await TestBed.configureTestingModule({
      imports: [
        IndexedDBComponent,
        getTranslocoModule(),
        ReactiveFormsModule,
      ],
      providers: [
        { provide: IndexedDbService, useValue: indexedDbServiceSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndexedDBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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

    expect(indexedDbServiceSpy.get).toHaveBeenCalledWith('key');
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
    component.textAreaData.setValue('Test data');

    // Should not save immediately
    tick(200);
    expect(indexedDbServiceSpy.set).not.toHaveBeenCalled();

    // Should save after debounce time (400ms)
    tick(300);
    expect(indexedDbServiceSpy.set).toHaveBeenCalledWith('key', 'Test data');
  }));

  it('should debounce multiple rapid changes', fakeAsync(() => {
    component.textAreaData.setValue('first');
    tick(200);
    component.textAreaData.setValue('second');
    tick(200);
    component.textAreaData.setValue('third');
    tick(500);

    // Should only save the final value once
    expect(indexedDbServiceSpy.set).toHaveBeenCalledTimes(1);
    expect(indexedDbServiceSpy.set).toHaveBeenCalledWith('key', 'third');
  }));

  it('should handle empty values', fakeAsync(() => {
    component.textAreaData.setValue('');
    tick(500);

    expect(indexedDbServiceSpy.set).toHaveBeenCalledWith('key', '');
  }));
});

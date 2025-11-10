import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { openDB } from 'idb';
import { debounceTime } from 'rxjs';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from "primeng/card";
import { TextareaModule } from 'primeng/textarea';

/**
 * IndexedDB component that demonstrates browser-based persistent storage.
 *
 * This component provides a textarea interface that automatically saves user input
 * to IndexedDB with debouncing. Data persists across browser sessions and page refreshes,
 * showcasing client-side storage capabilities.
 */
@Component({
  selector: 'app-indexeddb',
  templateUrl: './indexeddb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    CardModule,
    FloatLabelModule,
    TextareaModule,
],
})
export class IndexedDBComponent implements OnInit {
  textAreaData = new FormControl('');

  constructor(
    readonly destroyRef: DestroyRef,
    private readonly featureMonitorService: FeatureMonitorService,
    private readonly cd: ChangeDetectorRef,
  ){}

  ngOnInit() {
    this.getDbValue().then();

    this.textAreaData.valueChanges.pipe(
      debounceTime(400),
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.set('key', data);
    });

  }

  /**
   * Retrieves the stored value from IndexedDB and populates the textarea.
   * Also dispatches an 'input' event to the textarea element to ensure
   * proper UI state updates (e.g., for floating labels).
   * @returns Promise that resolves when the value is loaded
   */
  getDbValue(): Promise<void> {
    return this.get('key').then(data => {
      if (typeof data === 'string') {
        this.textAreaData.setValue(data, { emitEvent: false });

      // tell the DOM element it has new content
      const el = document.getElementById('indexeddb') as HTMLTextAreaElement | null;
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      }
    });
  }

  /**
   * Promise that resolves to the IndexedDB database instance.
   * Creates the 'momentum' database with version 1 and a 'keyval' object store
   * if it doesn't already exist.
   */
  dbPromise = openDB('momentum', 1, {
    // TODO figure out why this has inconsistent coverage
    // istanbul ignore next
    upgrade(db) {
      db.createObjectStore('keyval');
    },
  });

  /**
   * Retrieves a value from the IndexedDB key-value store.
   * @param key - The key to retrieve
   * @returns Promise that resolves to the stored value
   */
  async get(key: string | number) {
    return (await this.dbPromise).get('keyval', key);
  }

  /**
   * Stores a value in the IndexedDB key-value store.
   * @param key - The key to store the value under
   * @param val - The value to store
   * @returns Promise that resolves when the value is stored
   */
  async set(key: string | number, val: unknown) {
    return (await this.dbPromise).put('keyval', val, key);
  }

  /**
   * Deletes a value from the IndexedDB key-value store.
   * @param key - The key to delete
   * @returns Promise that resolves when the value is deleted
   */
  async del(key: string | number) {
    return (await this.dbPromise).delete('keyval', key);
  }

  /**
   * Clears all values from the IndexedDB key-value store.
   * @returns Promise that resolves when all values are cleared
   */
  async clear() {
    return (await this.dbPromise).clear('keyval');
  }

  /**
   * Retrieves all keys from the IndexedDB key-value store.
   * @returns Promise that resolves to an array of all keys
   */
  async keys() {
    return (await this.dbPromise).getAllKeys('keyval');
  }
}

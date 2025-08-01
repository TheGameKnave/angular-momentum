import { ChangeDetectionStrategy, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { openDB } from 'idb';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-indexeddb',
  templateUrl: './indexeddb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
  ],
})
export class IndexedDBComponent implements OnInit {
  textAreaData = new FormControl('');

  constructor(
    readonly destroyRef: DestroyRef,
    private readonly featureMonitorService: FeatureMonitorService,
  ){}

  ngOnInit() {
    this.getDbValue().then();

    this.textAreaData.valueChanges.pipe(
      debounceTime(400),
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.set('key', data);
    });
  
  }

  getDbValue(): Promise<void> {
    return this.get('key').then(data => {
      if (typeof data === 'string') {
        this.textAreaData.setValue(data);
      }
    });
  }

  dbPromise = openDB('momentum', 1, {
    // TODO figure out why this has inconsistent coverage
    // istanbul ignore next
    upgrade(db) {
      db.createObjectStore('keyval');
    },
  });
  
  async get(key: string | number) {
    return (await this.dbPromise).get('keyval', key);
  }
  async set(key: string | number, val: unknown) {
    return (await this.dbPromise).put('keyval', val, key);
  }
  async del(key: string | number) {
    return (await this.dbPromise).delete('keyval', key);
  }
  async clear() {
    return (await this.dbPromise).clear('keyval');
  }
  async keys() {
    return (await this.dbPromise).getAllKeys('keyval');
  }
}

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { openDB } from 'idb';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs';
import { AutoUnsubscribe } from '@app/helpers/unsub';

@AutoUnsubscribe()
@Component({
  selector: 'app-indexeddb',
  templateUrl: './indexeddb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
  ],
})
export class IndexedDBComponent implements OnInit, OnDestroy {
  textAreaData = new FormControl('');
  textAreaSub: Subscription | undefined;

  ngOnInit() {
  
    this.getDbValue().then();

    this.textAreaSub = this.textAreaData.valueChanges.pipe(
      debounceTime(400)
    ).subscribe((data) => {
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

  ngOnDestroy(): void {}
}

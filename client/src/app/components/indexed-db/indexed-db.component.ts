import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { openDB } from 'idb';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AutoUnsubscribe } from 'src/app/helpers/unsub';

@AutoUnsubscribe()
@Component({
    selector: 'app-indexed-db',
    imports: [
        ReactiveFormsModule,
        TranslocoDirective,
    ],
    templateUrl: './indexed-db.component.html',
    styles: ``
})
export class IndexedDBComponent implements OnInit, OnDestroy {
  textAreaData = new FormControl('');
  textAreaSub: Subscription | undefined;

  ngOnInit() {
  
    this.getDbValue().then(() => {});

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
  
  async get(key:any) {
    return (await this.dbPromise).get('keyval', key);
  }
  async set(key:any, val:any) {
    return (await this.dbPromise).put('keyval', val, key);
  }
  async del(key:any) {
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

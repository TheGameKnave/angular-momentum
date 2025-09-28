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

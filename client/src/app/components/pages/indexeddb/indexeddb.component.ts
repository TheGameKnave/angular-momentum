import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { debounceTime } from 'rxjs';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from "primeng/card";
import { TextareaModule } from 'primeng/textarea';
import { INDEXEDDB_CONFIG } from '@app/constants/ui.constants';
import { IndexedDbService } from '@app/services/indexeddb.service';
import { UserStorageService } from '@app/services/user-storage.service';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly userStorageService = inject(UserStorageService);

  private readonly storageKey = 'key';
  textAreaData = new FormControl('');

  constructor() {
    // Reload stored value when user scope changes (login/logout).
    // Storage promotion happens before auth signals update, so data is already in place.
    effect(() => {
      // Access signal to create dependency
      this.userStorageService.storagePrefix();
      // Reload data from the new user scope
      this.loadStoredValue();
    });
  }

  /**
   * Angular lifecycle hook called after component initialization.
   * Loads the initial value from IndexedDB and sets up a debounced subscription
   * to persist textarea value changes to IndexedDB on user input.
   */
  ngOnInit() {
    this.textAreaData.valueChanges.pipe(
      debounceTime(INDEXEDDB_CONFIG.DEBOUNCE_TIME_MS),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((data) => {
      this.indexedDbService.set(this.storageKey, data);
    });
  }

  /**
   * Retrieves the stored value from IndexedDB and populates the textarea.
   * Also dispatches an 'input' event to the textarea element to ensure
   * proper UI state updates (e.g., for floating labels).
   */
  private async loadStoredValue(): Promise<void> {
    const data = await this.indexedDbService.get(this.storageKey);
    const value = typeof data === 'string' ? data : '';
    this.textAreaData.setValue(value, { emitEvent: false });

    // tell the DOM element it has new content
    const el = document.getElementById('indexeddb') as HTMLTextAreaElement | null;
    if (el) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

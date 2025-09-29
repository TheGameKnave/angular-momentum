import { DestroyRef, Injectable } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith } from 'rxjs';

import { check, Update } from '@tauri-apps/plugin-updater';
import { ask } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { isTauri } from '@tauri-apps/api/core';

import { ENVIRONMENT } from 'src/environments/environment';
import { LogService } from './log.service';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private confirming = false;

  constructor(
    private readonly updates: SwUpdate,
    private readonly destroyRef: DestroyRef,
    private readonly log: LogService,
  ) {
    this.init();
  }

  protected init(): void {
    if (!['production', 'staging', 'local'].includes(ENVIRONMENT.env)) return;

    // Listen for Angular Service Worker version events
    // istanbul ignore next because jasmine is awful
    this.updates.versionUpdates
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.handleSwEvent(event));

    // Run immediate and interval-based update checks
    interval(15 * 60 * 1000)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        /*keep*/console.log('Checking for updates...');
        this.checkServiceWorkerUpdate();
        this.checkTauriUpdate();
      });
  }

  // --- Angular SW ---

  private checkServiceWorkerUpdate(): void {
    // istanbul ignore next because jasmine is awful
    if (isTauri()) return;
    this.updates.checkForUpdate().then(available => {
      if (available) {
        this.log.log(this.constructor.name,'SW: Update available, activating...');
        this.updates.activateUpdate().then(() => {
          this.log.log(this.constructor.name,'SW: Update activated. Awaiting VERSION_READY...');
          // VERSION_READY will trigger handleSwEvent
        });
      } else {
        this.log.log(this.constructor.name,'SW: No update available.');
      }
    }).catch(err => {
      console.error('SW: Failed to check for update:', err);
    });
  }

  private async handleSwEvent(event: VersionEvent): Promise<void> {
    if (event.type === 'VERSION_READY' && !this.confirming) {
      this.confirming = true;
      const confirmed = await this.confirmUser('A new version is available. Reload now?');

      this.confirming = false;
      if (confirmed) {
        this.reloadPage();
      }
    } else if (event.type === 'VERSION_DETECTED') {
      this.log.log(this.constructor.name,'SW: New version detected:', event.version);
    }
  }

  // --- Tauri ---

  // istanbul ignore next
  private async checkTauriUpdate(): Promise<void> {
    if (!isTauri()) return;

    try {
      const update = await check();
      if (update && !this.confirming) {
        this.log.log(this.constructor.name,'Tauri: Update available', update);
        await this.promptTauriUpdate(update);
      } else {
        this.log.log(this.constructor.name,'Tauri: No update available');
      }
    } catch (err) {
      console.error('Tauri updater failed:', err);
    }
  }

  private async promptTauriUpdate(update: Update): Promise<void> {
    this.confirming = true;
    const confirmed = await this.confirmUser('A new version is available. Install and restart now?');
    if (confirmed) {
      try {
        let downloaded = 0;
        let contentLength = 0;
        await update.downloadAndInstall(event => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              this.log.log(this.constructor.name,`started downloading ${event.data.contentLength} bytes`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              this.log.log(this.constructor.name,`downloaded ${downloaded} from ${contentLength}`);
              break;
            case 'Finished':
              this.log.log(this.constructor.name,'download finished');
              break;
          }
        });

        console.log('update installed');
        await this.relaunchApp();
      } catch (err) {
        // istanbul ignore next
        console.error('Failed to install Tauri update:', err);
      }
    }

    this.confirming = false;
  }

  // --- Wrappers that can be spied on in tests ---

  // istanbul ignore next
  protected reloadPage(): void {
    window.location.reload();
  }

  // istanbul ignore next
  protected async confirmUser(message: string): Promise<boolean> {
    try {
      if (isTauri()) {
        return await ask(message, {
          title: 'Update Available',
          okLabel: 'Yes',
          cancelLabel: 'Later'
        });
      } else {
        return confirm(message);
      }
    } catch (err) {
      console.error('Confirmation failed:', err);
      return false;
    }
  }

  // istanbul ignore next
  protected async relaunchApp(): Promise<void> {
    await relaunch();
  }
}

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
import { UPDATE_CONFIG } from '@app/constants/service.constants';

/**
 * Service for managing application updates across web and Tauri platforms.
 *
 * Handles update checking, downloading, and installation for both:
 * - Angular Service Worker updates (PWA/web)
 * - Tauri native application updates (desktop)
 *
 * Features:
 * - Automatic update checks every 15 minutes
 * - User confirmation before applying updates
 * - Progress tracking for Tauri updates
 * - Platform-specific update strategies
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private confirming = false;

  constructor(
    private readonly updates: SwUpdate,
    private readonly destroyRef: DestroyRef,
    private readonly logService: LogService,
  ) {
    this.init();
  }

  /**
   * Initialize the update service.
   * Sets up update checking intervals and event listeners.
   * Only runs in production, staging, and local environments.
   */
  protected init(): void {
    if (!['production', 'staging', 'local'].includes(ENVIRONMENT.env)) return;

    // Listen for Angular Service Worker version events
    // istanbul ignore next because jasmine is awful
    this.updates.versionUpdates
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.handleSwEvent(event));

    // Run immediate and interval-based update checks
    interval(UPDATE_CONFIG.CHECK_INTERVAL_MS)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        /**/console.log('Checking for updates...');
        this.checkServiceWorkerUpdate();
        this.checkTauriUpdate();
      });
  }

  // --- Angular SW ---

  /**
   * Check for Angular Service Worker updates.
   * Only runs on web platforms (not Tauri).
   * Automatically activates updates if available.
   */
  private checkServiceWorkerUpdate(): void {
    // istanbul ignore next because jasmine is awful
    if (isTauri()) return;
    this.updates.checkForUpdate().then(available => {
      if (available) {
        this.logService.log('SW: Update available, activating...');
        this.updates.activateUpdate().then(() => {
          this.logService.log('SW: Update activated. Awaiting VERSION_READY...');
          // VERSION_READY will trigger handleSwEvent
        });
      } else {
        this.logService.log('SW: No update available.');
      }
    }).catch(err => {
      console.error('SW: Failed to check for update:', err);
    });
  }

  /**
   * Handle Angular Service Worker version events.
   * Prompts user to reload when a new version is ready.
   *
   * @param event - Service Worker version event
   */
  private async handleSwEvent(event: VersionEvent): Promise<void> {
    if (event.type === 'VERSION_READY' && !this.confirming) {
      this.confirming = true;
      const confirmed = await this.confirmUser('A new version is available. Reload now?');

      this.confirming = false;
      if (confirmed) {
        this.reloadPage();
      }
    } else if (event.type === 'VERSION_DETECTED') {
      this.logService.log('SW: New version detected:', event.version);
    }
  }

  // --- Tauri ---

  /**
   * Check for Tauri application updates.
   * Only runs on Tauri platforms (not web).
   * Prompts user to download and install if update is available.
   */
  // istanbul ignore next
  private async checkTauriUpdate(): Promise<void> {
    if (!isTauri()) return;

    try {
      const update = await check();
      if (update && !this.confirming) {
        this.logService.log('Tauri: Update available', update);
        await this.promptTauriUpdate(update);
      } else {
        this.logService.log('Tauri: No update available');
      }
    } catch (err) {
      console.error('Tauri updater failed:', err);
    }
  }

  /**
   * Prompt user to install Tauri update and handle download/installation.
   * Tracks download progress and relaunches app when complete.
   *
   * @param update - Tauri update object containing update information
   */
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
              contentLength = event.data.contentLength ?? 0;
              this.logService.log(`started downloading ${event.data.contentLength} bytes`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              this.logService.log(`downloaded ${downloaded} from ${contentLength}`);
              break;
            case 'Finished':
              this.logService.log('download finished');
              break;
          }
        });

        await this.relaunchApp();
      } catch (err) {
        // istanbul ignore next
        console.error('Failed to install Tauri update:', err);
      }
    }

    this.confirming = false;
  }

  // --- Wrappers that can be spied on in tests ---

  /**
   * Reload the current page.
   * Wrapper method to allow spying in tests.
   */
  // istanbul ignore next
  protected reloadPage(): void {
    window.location.reload();
  }

  /**
   * Show confirmation dialog to user.
   * Uses native Tauri dialog on desktop, browser confirm on web.
   * Wrapper method to allow spying in tests.
   *
   * @param message - Confirmation message to display
   * @returns Promise resolving to true if user confirmed, false otherwise
   */
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

  /**
   * Relaunch the Tauri application.
   * Wrapper method to allow spying in tests.
   */
  // istanbul ignore next
  protected async relaunchApp(): Promise<void> {
    await relaunch();
  }
}

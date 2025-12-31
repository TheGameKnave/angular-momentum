import { DestroyRef, Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
import { UpdateDialogService } from './update-dialog.service';
import { ChangeLogService } from './change-log.service';

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
  private readonly updates = inject(SwUpdate, { optional: true }); // Optional for SSR
  private readonly destroyRef = inject(DestroyRef);
  private readonly logService = inject(LogService);
  private readonly updateDialogService = inject(UpdateDialogService);
  private readonly changeLogService = inject(ChangeLogService);
  private readonly platformId = inject(PLATFORM_ID);
  // istanbul ignore next - SSR guard
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private confirming = false;
  private checkInProgress = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize the update service.
   * Sets up update checking intervals and event listeners.
   * Only runs in production, staging, and local environments.
   */
  protected init(): void {
    // istanbul ignore next - SSR guard
    if (!this.isBrowser) return;
    if (!['production', 'staging', 'local'].includes(ENVIRONMENT.env)) return;

    /**/console.log('[UpdateService] Initializing...');
    /**/console.log('[UpdateService] Environment:', ENVIRONMENT.env);
    /**/console.log('[UpdateService] SwUpdate available:', !!this.updates);
    /**/console.log('[UpdateService] SwUpdate enabled:', this.updates?.isEnabled);
    /**/console.log('[UpdateService] Check interval:', UPDATE_CONFIG.CHECK_INTERVAL_MS, 'ms');
    /**/console.log('[UpdateService] Current version from changelog:', this.changeLogService.getCurrentVersion());
    /**/console.log('[UpdateService] Previous version on init:', this.changeLogService.previousVersion());

    // Clear any stale previousVersion on fresh page load
    // If user reloaded the page, they already have the new code - no update dialog needed
    this.changeLogService.clearPreviousVersion();
    /**/console.log('[UpdateService] Cleared previousVersion on init');

    // Listen for Angular Service Worker version events (only if SwUpdate is available)
    // istanbul ignore next - SwUpdate observable subscription requires real service worker context
    if (this.updates) {
      /**/console.log('[UpdateService] Subscribing to versionUpdates...');
      this.updates.versionUpdates
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          /**/console.log('[UpdateService] versionUpdates event received:', event.type, event);
          this.handleSwEvent(event);
        });
    }

    // Run immediate and interval-based update checks
    interval(UPDATE_CONFIG.CHECK_INTERVAL_MS)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const now = new Date().toLocaleString();
        /**/console.log(`[UpdateService] ========== Update check @ ${now} ==========`);
        /**/console.log('[UpdateService] confirming flag:', this.confirming);
        /**/console.log('[UpdateService] previousVersion:', this.changeLogService.previousVersion());
        /**/console.log('[UpdateService] currentVersion:', this.changeLogService.getCurrentVersion());
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
    // istanbul ignore next - Tauri platform detection, isTauri() always returns false in unit tests
    if (isTauri()) {
      /**/console.log('[UpdateService] checkServiceWorkerUpdate: Skipping (Tauri platform)');
      return;
    }
    // istanbul ignore next - SSR guard, SwUpdate is null during server rendering
    if (!this.updates) {
      /**/console.log('[UpdateService] checkServiceWorkerUpdate: Skipping (SwUpdate not available)');
      return;
    }
    if (!this.updates.isEnabled) {
      /**/console.log('[UpdateService] checkServiceWorkerUpdate: Skipping (SwUpdate not enabled)');
      return;
    }
    if (this.checkInProgress) {
      /**/console.log('[UpdateService] checkServiceWorkerUpdate: Skipping (check already in progress)');
      return;
    }

    // Capture current version BEFORE checking for updates
    // This prevents race condition where VERSION_READY fires before checkForUpdate() resolves
    /**/console.log('[UpdateService] Capturing previous version before check:', this.changeLogService.getCurrentVersion());
    this.changeLogService.capturePreviousVersion();

    this.checkInProgress = true;
    /**/console.log('[UpdateService] checkServiceWorkerUpdate: Calling SwUpdate.checkForUpdate()...');

    // Race between checkForUpdate and timeout to prevent indefinite hangs
    const checkPromise = this.updates.checkForUpdate();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Update check timed out')), UPDATE_CONFIG.CHECK_TIMEOUT_MS);
    });

    Promise.race([checkPromise, timeoutPromise]).then(available => {
      this.checkInProgress = false;
      /**/console.log('[UpdateService] checkForUpdate() returned:', available);
      if (available) {
        /**/console.log('[UpdateService] Update IS available!');
        /**/console.log('[UpdateService] Previous version captured:', this.changeLogService.previousVersion());
        /**/console.log('[UpdateService] Calling activateUpdate()...');
        this.updates!.activateUpdate().then(() => {
          /**/console.log('[UpdateService] activateUpdate() completed. Waiting for VERSION_READY event...');
          this.logService.log('SW: Update activated. Awaiting VERSION_READY...');
        }).catch(err => {
          /**/console.error('[UpdateService] activateUpdate() failed:', err);
        });
      } else {
        /**/console.log('[UpdateService] No update available from SW.');
        this.logService.log('SW: No update available.');
        // Clear captured version since no update was found
        this.changeLogService.clearPreviousVersion();
      }
    }).catch(err => {
      this.checkInProgress = false;
      /**/console.error('[UpdateService] checkForUpdate() failed:', err);
      // Clear captured version on error/timeout
      this.changeLogService.clearPreviousVersion();
    });
  }

  /**
   * Handle Angular Service Worker version events.
   * Prompts user to reload when a new version is ready.
   * Refreshes changelog to get canonical version info.
   *
   * Note: Data migrations are handled separately on app startup,
   * independent of the update process.
   *
   * @param event - Service Worker version event
   */
  private async handleSwEvent(event: VersionEvent): Promise<void> {
    /**/console.log('[UpdateService] handleSwEvent called with:', event.type);
    /**/console.log('[UpdateService] Full event object:', JSON.stringify(event, null, 2));
    /**/console.log('[UpdateService] confirming flag:', this.confirming);

    if (event.type === 'VERSION_READY') {
      /**/console.log('[UpdateService] VERSION_READY received');
      /**/console.log('[UpdateService] previousVersion:', this.changeLogService.previousVersion());
      /**/console.log('[UpdateService] currentVersion:', this.changeLogService.getCurrentVersion());

      if (this.confirming) {
        /**/console.log('[UpdateService] Already confirming, skipping dialog');
        return;
      }

      // Skip dialog if previousVersion wasn't captured (page loaded fresh with new code)
      // This happens when SW cache is stale but page already loaded new code from network
      if (!this.changeLogService.previousVersion()) {
        /**/console.log('[UpdateService] No previousVersion captured - page loaded fresh with new code');
        this.logService.log('SW: No previous version captured, skipping dialog');
        return;
      }

      /**/console.log('[UpdateService] Showing update dialog...');
      this.confirming = true;

      // Refresh changelog to get canonical new version from API
      // This ensures appDiff reflects the actual new version, not cached data
      /**/console.log('[UpdateService] Refreshing changelog...');
      this.changeLogService.refresh();
      /**/console.log('[UpdateService] After refresh - currentVersion:', this.changeLogService.getCurrentVersion());

      // Show update dialog
      const confirmed = await this.updateDialogService.show();
      /**/console.log('[UpdateService] Dialog result:', confirmed);

      this.confirming = false;
      if (confirmed) {
        /**/console.log('[UpdateService] User confirmed, reloading page...');
        this.reloadPage();
      } else {
        /**/console.log('[UpdateService] User skipped/dismissed dialog');
      }
    } else if (event.type === 'VERSION_DETECTED') {
      /**/console.log('[UpdateService] VERSION_DETECTED - new version hash:', event.version?.hash);
      this.logService.log('SW: New version detected:', event.version);
    } else if (event.type === 'VERSION_INSTALLATION_FAILED') {
      /**/console.error('[UpdateService] VERSION_INSTALLATION_FAILED:', event);
    } else if (event.type === 'NO_NEW_VERSION_DETECTED') {
      /**/console.log('[UpdateService] NO_NEW_VERSION_DETECTED');
    }
  }

  // --- Tauri ---

  /**
   * Check for Tauri application updates.
   * Only runs on Tauri platforms (not web).
   * Prompts user to download and install if update is available.
   */
  // istanbul ignore next - Tauri API, requires real Tauri runtime
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
        // istanbul ignore next - Tauri update error path, requires real Tauri runtime
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
  // istanbul ignore next - browser reload, integration test scope
  protected reloadPage(): void {
    globalThis.location.reload();
  }

  /**
   * Show confirmation dialog to user.
   * Uses native Tauri dialog on desktop, browser confirm on web.
   * Wrapper method to allow spying in tests.
   *
   * @param message - Confirmation message to display
   * @returns Promise resolving to true if user confirmed, false otherwise
   */
  // istanbul ignore next - Tauri/browser dialog, integration test scope
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
  // istanbul ignore next - Tauri API, requires real Tauri runtime
  protected async relaunchApp(): Promise<void> {
    await relaunch();
  }
}

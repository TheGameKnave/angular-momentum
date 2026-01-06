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

  // Key used to track if the first update check cycle has completed
  private static readonly SESSION_KEY = 'sw_first_check_complete';

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

    // Clear session flag on every page load/refresh
    // This ensures VERSION_READY from the first check cycle is ignored
    sessionStorage.removeItem(UpdateService.SESSION_KEY);

    // Clear any stale previousVersion on fresh page load
    // If user reloaded the page, they already have the new code - no update dialog needed
    this.changeLogService.clearPreviousVersion();

    // Listen for Angular Service Worker version events (only if SwUpdate is available)
    // istanbul ignore next - SwUpdate observable subscription requires real service worker context
    if (this.updates) {
      this.updates.versionUpdates
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => this.handleSwEvent(event));
    }

    // Run immediate and interval-based update checks
    interval(UPDATE_CONFIG.CHECK_INTERVAL_MS)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
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
    if (isTauri()) return;
    // istanbul ignore next - SSR guard, SwUpdate is null during server rendering
    if (!this.updates) return;
    // istanbul ignore next - isEnabled is always true when SwUpdate is injected in tests
    if (!this.updates.isEnabled) return;
    if (this.checkInProgress) return;

    // Capture current version BEFORE checking for updates
    // This prevents race condition where VERSION_READY fires before checkForUpdate() resolves
    this.changeLogService.capturePreviousVersion();

    this.checkInProgress = true;

    // Race between checkForUpdate and timeout to prevent indefinite hangs
    const checkPromise = this.updates.checkForUpdate();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Update check timed out')), UPDATE_CONFIG.CHECK_TIMEOUT_MS);
    });

    Promise.race([checkPromise, timeoutPromise]).then(available => {
      this.checkInProgress = false;
      if (available) {
        // istanbul ignore next - activateUpdate rarely fails, requires corrupted SW state
        this.updates!.activateUpdate().then(async (activated) => {
          sessionStorage.setItem(UpdateService.SESSION_KEY, 'true');
          if (activated) {
            this.logService.log('SW: Update activated. Awaiting VERSION_READY...');
            // VERSION_READY event will trigger the dialog
          } else {
            // activateUpdate returned false - SW state is inconsistent
            // checkForUpdate said update exists, but activateUpdate couldn't apply it
            // Show dialog to let user reload and get the new version
            await this.changeLogService.refresh();
            const confirmed = await this.updateDialogService.show();
            if (confirmed) {
              this.reloadPage();
            }
          }
        }).catch(err => {
          console.error('SW: activateUpdate() failed:', err);
          sessionStorage.setItem(UpdateService.SESSION_KEY, 'true');
        });
      } else {
        this.logService.log('SW: No update available.');
        // Clear captured version since no update was found
        this.changeLogService.clearPreviousVersion();
        // Mark first check complete - subsequent checks can show dialogs
        sessionStorage.setItem(UpdateService.SESSION_KEY, 'true');
      }
    }).catch(err => {
      this.checkInProgress = false;
      console.error('SW: checkForUpdate() failed:', err);
      // Clear captured version on error/timeout
      this.changeLogService.clearPreviousVersion();
      sessionStorage.setItem(UpdateService.SESSION_KEY, 'true');
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
    switch (event.type) {
      case 'VERSION_READY': {
        const firstCheckComplete = sessionStorage.getItem(UpdateService.SESSION_KEY) === 'true';
        // istanbul ignore next - guards against rapid duplicate VERSION_READY events
        if (this.confirming) return;

        // Set confirming immediately to prevent race conditions with duplicate events
        this.confirming = true;

        // Skip if first check cycle hasn't completed yet
        // This means we're on a fresh page load and the update was already applied
        if (!firstCheckComplete) {
          this.logService.log('SW: Fresh page load, skipping update dialog');
          this.confirming = false;
          return;
        }

        // Skip dialog if previousVersion wasn't captured
        if (!this.changeLogService.previousVersion()) {
          this.logService.log('SW: No previous version captured, skipping dialog');
          this.confirming = false;
          return;
        }

        // Refresh changelog to get canonical new version from API
        // This ensures appDiff reflects the actual new version, not cached data
        await this.changeLogService.refresh();

        // Show update dialog
        const confirmed = await this.updateDialogService.show();

        this.confirming = false;
        if (confirmed) {
          this.reloadPage();
        }
        break;
      }
      // istanbul ignore next - VERSION_DETECTED is only logged, not tested
      case 'VERSION_DETECTED':
        this.logService.log('SW: New version detected:', event.version);
        break;
      // VERSION_INSTALLATION_FAILED - cache full, network error, or hash mismatch
      case 'VERSION_INSTALLATION_FAILED':
        console.error('SW: VERSION_INSTALLATION_FAILED:', event);
        // If cache is full, clear it and prompt user to reload
        if (event.error?.includes('Operation too large') || event.error?.includes('QuotaExceeded')) {
          this.clearCachesAndPromptReload();
        }
        break;
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
   * Clear all service worker caches and prompt user to reload.
   * Used when cache quota is exceeded and update installation fails.
   */
  // istanbul ignore next - cache API, integration test scope
  private async clearCachesAndPromptReload(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));

      // Unregister the service worker to force a clean reinstall
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));

      // Show dialog and reload
      await this.changeLogService.refresh();
      const confirmed = await this.updateDialogService.show();
      if (confirmed) {
        this.reloadPage();
      }
    } catch (err) {
      console.error('SW: Failed to clear caches:', err);
      // Still try to reload
      this.reloadPage();
    }
  }

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

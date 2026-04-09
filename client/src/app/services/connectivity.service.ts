import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LogService } from './log.service';
import { CONNECTIVITY_CONFIG } from '@app/constants/service.constants';

/**
 * Service for tracking online/offline connectivity status.
 *
 * Exposed signals:
 * - `isOnline`: readonly signal, true if last ping succeeded (immediate source-of-truth)
 * - `osOnline`: readonly signal, true if browser reports navigator.onLine
 * - `showOffline`: readonly signal, true if offline banner should be displayed (UI only)
 * - `lastVerifiedOnline`: readonly signal, timestamp of last successful ping
 *
 * Public methods:
 * - `stop()`: stops all timers and polling; useful in tests.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly logService = inject(LogService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _isOnline = signal<boolean>(this.isBrowser ? navigator.onLine : true);
  isOnline = this._isOnline.asReadonly();

  private readonly _osOnline = signal<boolean>(this.isBrowser ? navigator.onLine : true);
  osOnline = this._osOnline.asReadonly();

  private readonly _showOffline = signal<boolean>(false);
  showOffline = this._showOffline.asReadonly();

  private readonly _lastVerifiedOnline = signal<Date | undefined>(undefined);
  lastVerifiedOnline = this._lastVerifiedOnline.asReadonly();

  private stopped = false;
  private lastLoggedOnline?: boolean;

  private readonly pingUrl: string;
  private readonly baseInterval = CONNECTIVITY_CONFIG.BASE_INTERVAL_MS;
  private currentInterval: number = this.baseInterval;
  private readonly maxInterval = CONNECTIVITY_CONFIG.MAX_INTERVAL_MS;
  private readonly gracePeriod = CONNECTIVITY_CONFIG.GRACE_PERIOD_MS;

  private pollingTimer?: ReturnType<typeof setTimeout>;
  private offlineTimer?: ReturnType<typeof setTimeout>;
  private verifyAbortController?: AbortController;

  constructor() {
    // SSR: skip all browser-specific initialization
    if (!this.isBrowser) {
      this.pingUrl = '';
      return;
    }

    this.pingUrl = globalThis.location.origin + '/api/health';

    window.addEventListener('online', () => {
      this._osOnline.set(true);
      this.logService.log('🔵 OS reports online — verifying...');
      this.verify();
    });

    window.addEventListener('offline', () => {
      this._osOnline.set(false);
      this.logService.log('🔴 OS reports offline');
      this._isOnline.set(false);         // logical offline immediately
      this.scheduleOfflineBanner();      // banner delayed
    });

    this.scheduleNextCheck();
  }

  /**
   * Starts connectivity monitoring by immediately verifying network status.
   * Triggers an initial connectivity check and updates all signals accordingly.
   */
  async start(): Promise<void> {
    // istanbul ignore next - SSR branch
    if (!this.isBrowser) return;
    await this.verify();
  }

  /**
   * Stop all timers and polling.
   * Cleans up resources and cancels pending requests.
   * Useful in tests and when service is no longer needed.
   */
  stop() {
    this.stopped = true;

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = undefined;
    }
    if (this.offlineTimer) {
      clearTimeout(this.offlineTimer);
      this.offlineTimer = undefined;
    }
    if (this.verifyAbortController) {
      this.verifyAbortController.abort();
      this.verifyAbortController = undefined;
    }
  }

  /**
   * Schedules the next connectivity check using the current polling interval.
   * Uses exponential backoff when offline (doubles interval up to maxInterval of 60s).
   * Resets to baseInterval (10s) when connection is restored.
   */
  private scheduleNextCheck() {
    if (this.stopped) return;

    this.pollingTimer = setTimeout(async () => {
      await this.verify();
      this.scheduleNextCheck();
    }, this.currentInterval);
  }

  /**
   * Perform health check to verify app connectivity.
   * Hits /api/health with cache-busting to verify the server is up and responsive.
   * Updates isOnline signal and manages offline banner display.
   */
  private async verify() {
    if (!this.stopped) {
      this.verifyAbortController = new AbortController();
      const { signal } = this.verifyAbortController;

      try {
        const res = await fetch(`${this.pingUrl}?ts=${Date.now()}`, {
          cache: 'no-store',
          signal,
          headers: { 'ngsw-bypass': 'true' },  // Skip service worker cache
        });

        if (res.ok) {
          this._isOnline.set(true);
          this._lastVerifiedOnline.set(new Date());
          this.currentInterval = this.baseInterval;
          this.clearOfflineBanner();

          if (this.lastLoggedOnline !== true) {
            this.logService.log(`✅ Verified online at ${new Date().toLocaleTimeString()}`);
            this.lastLoggedOnline = true;
          }
        } else {
          this._isOnline.set(false);
          this.currentInterval = Math.min(this.currentInterval * 2, this.maxInterval);
          this.scheduleOfflineBanner();

          if (this.lastLoggedOnline !== false) {
            this.logService.log(`⚠️ Health check failed (${res.status}) — treating as offline`);
            this.lastLoggedOnline = false;
          }
        }
      } catch {
        if (!this.stopped) {
          this._isOnline.set(false);
          this.currentInterval = Math.min(this.currentInterval * 2, this.maxInterval);
          this.scheduleOfflineBanner();

          if (this.lastLoggedOnline !== false) {
            this.logService.log('⚠️ Health check error — treating as offline');
            this.lastLoggedOnline = false;
          }
        }
      } finally {
        this.verifyAbortController = undefined;
      }
    }
  }

  /**
   * Show offline banner after grace period.
   * Delays banner display to avoid flashing during brief disconnections.
   */
  private scheduleOfflineBanner() {
    if (!this.offlineTimer) {
      this.offlineTimer = setTimeout(() => {
        this._showOffline.set(true);
        this.logService.log('📴 Offline banner shown');
        this.offlineTimer = undefined;
      }, this.gracePeriod);
    }
  }

  /**
   * Hide offline banner if shown.
   * Cancels scheduled banner display and hides banner if currently visible.
   */
  private clearOfflineBanner() {
    if (this.offlineTimer) {
      clearTimeout(this.offlineTimer);
      this.offlineTimer = undefined;
    }
    if (this._showOffline()) {
      this.logService.log('🔵 Connectivity restored — hiding offline banner');
    }
    this._showOffline.set(false);
  }
}

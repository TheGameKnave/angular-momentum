import { Injectable, signal } from '@angular/core';
import { LogService } from './log.service';

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
  private readonly _isOnline = signal<boolean>(false);
  isOnline = this._isOnline.asReadonly();

  private readonly _osOnline = signal<boolean>(navigator.onLine);
  osOnline = this._osOnline.asReadonly();

  private readonly _showOffline = signal<boolean>(false);
  showOffline = this._showOffline.asReadonly();

  private readonly _lastVerifiedOnline = signal<Date | undefined>(undefined);
  lastVerifiedOnline = this._lastVerifiedOnline.asReadonly();

  private stopped = false;
  private lastLoggedOnline?: boolean;

  // private readonly pingUrl = 'https://angularmomentum.app/favicon.ico';
  private readonly pingUrl = window.location.origin + '/favicon.ico';
  private readonly baseInterval = 10000;
  private currentInterval = this.baseInterval;
  private readonly maxInterval = 60000;
  private readonly gracePeriod = 2000;

  private pollingTimer?: ReturnType<typeof setTimeout>;
  private offlineTimer?: ReturnType<typeof setTimeout>;
  private verifyAbortController?: AbortController;

  constructor(private readonly logService: LogService) {
    window.addEventListener('online', () => {
      this._osOnline.set(true);
      console.log('🔵 OS reports online — verifying...');
      this.verify();
    });

    window.addEventListener('offline', () => {
      this._osOnline.set(false);
      console.log('🔴 OS reports offline');
      this._isOnline.set(false);         // logical offline immediately
      this.scheduleOfflineBanner();      // banner delayed
    });

    this.scheduleNextCheck();
  }

  /** Start initial verification */
  async start(): Promise<void> {
    await this.verify();
  }

  /** Stops all timers and polling */
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

  /** Schedule the next connectivity check */
  private scheduleNextCheck() {
    if (this.stopped) return;

    this.pollingTimer = setTimeout(async () => {
      await this.verify();
      this.scheduleNextCheck();
    }, this.currentInterval);
  }

  /** Perform ping to check connectivity */
  private async verify() {
    if (!this.stopped) {
      this.verifyAbortController = new AbortController();
      const { signal } = this.verifyAbortController;
  
      try {
        const res = await fetch(`${this.pingUrl}?ts=${Date.now()}`, {
          cache: 'no-store',
          signal,
        });
  
        const success = res.ok;
        this._isOnline.set(success);             // immediate source-of-truth update
  
        if (success) {
          this._lastVerifiedOnline.set(new Date());
          this.currentInterval = this.baseInterval;
          this.clearOfflineBanner();
  
          if (this.lastLoggedOnline !== true) {
            console.log(`✅ Verified online at ${new Date().toLocaleTimeString()}`);
            this.lastLoggedOnline = true;
          }
        } else {
          this._isOnline.set(false);             // logical offline
          this.currentInterval = Math.min(this.currentInterval * 2, this.maxInterval);
          this.scheduleOfflineBanner();
  
          if (this.lastLoggedOnline !== false) {
            console.log('⚠️ Ping failed — treating as offline');
            this.lastLoggedOnline = false;
          }
        }
      } catch {
        if (!this.stopped) {
          this._isOnline.set(false);
          this.currentInterval = Math.min(this.currentInterval * 2, this.maxInterval);
          this.scheduleOfflineBanner();
  
          if (this.lastLoggedOnline !== false) {
            console.log('⚠️ Ping error — treating as offline');
            this.lastLoggedOnline = false;
          }
        }
      } finally {
        this.verifyAbortController = undefined;
      }
    }
  }

  /** Show offline banner after grace period */
  private scheduleOfflineBanner() {
    if (!this.offlineTimer) {
      this.offlineTimer = setTimeout(() => {
        this._showOffline.set(true);
        this.logService.log(this.constructor.name, '📴 Offline banner shown');
        this.offlineTimer = undefined;
      }, this.gracePeriod);
    }
  }

  /** Hide offline banner if shown */
  private clearOfflineBanner() {
    if (this.offlineTimer) {
      clearTimeout(this.offlineTimer);
      this.offlineTimer = undefined;
    }
    if (this._showOffline()) {
      this.logService.log(this.constructor.name, '🔵 Connectivity restored — hiding offline banner');
    }
    this._showOffline.set(false);
  }
}

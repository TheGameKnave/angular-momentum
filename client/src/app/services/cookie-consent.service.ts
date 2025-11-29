import { Injectable, signal } from '@angular/core';
import { LogService } from './log.service';

export type CookieConsentStatus = 'pending' | 'accepted' | 'declined';

/**
 * Service to manage cookie consent state and load analytics scripts conditionally.
 *
 * GDPR requires explicit consent before loading non-essential cookies (analytics, marketing).
 */
@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  private readonly CONSENT_KEY = 'cookie_consent_status';
  private readonly GA_ID = 'G-NZS60CFH48';
  private readonly HOTJAR_ID = 5248028;
  private readonly HOTJAR_SV = 6;

  // Consent state (initialized after CONSENT_KEY is defined)
  readonly consentStatus = signal<CookieConsentStatus>(this.loadConsentStatus());

  constructor(
    private readonly logService: LogService,
  ) {
    logService.log('Service initialized');
    logService.log('Initial consent status:', this.consentStatus());
    logService.log('localStorage value:', localStorage.getItem(this.CONSENT_KEY));

    // If user previously accepted, load analytics
    if (this.consentStatus() === 'accepted') {
      this.loadAnalytics();
    }
  }

  /**
   * Load consent status from localStorage
   */
  private loadConsentStatus(): CookieConsentStatus {
    const stored = localStorage.getItem(this.CONSENT_KEY);
    return (stored as CookieConsentStatus) || 'pending';
  }

  /**
   * Accept cookies and load analytics scripts
   */
  acceptCookies(): void {
    this.logService.log('Accepting cookies');
    localStorage.setItem(this.CONSENT_KEY, 'accepted');
    this.logService.log('localStorage set to:', localStorage.getItem(this.CONSENT_KEY));
    this.consentStatus.set('accepted');
    this.logService.log('Signal set to:', this.consentStatus());
    this.loadAnalytics();
  }

  /**
   * Decline cookies
   */
  declineCookies(): void {
    localStorage.setItem(this.CONSENT_KEY, 'declined');
    this.consentStatus.set('declined');
  }

  /**
   * Reset consent (for testing or user preference change)
   */
  resetConsent(): void {
    localStorage.removeItem(this.CONSENT_KEY);
    this.consentStatus.set('pending');
  }

  /**
   * Load analytics scripts dynamically (only after consent)
   */
  private loadAnalytics(): void {
    // Skip if on localhost (Hotjar already does this check)
    if (globalThis.location.hostname === 'localhost') {
      this.logService.log('Skipping analytics on localhost');
      return;
    }

    // istanbul ignore next
    this.loadGoogleAnalytics();
    // istanbul ignore next
    this.loadHotjar();
  }

  /**
   * Load Google Analytics
   */
  // istanbul ignore next
  private loadGoogleAnalytics(): void {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA_ID}`;
    document.head.appendChild(gaScript);

    // istanbul ignore next
    gaScript.onload = () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      (globalThis as any).dataLayer = (globalThis as any).dataLayer || [];
      /**
       * Push data to Google Analytics dataLayer.
       * @param args - Arguments to push to dataLayer
       */
      function gtag(...args: (string | Date)[]) {
        (globalThis as any).dataLayer.push(args);
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
      gtag('js', new Date());
      gtag('config', this.GA_ID);
      this.logService.log('Google Analytics loaded');
    };
  }

  /**
   * Load Hotjar
   */
  // istanbul ignore next
  private loadHotjar(): void {
    /* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params */
    const win = globalThis as any;
    win.hj = win.hj || function () {
      win.hj.q = win.hj.q || [];
      win.hj.q.push(arguments);
    };
    win._hjSettings = { hjid: this.HOTJAR_ID, hjsv: this.HOTJAR_SV };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://static.hotjar.com/c/hotjar-${this.HOTJAR_ID}.js?sv=${this.HOTJAR_SV}`;
    document.head.appendChild(script);
    this.logService.log('Hotjar loaded');
    /* eslint-enable @typescript-eslint/no-explicit-any, prefer-rest-params */
  }
}

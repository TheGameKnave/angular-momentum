import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { CookieConsentService } from '@app/services/cookie-consent.service';
import { LogService } from '@app/services/log.service';

/**
 * Cookie consent banner component.
 *
 * Displays at bottom of screen when consent is pending.
 * Allows user to accept or decline analytics cookies (GA, Hotjar).
 */
@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [RouterLink, TranslocoDirective, ButtonModule],
  templateUrl: './cookie-banner.component.html',
})
export class CookieBannerComponent {
  private readonly cookieConsent = inject(CookieConsentService);
  private readonly logService = inject(LogService);

  // Reactively show banner when consent is pending
  readonly showBanner = computed(() => {
    const status = this.cookieConsent.consentStatus();
    const shouldShow = status === 'pending';
    this.logService.log(`Consent status:, ${status} | Show banner:, ${shouldShow}`);
    return shouldShow;
  });

  /**
   * Handle user accepting cookies.
   */
  onAccept(): void {
    this.cookieConsent.acceptCookies();
  }

  /**
   * Handle user declining cookies.
   */
  onDecline(): void {
    this.cookieConsent.declineCookies();
  }
}

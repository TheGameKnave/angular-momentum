import { ChangeDetectionStrategy, Component, inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MarkdownComponent } from 'ngx-markdown';
import { APP_METADATA } from '@app/constants/app.constants';
import { CookieConsentService } from '@app/services/cookie-consent.service';

/**
 * Privacy Policy page component.
 *
 * Displays a summary card with key privacy information and the full
 * privacy policy loaded from privacy.md file in markdown format.
 */
@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    CardModule,
    ButtonModule,
    MarkdownComponent,
  ],
})
export class PrivacyPolicyComponent {
  private readonly locale = inject(LOCALE_ID);
  protected readonly cookieConsentService = inject(CookieConsentService);

  readonly privacyPolicyUrl = '/assets/docs/privacy.md';
  readonly companyName = APP_METADATA.companyName;
  readonly privacyUpdatedDate = formatDate(APP_METADATA.privacyUpdatedDate, 'mediumDate', this.locale);

  /**
   * Accept analytics cookies.
   */
  onAcceptCookies(): void {
    this.cookieConsentService.acceptCookies();
  }

  /**
   * Decline analytics cookies.
   */
  onDeclineCookies(): void {
    this.cookieConsentService.declineCookies();
  }
}

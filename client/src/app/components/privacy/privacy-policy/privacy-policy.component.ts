import { ChangeDetectionStrategy, Component, inject, LOCALE_ID, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MarkdownComponent } from 'ngx-markdown';
import { APP_METADATA } from '@app/constants/app.constants';
import { CookieConsentService } from '@app/services/cookie-consent.service';
import { SeoService } from '@app/services/seo.service';

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
export class PrivacyPolicyComponent implements OnInit {
  private readonly locale = inject(LOCALE_ID);
  protected readonly cookieConsentService = inject(CookieConsentService);
  private readonly seoService = inject(SeoService);

  readonly privacyPolicyUrl = '/assets/docs/privacy.md';
  readonly companyName = APP_METADATA.companyName;
  readonly privacyUpdatedDate = formatDate(APP_METADATA.privacyUpdatedDate, 'mediumDate', this.locale);

  /**
   * Initializes the component by setting SEO meta tags for the privacy policy page.
   */
  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Privacy Policy - Angular Momentum',
      description: 'Privacy policy for Angular Momentum. Learn how we collect, use, and protect your data.',
      type: 'article',
    });
  }

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

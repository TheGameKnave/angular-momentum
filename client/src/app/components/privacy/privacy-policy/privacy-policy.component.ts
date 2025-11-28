import { ChangeDetectionStrategy, Component, inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { CardModule } from 'primeng/card';
import { MarkdownComponent } from 'ngx-markdown';
import { APP_METADATA } from '@app/constants/app.constants';

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
    MarkdownComponent,
  ],
})
export class PrivacyPolicyComponent {
  private readonly locale = inject(LOCALE_ID);

  readonly privacyPolicyUrl = '/assets/docs/privacy.md';
  readonly companyName = APP_METADATA.companyName;
  readonly privacyUpdatedDate = formatDate(APP_METADATA.privacyUpdatedDate, 'mediumDate', this.locale);
}

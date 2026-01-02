
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';
import { CardModule } from 'primeng/card';
import { map, combineLatest } from 'rxjs';
import { SeoService } from '@app/services/seo.service';

/**
 * Index component that displays the main landing page with project information.
 *
 * This component combines multiple translated text strings to create a comprehensive
 * introduction to the Angular Momentum project, rendered as markdown content.
 */
@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MarkdownModule,
    CardModule,
    TranslocoDirective,
  ],
})
export class IndexComponent implements OnInit {
  readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seoService = inject(SeoService);

  indexText = signal<string>('');

  /**
   * Angular lifecycle hook called after component initialization.
   * Combines multiple translated text strings to create the landing page content
   * and displays them as markdown by setting the combined text to a signal.
   */
  ngOnInit() {
    // Set SEO meta tags for the home page
    this.seoService.updateTags({
      title: 'Angular Momentum',
      description: 'A modern Angular starter kit with authentication, i18n, GraphQL, IndexedDB, notifications, and more. Rapidly build production-ready Angular applications.',
      type: 'website',
    });

    combineLatest([
      this.transloco.selectTranslate('page.This project is designed to rapidly spin up Angular applications within a monorepo with minimal configuration…'),
      this.transloco.selectTranslate('page.If you find this project helpful and want to see it grow, consider supporting its development…')
    ]).pipe(
      map(([line1, line2]) => `${line1}\n\n${line2}`),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => this.indexText.set(value));
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';
import { CardModule } from 'primeng/card';
import { map, combineLatest } from 'rxjs';

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
    CommonModule,
    MarkdownModule,
    CardModule,
    TranslocoDirective,
  ],
})
export class IndexComponent implements OnInit {
  indexText = signal<string>('');

  constructor(
    readonly transloco: TranslocoService,
    private readonly destroyRef: DestroyRef,
  ){}

  /**
   * Angular lifecycle hook called after component initialization.
   * Combines multiple translated text strings to create the landing page content
   * and displays them as markdown by setting the combined text to a signal.
   */
  ngOnInit() {
    combineLatest([
      this.transloco.selectTranslate('This project is designed to rapidly spin up Angular applications...'),
      this.transloco.selectTranslate('If you find this project helpful and want to see it grow, consider...')
    ]).pipe(
      map(([line1, line2]) => `${line1}\n\n${line2}`),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => this.indexText.set(value));
  }
}

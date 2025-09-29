import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';
import { CardModule } from 'primeng/card';
import { map, combineLatest } from 'rxjs';

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

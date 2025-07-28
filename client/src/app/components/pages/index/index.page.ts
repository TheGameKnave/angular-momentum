import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-index',
  templateUrl: './index.page.html',
  standalone: true,
  imports: [CommonModule, MarkdownModule],
})
export class IndexPage {
  private activatedRoute = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);

  // Signals
  readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  readonly folder = this.activatedRoute.snapshot.paramMap.get('id')!;

  readonly data = computed(() => {
    // Trigger recompute when language changes
    this.lang();

    return `# ${this.transloco.translate('Angular Momentum')}

${this.transloco.translate('This project is designed to rapidly spin up Angular applications...')}

${this.transloco.translate('If you find this project helpful and want to see it grow, consider...')}`;
  });
}

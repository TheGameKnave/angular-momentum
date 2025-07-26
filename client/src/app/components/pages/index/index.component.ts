import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';
import { first, Subscription } from 'rxjs';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  imports: [
    CommonModule,
    MarkdownModule,
  ],
})
export class IndexComponent implements OnInit {
  destroyRef = inject(DestroyRef);
  folder!: string;
  activatedRoute = inject(ActivatedRoute);
  transloco = inject(TranslocoService);
  langChangeSubscription$!: Subscription;

  data!: string;

  ngOnInit() {
    // Initialize data
    this.setData();

    // Subscribe to language changes
    this.langChangeSubscription$ = this.transloco.langChanges$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.setData(); // Re-evaluate data on language change
    });

    // Set folder from route params
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
  }

  private setData() {
    this.transloco.selectTranslate('Angular Momentum').pipe(first()).subscribe(() => {
      this.data = `# ${this.transloco.translate('Angular Momentum')}

${this.transloco.translate('This project is designed to rapidly spin up Angular applications...')}

${this.transloco.translate('If you find this project helpful and want to see it grow, consider...')}
      `;
    });
  }

}

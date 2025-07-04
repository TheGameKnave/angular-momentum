import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'src/app/helpers/unsub';

import {CardModule} from 'primeng/card';

@AutoUnsubscribe()
@Component({
  selector: 'app-index',
  templateUrl: './index.page.html',
  imports: [
    CommonModule,
    MarkdownModule,
    CardModule,
  ],
})
export class IndexPage implements OnInit, OnDestroy {
  folder!: string;
  activatedRoute = inject(ActivatedRoute);
  transloco = inject(TranslocoService);
  langChangeSubscription$!: Subscription;

  data!: string;

  constructor() {}

  ngOnInit() {
    // Initialize data
    this.setData();

    // Subscribe to language changes
    this.langChangeSubscription$ = this.transloco.langChanges$.subscribe(() => {
      this.setData(); // Re-evaluate data on language change
    });

    // Set folder from route params
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
  }

  private setData() {
    this.transloco.selectTranslate('Angular Momentum').subscribe(translation => {
      this.data = `# ${this.transloco.translate('Angular Momentum')}

${this.transloco.translate('This project is designed to rapidly spin up Angular applications...')}

${this.transloco.translate('If you find this project helpful and want to see it grow, consider...')}
      `;
    });
  }

  ngOnDestroy() {}

}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { InstallersService } from '@app/services/installers.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-installers',
  imports: [
    CardModule,
    MarkdownModule,
    TranslocoDirective,
  ],
  templateUrl: './installers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstallersComponent {

  constructor(
    protected readonly installersService: InstallersService,
  ) {}

}

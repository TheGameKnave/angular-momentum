import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ConnectivityService } from '@app/services/connectivity.service';
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
export class InstallersComponent implements OnInit {

  constructor(
    protected readonly installersService: InstallersService,
    protected readonly connectivity: ConnectivityService,
  ) {}

  ngOnInit(): void {
    this.connectivity.start();
  }

}

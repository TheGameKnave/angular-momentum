import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Installer } from '@app/models/data.model';
import { ConnectivityService } from '@app/services/connectivity.service';
import { InstallersService } from '@app/services/installers.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { MarkdownModule } from 'ngx-markdown';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-installers',
  imports: [
    CardModule,
    PanelModule,
    ButtonModule,
    MarkdownModule,
    TranslocoDirective,
  ],
  templateUrl: './installers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstallersComponent implements OnInit {

  currentPlatform!: Installer;

  constructor(
    protected readonly installersService: InstallersService,
    protected readonly connectivity: ConnectivityService,
  ) {}

  ngOnInit(): void {
    this.connectivity.start();
    this.currentPlatform = this.installersService.getCurrentPlatformInstaller();
  }

}

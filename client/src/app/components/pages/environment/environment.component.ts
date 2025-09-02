import { ChangeDetectionStrategy, Component, isDevMode } from '@angular/core';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { SidebarComponent } from '@app/sidebar/sidebar.component';

@Component({
  selector: 'app-environment',
  templateUrl: './environment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    SidebarComponent,
  ],
})
export class EnvironmentComponent {
  isDevMode = isDevMode();

  constructor(
    private readonly featureMonitorService: FeatureMonitorService
  ){}
}

import { ChangeDetectionStrategy, Component, isDevMode } from '@angular/core';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-environment',
  templateUrl: './environment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
  ],
})
export class EnvironmentComponent {
  isDevMode = isDevMode();

  constructor(
    private readonly featureMonitorService: FeatureMonitorService
  ){}
}

import { ChangeDetectionStrategy, Component, isDevMode } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { AutoUnsubscribe } from '@app/helpers/unsub';

@AutoUnsubscribe()
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
}

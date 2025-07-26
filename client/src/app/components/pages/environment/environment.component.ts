import { Component, isDevMode } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-environment',
  imports: [
    TranslocoDirective,
  ],
  templateUrl: './environment.component.html',
})
export class EnvironmentComponent {
  isDevMode = isDevMode();
}

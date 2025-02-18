import { Component } from '@angular/core';

import { TranslocoDirective } from '@jsverse/transloco';
import packageJson from '../../../../../package.json';

@Component({
    selector: 'app-app-version',
    imports: [
        TranslocoDirective,
    ],
    templateUrl: './app-version.component.html',
    styles: ``
})
export class AppVersionComponent {
  public version: string = packageJson.version;
}

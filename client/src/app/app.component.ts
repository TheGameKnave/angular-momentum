import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { UpdateService } from '@app/services/update.service';

import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';

import packageJson from 'src/../package.json';

import { MenuLanguageComponent } from '@app/components/menus/menu-language/menu-language.component';
import { MenuFeatureComponent } from '@app/components/menus/menu-feature/menu-feature.component';
import { FeatureFlagService } from './services/feature-flag.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    MenuLanguageComponent,
    MenuFeatureComponent,
    TranslocoDirective,
  ],
})
export class AppComponent {
  openMenu = '';
  routePath = '';
  version: string = packageJson.version;
  menuTransitionOptions = '0.3s cubic-bezier(0, 0, 0.2, 1) transform';

  constructor(
    readonly updateService: UpdateService,
    protected translocoLoader: TranslocoHttpLoader,
    protected translate: TranslocoService,
    protected featureFlagService: FeatureFlagService,
  ){}

  toggleMenu(menu: string, event: Event): void {
    if (event.type === 'click' || (event.type === 'keydown' && event instanceof KeyboardEvent && event.key === 'Enter')) {
      this.openMenu = this.openMenu === menu ? '' : menu;
    }
  }
}

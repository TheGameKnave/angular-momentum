import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { UpdateService } from './services/update.service';
import { AutoUnsubscribe } from "src/app/helpers/unsub";

import { TranslocoDirective } from '@jsverse/transloco';

import { FeatureFlagService } from './services/feature-flag.service';
import packageJson from '../../../package.json';

import { MenuLanguageComponent } from './components/menus/menu-language/menu-language.component';
import { MenuFeatureComponent } from './components/menus/menu-feature/menu-feature.component';
import { SlugPipe } from './pipes/slug.pipe';
import { ComponentListService } from './services/component-list.service';

@AutoUnsubscribe() // we never destroy the root component but this is here for consistency
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    RouterModule,
    MenuLanguageComponent,
    MenuFeatureComponent,
    TranslocoDirective,
  ],
  providers: [
    SlugPipe,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  routePath: string = '';
  version: string = packageJson.version;
  menuTransitionOptions = '0.3s cubic-bezier(0, 0, 0.2, 1) transform';

  constructor(
    private updateService: UpdateService,
    protected featureFlagService: FeatureFlagService,
    private router: Router,
    private slugPipe: SlugPipe,
    private componentListService: ComponentListService,
  ){
    this.updateService.checkForUpdates();
  }

  async ngOnInit() {
    // long-form checking if navigated page is an allowed feature
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd){
        this.routePath = event.urlAfterRedirects.replace('/', '');
        const routeFeatureFlags: any = {};
        this.componentListService.getComponentList().forEach((component) => {
          const routePath = this.slugPipe.transform(component.name);
          const featureFlag = component.name;
          routeFeatureFlags[routePath] = featureFlag;
        });
        const featureFlag = routeFeatureFlags[this.routePath];
        if (featureFlag && !this.featureFlagService.getFeature(featureFlag)) {
          // navigate to a different page or display an error message
          this.router.navigate(['/']);
        }
      }
    });
  }

  ngOnDestroy(): void {}
}

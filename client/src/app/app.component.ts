import { ChangeDetectionStrategy, Component, DestroyRef, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { UpdateService } from '@app/services/update.service';

import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { FeatureFlagService } from '@app/services/feature-flag.service';
import packageJson from 'src/../package.json';

import { MenuLanguageComponent } from '@app/components/menus/menu-language/menu-language.component';
import { MenuFeatureComponent } from '@app/components/menus/menu-feature/menu-feature.component';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { ComponentListService } from '@app/services/component-list.service';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  providers: [
    SlugPipe,
  ],
})
export class AppComponent implements OnInit {
  openMenu = '';
  routePath = '';
  version: string = packageJson.version;
  menuTransitionOptions = '0.3s cubic-bezier(0, 0, 0.2, 1) transform';

  constructor(
    readonly updateService: UpdateService,
    protected featureFlagService: FeatureFlagService,
    readonly router: Router,
    readonly slugPipe: SlugPipe,
    readonly componentListService: ComponentListService,
    protected translocoLoader: TranslocoHttpLoader,
    protected translate: TranslocoService,
    readonly destroyRef: DestroyRef,
  ){
    this.updateService.checkForUpdates();
  }

  ngOnInit() {
    // long-form checking if navigated page is an allowed feature
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationEnd){
        this.routePath = event.urlAfterRedirects.replace('/', '');
        const routeFeatureFlags: Record<string, string> = {};
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
  toggleMenu(menu: string, event: Event): void {
    if (event.type === 'click' || (event.type === 'keydown' && event instanceof KeyboardEvent && event.key === 'Enter')) {
      this.openMenu = this.openMenu === menu ? '' : menu;
    }
  }
}

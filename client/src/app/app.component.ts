import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, isDevMode, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { UpdateService } from '@app/services/update.service';

import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';

import packageJson from 'src/../package.json';

import { MenuLanguageComponent } from '@app/components/menus/menu-language/menu-language.component';
import { MenuFeatureComponent } from '@app/components/menus/menu-feature/menu-feature.component';
import { FeatureFlagService } from './services/feature-flag.service';
import { SlugPipe } from './pipes/slug.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { COMPONENT_LIST } from './helpers/component-list';
import { SCREEN_SIZES } from './helpers/constants';
import { ConnectivityService } from './services/connectivity.service';
import { MenuChangeLogComponent } from './components/menus/menu-change-log/menu-change-log.component';
import { ChangeLogService } from './services/change-log.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    MenuLanguageComponent,
    MenuChangeLogComponent,
    MenuFeatureComponent,
    TranslocoDirective,
  ],
})
export class AppComponent implements OnInit {
  @HostListener('window:resize')
  onResize() {
    this.bodyClasses();
  }
  window = window;
  SCREEN_SIZES = SCREEN_SIZES;
  isDevMode = isDevMode();
  appDiff = this.changeLogService.appDiff;
  routePath = '';
  breadcrumb = '';
  version: string = packageJson.version;

  // Type-safe feature flag getters for template use
  // These will show compile errors if the feature name is invalid
  readonly showNotifications = () => this.featureFlagService.getFeature('Notifications');
  readonly showAppVersion = () => this.featureFlagService.getFeature('App Version');
  readonly showEnvironment = () => this.featureFlagService.getFeature('Environment');
  readonly showLanguage = () => this.featureFlagService.getFeature('Language');

  constructor(
    readonly updateService: UpdateService,
    readonly changeLogService: ChangeLogService,
    protected translocoLoader: TranslocoHttpLoader,
    protected translate: TranslocoService,
    protected featureFlagService: FeatureFlagService,
    private readonly slugPipe: SlugPipe,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
    protected readonly connectivity: ConnectivityService,
  ){}

  ngOnInit() {
    this.connectivity.start();
    // there might be a better way to detect the current component for the breadcrumbs...
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationEnd){
        this.routePath = event.urlAfterRedirects.replace('/', '').replace(/\//, '_') || 'index';
        COMPONENT_LIST.forEach((component) => {
          if(this.slugPipe.transform(component.name) === this.routePath){
            this.breadcrumb = component.name;
          }
        });
        this.bodyClasses();
      }
    });
  }

  bodyClasses(): void {
    // remove all classes from body
    document.body.className = 'app-dark screen-xs';
    if (this.routePath) document.body.classList.add(this.routePath);
    // set class of body to reflect screen sizes
    for (const size in SCREEN_SIZES) {
      if (window.innerWidth >= SCREEN_SIZES[size as keyof typeof SCREEN_SIZES]) {
        document.body.classList.add('screen-' + size);
        document.body.classList.remove('not-' + size);
      } else {
        document.body.classList.remove('screen-' + size);
        document.body.classList.add('not-' + size);
      }
    }
  }
}

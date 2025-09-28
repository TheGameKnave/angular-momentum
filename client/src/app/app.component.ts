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
import { ComponentListService } from './services/component-list.service';
import { SCREEN_SIZES } from './helpers/constants';

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
export class AppComponent implements OnInit {
  @HostListener('window:resize')
  onResize() {
    this.bodyClasses();
  }
  isDevMode = isDevMode();
  routePath = '';
  openMenu = '';
  breadcrumb = '';
  version: string = packageJson.version;
  menuTransitionOptions = '0.3s cubic-bezier(0, 0, 0.2, 1) transform';

  constructor(
    readonly updateService: UpdateService,
    protected translocoLoader: TranslocoHttpLoader,
    protected translate: TranslocoService,
    protected featureFlagService: FeatureFlagService,
    private readonly slugPipe: SlugPipe,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
    private readonly componentListService: ComponentListService,
  ){}

  ngOnInit() {
    // there might be a better way to detect the current component for the breadcrumbs...
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationEnd){
        this.openMenu = '';
        this.routePath = event.urlAfterRedirects.replace('/', '').replace(/\//, '_') || 'index';
        this.componentListService.getComponentList().forEach((component) => {
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
    document.body.className = 'app-dark';
    if (this.routePath) document.body.classList.add(this.routePath);
    //set class of body to 'mobile' for small screens
    if (window.innerWidth < SCREEN_SIZES.md) {
      document.body.classList.add('mobile');
    }
  }

  toggleMenu(menu: string, event: Event): void {
    if (event.type === 'click' || (event.type === 'keydown' && event instanceof KeyboardEvent && event.key === 'Enter')) {
      this.openMenu = this.openMenu === menu ? '' : menu;
    }
  }
}

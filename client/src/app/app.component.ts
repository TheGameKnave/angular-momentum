import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, isDevMode, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { UpdateService } from '@app/services/update.service';
import { UpdateDialogService } from '@app/services/update-dialog.service';
import { DataMigrationService } from '@app/services/data-migration.service';
import { UserSettingsService } from '@app/services/user-settings.service';
import { AuthService } from '@app/services/auth.service';
import { DialogConfirmComponent } from '@app/components/dialogs/dialog-confirm/dialog-confirm.component';

import { TranslocoDirective } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';

import packageJson from 'src/../package.json';

import { MenuLanguageComponent } from '@app/components/menus/menu-language/menu-language.component';
import { MenuFeatureComponent } from '@app/components/menus/menu-feature/menu-feature.component';
import { FeatureFlagService } from './services/feature-flag.service';
import { SlugPipe } from './pipes/slug.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { COMPONENT_LIST } from './helpers/component-list';
import { ConnectivityService } from './services/connectivity.service';
import { LogService } from './services/log.service';
import { MenuChangeLogComponent } from './components/menus/menu-change-log/menu-change-log.component';
import { ChangeLogService } from './services/change-log.service';
import { NotificationCenterComponent } from './components/menus/notification-center/notification-center.component';
import { MenuAuthComponent } from './components/menus/menu-auth/menu-auth.component';
import { CookieBannerComponent } from './components/privacy/cookie-banner/cookie-banner.component';
import { SCREEN_SIZES, TOOLTIP_CONFIG } from './constants/ui.constants';
import { ResourcePreloadService } from './services/resource-preload.service';
import { DeepLinkService } from './services/deep-link.service';
import { ScrollIndicatorDirective } from './directives/scroll-indicator.directive';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { DialogUpdateComponent } from './components/dialogs/dialog-update/dialog-update.component';

/**
 * Root component of the Angular Momentum application.
 *
 * This component serves as the main application shell, managing the layout structure,
 * navigation state, and global UI elements like menus and notification center.
 * It dynamically updates body CSS classes based on the current route and screen size,
 * enabling responsive design and route-specific styling.
 */
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
    NotificationCenterComponent,
    MenuAuthComponent,
    CookieBannerComponent,
    ScrollIndicatorDirective,
    TooltipModule,
    ToastModule,
    DialogConfirmComponent,
    DialogUpdateComponent,
  ],
})
export class AppComponent implements OnInit {
  readonly updateService = inject(UpdateService);
  readonly changeLogService = inject(ChangeLogService);
  private readonly updateDialogService = inject(UpdateDialogService);
  private readonly dataMigrationService = inject(DataMigrationService);
  private readonly userSettingsService = inject(UserSettingsService);
  private readonly authService = inject(AuthService);
  protected translocoLoader = inject(TranslocoHttpLoader);
  protected featureFlagService = inject(FeatureFlagService);
  private readonly slugPipe = inject(SlugPipe);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly connectivity = inject(ConnectivityService);
  private readonly logService = inject(LogService);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly resourcePreload = inject(ResourcePreloadService);
  private readonly deepLink = inject(DeepLinkService);

  constructor() {
    // Preload resources (flags, etc.) after first render to avoid blocking startup
    // istanbul ignore next - afterNextRender doesn't execute in unit tests
    afterNextRender(() => {
      this.resourcePreload.preloadAll();
      this.deepLink.initialize();

      // Run data migrations after view is ready (so p-toast is mounted)
      // This runs on all platforms: web, Tauri desktop, and mobile
      this.dataMigrationService.runMigrations().then(async () => {
        // Load local preferences after IndexedDB is initialized
        // This applies the user's theme immediately (before server sync)
        await this.userSettingsService.loadLocalPreferences();

        // If user is already authenticated (page refresh), sync with server
        // This resolves conflicts between local and server data using timestamps
        if (this.authService.isAuthenticated()) {
          this.userSettingsService.initialize();
        }
      });

      // Promote PrimeNG tooltips to browser's top-layer so they appear above CDK overlays
      this.setupTooltipPopoverObserver();
    });
  }

  /**
   * Sets up a MutationObserver to add popover="manual" to PrimeNG tooltips
   * and show them in the browser's top-layer. This ensures tooltips appear
   * above CDK overlay panels which use the popover API.
   */
  // istanbul ignore next: only called from afterNextRender which doesn't execute in unit tests
  private setupTooltipPopoverObserver(): void {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && node.classList.contains('p-tooltip')) {
            // Add popover attribute and show in top-layer
            node.setAttribute('popover', 'manual');
            node.showPopover();
          }
        }
      }
    });

    observer.observe(document.body, { childList: true });
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isBrowser) {
      this.isNarrowScreen.set(window.innerWidth < SCREEN_SIZES.md);
      this.isXsScreen.set(window.innerWidth < SCREEN_SIZES.sm);
      this.bodyClasses();
    }
  }

  /**
   * Dev-only keyboard shortcuts for testing dialogs.
   * Ctrl+Shift+U: Update dialog
   */
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.isDevMode || !event.ctrlKey || !event.shiftKey) return;

    if (event.key === 'U') {
      event.preventDefault();
      this.triggerDevUpdateDialog();
    }
  }

  /**
   * Triggers the update dialog for development testing.
   * Spoofs an older version to show changelog entries between versions.
   */
  private triggerDevUpdateDialog(): void {
    this.logService.log('[Dev] Triggering update dialog (Ctrl+Shift+U)...');

    // Spoof an older version to show all changelog entries
    // Set previousVersion first (simulates VERSION_DETECTED capturing it)
    this.changeLogService.previousVersion.set('0.0.0');
    this.changeLogService.devVersionOverride.set('0.0.0');

    this.updateDialogService.show().then(confirmed => {
      // istanbul ignore next - promise callback for dev tool, covered by triggering the dialog
      this.logService.log('[Dev] Update dialog result:', confirmed ? 'confirmed' : 'dismissed');
      this.changeLogService.devVersionOverride.set(null);
      this.changeLogService.clearPreviousVersion();
    });
  }

  // istanbul ignore next - SSR fallback branch can't be tested in browser context
  window: Window | undefined = globalThis.window;
  SCREEN_SIZES = SCREEN_SIZES;
  tooltipShowDelay = TOOLTIP_CONFIG.SHOW_DELAY;
  tooltipHideDelay = TOOLTIP_CONFIG.HIDE_DELAY;
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

  // Reactive signals for screen size (used in template for responsive footer labels)
  readonly isNarrowScreen = signal(globalThis.window !== undefined && globalThis.window.innerWidth < SCREEN_SIZES.md);
  readonly isXsScreen = signal(globalThis.window !== undefined && globalThis.window.innerWidth < SCREEN_SIZES.sm);

  /**
   * Angular lifecycle hook called after component initialization.
   * Starts the connectivity service and subscribes to router navigation events
   * to update the route path, breadcrumb, and body CSS classes based on the current route.
   */
  ngOnInit() {
    this.connectivity.start();

    // there might be a better way to detect the current component for the breadcrumbs...
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationEnd){
        this.routePath = event.urlAfterRedirects.replace('/', '').replace(/\//, '_') || 'index';
        this.breadcrumb = '';
        COMPONENT_LIST.forEach((component) => {
          if(this.slugPipe.transform(component.name) === this.routePath){
            this.breadcrumb = component.name;
          }
        });
        this.bodyClasses();

        // Scroll to top on navigation (Angular's scrollPositionRestoration targets window, not custom scroll containers)
        if (this.isBrowser) {
          const mainElement = document.querySelector('.main');
          if (mainElement) {
            mainElement.scrollTop = 0;
          }
        }
      }
    });
  }

  /**
   * Updates the body element's CSS classes based on the current route and screen size.
   * Applies responsive screen size classes and route-specific classes for targeted styling.
   * This method is called on initialization, route changes, and window resize events.
   * Note: Theme class is set on both html and body elements for CSS selector compatibility.
   */
  bodyClasses(): void {
    // istanbul ignore next - SSR fallback branch can't be tested in browser context
    if (!this.isBrowser) return;

    // Update screen size classes (don't reset - preserves classes set by index.html script)
    for (const size in SCREEN_SIZES) {
      if (window.innerWidth >= SCREEN_SIZES[size as keyof typeof SCREEN_SIZES]) {
        document.body.classList.add('screen-' + size);
        document.body.classList.remove('not-' + size);
      } else {
        document.body.classList.remove('screen-' + size);
        document.body.classList.add('not-' + size);
      }
    }
    // Ensure base class exists and mark viewport as determined (allows CSS to show menu with animation)
    document.body.classList.add('screen-xs', 'viewport-ready');

    // Update route class
    // Remove old route classes (preserve screen-*, not-*, viewport-ready, and theme classes)
    const routeClasses = Array.from(document.body.classList).filter(
      (c) => !c.startsWith('screen-') && !c.startsWith('not-') && c !== 'viewport-ready' && !c.startsWith('app-')
    );
    // istanbul ignore next - callback only runs when stale route classes exist
    routeClasses.forEach((c) => document.body.classList.remove(c));
    if (this.routePath) document.body.classList.add(this.routePath);
  }
}

import { ChangeDetectionStrategy, Component, HostListener, signal, ElementRef, AfterViewInit, DestroyRef, ViewChild, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { HelpersService } from '@app/services/helpers.service';
import { SCREEN_SIZES, TOOLTIP_CONFIG } from '@app/constants/ui.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TooltipModule } from 'primeng/tooltip';
import { ConnectivityService } from '@app/services/connectivity.service';

/**
 * Menu feature component that displays a horizontal navigation menu of enabled features.
 *
 * This component provides a responsive navigation menu that automatically scrolls to
 * center the active menu item. On mobile devices, it uses horizontal scrolling with
 * special handling for Chrome Mobile to prevent visual jumps. The menu dynamically
 * shows only features that are currently enabled based on feature flags.
 */
@Component({
  selector: 'app-menu-feature',
  templateUrl: './menu-feature.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SlugPipe,
    RouterModule,
    TranslocoDirective,
    TooltipModule,
  ],
})
export class MenuFeatureComponent implements OnInit, AfterViewInit {
  protected featureFlagService = inject(FeatureFlagService);
  protected readonly helpersService = inject(HelpersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef);
  protected readonly connectivity = inject(ConnectivityService);

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLElement>;

  /** Saved scroll position to prevent Android's scroll reset on navigation */
  private savedScrollLeft = 0;

  @HostListener('window:resize')
  onResize() {
    this.scrollToCenter();
    this.isMobile.set(window.innerWidth < SCREEN_SIZES.sm);
  }

  isMobile = signal(window.innerWidth < SCREEN_SIZES.sm);
  tooltipShowDelay = TOOLTIP_CONFIG.SHOW_DELAY;
  tooltipHideDelay = TOOLTIP_CONFIG.HIDE_DELAY;

  /**
   * Angular lifecycle hook called after component initialization.
   * Starts the connectivity service to begin monitoring server connection status.
   */
  ngOnInit() {
    this.connectivity.start();
  }

  /**
   * Angular lifecycle hook called after component's view has been fully initialized.
   * Performs initial scroll to center the active menu item and subscribes to router
   * navigation events to scroll to center the active item after each route change.
   */
  ngAfterViewInit() {
    // Initial scroll to active route
    this.scrollToCenter();

    // Save scroll position before navigation starts (prevents Android reset jump)
    this.router.events
      .pipe(
        filter(e => e.type === 0), // NavigationStart
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        const container = this.scrollArea?.nativeElement;
        if (container) {
          this.savedScrollLeft = container.scrollLeft;
        }
      });

    // Scroll to center after navigation completes
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.scrollToCenter());
  }

  /**
   * Detects if the current browser is Chrome on a mobile device.
   * @returns True if running on Chrome Mobile, false otherwise
   */
  isChromeMobile(): boolean {
    return /Chrome/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
  }

  /**
   * Smoothly scrolls the selected menu item into horizontal center view.
   * Uses a retry mechanism with requestAnimationFrame to ensure the DOM is ready.
   * On Android/Chrome Mobile, restores saved scroll position first to prevent the
   * browser's scroll reset, then animates to the target.
   * On other platforms, uses smooth scrolling behavior. On desktop, resets scroll to left.
   * Fully zoneless and Chrome-safe (no setTimeout).
   */
  scrollToCenter(): void {
    const container = this.scrollArea?.nativeElement;
    if (!container) return;

    let attempts = 0;
    const maxAttempts = 10;

    const tryScroll = () => {
      const activeLink = container.querySelector('.selected') as HTMLElement | null;
      if (!activeLink) {
        if (attempts++ < maxAttempts) requestAnimationFrame(tryScroll);
        else console.warn('MenuFeatureComponent: no .selected element found after multiple attempts.');
        return;
      }

      const targetScrollLeft = this.isMobile()
        ? activeLink.offsetLeft + activeLink.offsetWidth / 2 - container.clientWidth / 2
        : 0;

      if (this.isChromeMobile()) {
        // Android/Chrome Mobile: restore saved position immediately to prevent jump,
        // then animate to target position
        requestAnimationFrame(() => {
          container.scrollLeft = this.savedScrollLeft;
          requestAnimationFrame(() => {
            container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
          });
        });
      } else {
        // Normal smooth scroll for other platforms
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    };

    requestAnimationFrame(tryScroll);
  }

  /**
   * Determines whether to show tooltips for menu items.
   * @param always - If true, always shows tooltip regardless of device type
   * @returns True if tooltips should be shown (mobile or always parameter is true)
   */
  showTooltip(always = false): boolean {
    return this.isMobile() || always;
  }

  /**
   * Gets the count of enabled components.
   * @returns The number of components currently enabled via feature flags
   */
  componentCount(): number {
    return this.helpersService.enabledComponents().length;
  }
}

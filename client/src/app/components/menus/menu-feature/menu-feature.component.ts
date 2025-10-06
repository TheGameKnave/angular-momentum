import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
  ElementRef,
  AfterViewInit,
  DestroyRef,
  ViewChild,
  OnInit
} from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { ComponentListService } from '@app/services/component-list.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { HelpersService } from '@app/services/helpers.service';
import { SCREEN_SIZES } from '@app/helpers/constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TooltipModule } from 'primeng/tooltip';
import { ConnectivityService } from '@app/services/connectivity.service';

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
  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLElement>;

  @HostListener('window:resize')
  onResize() {
    this.scrollToCenter(false);
    this.isMobile.set(window.innerWidth < SCREEN_SIZES.sm);
  }

  isMobile = signal(window.innerWidth < SCREEN_SIZES.sm);

  constructor(
    readonly componentListService: ComponentListService,
    protected featureFlagService: FeatureFlagService,
    protected readonly helpersService: HelpersService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
    private readonly host: ElementRef,
    protected readonly connectivity: ConnectivityService,
  ) {}

  ngOnInit() {
    this.connectivity.start();
  }

  ngAfterViewInit() {
    // Initial scroll to active route
    this.scrollToCenter(false);

    // Scroll again after each navigation (e.g., route change)
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.scrollToCenter());
  }

  /**
   * Smoothly scrolls the selected menu item into horizontal center view.
   * Fully zoneless + Chrome-safe (no setTimeout).
   */
  scrollToCenter(smooth = true): void {
    const container = this.scrollArea?.nativeElement;
    if (!container) return;

    let attempts = 0;
    const maxAttempts = 10;

    const tryScroll = () => {
      const activeLink = container.querySelector('.selected') as HTMLElement | null;
      if (!activeLink) {
        if (attempts++ < maxAttempts) requestAnimationFrame(tryScroll);
        return;
      }

      const isMobile = this.isMobile();
      const targetScrollLeft = isMobile
        ? activeLink.offsetLeft + activeLink.offsetWidth / 2 - container.clientWidth / 2
        : 0;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          void container.getBoundingClientRect();
          container.scrollTo({
            left: targetScrollLeft,
            behavior: smooth ? 'smooth' : 'auto'
          });
        });
      });
    };

    requestAnimationFrame(tryScroll);
  }



  showTooltip(always = false): boolean {
    return this.isMobile() || always;
  }

  componentCount(): number {
    return this.helpersService.enabledComponents().length;
  }
}

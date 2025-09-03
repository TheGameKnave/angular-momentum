import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
  ElementRef,
  AfterViewInit,
  NgZone,
  DestroyRef
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
export class MenuFeatureComponent implements AfterViewInit {
  // Mouse hover for desktop
  @HostListener('mouseenter')
  onMouseEnter() {
    if (window.innerWidth >= SCREEN_SIZES.md) this.expanded.set(true);
  }
  @HostListener('mouseleave')
  onMouseLeave() {
    this.expanded.set(false);
  }
  @HostListener('click')
  onClick() {
    this.expanded.set(false);
  }
  @HostListener('window:resize')
  onResize() {
    if (!this.host.nativeElement) return;
    this.containerCenter = this.host.nativeElement.clientWidth / 2;
    // trigger template update in a cheaty way
    this.expanded.update(v => v);
  }
  expanded = signal(false);

  private containerCenter = 0;

  constructor(
    readonly componentListService: ComponentListService,
    protected featureFlagService: FeatureFlagService,
    protected readonly helpersService: HelpersService,
    private readonly router: Router,
    private readonly ngZone: NgZone,
    private readonly destroyRef: DestroyRef,
    private readonly host: ElementRef,
  ) {}

  ngAfterViewInit() {
    this.scrollToCenter();
    // Scroll to active route on mobile only
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.scrollToCenter();
      });
  }

  scrollToCenter(): void {
    if (window.innerWidth < SCREEN_SIZES.md) {
      this.ngZone.runOutsideAngular(() => {
        requestAnimationFrame(() => {
          const container = this.host.nativeElement;
          this.containerCenter = container.clientWidth / 2;
          const activeLink = container.querySelector('.selected') as HTMLElement;
          if (activeLink) {
            const offset = activeLink.offsetLeft + activeLink.offsetWidth / 2 - container.clientWidth / 2;
            container.scrollTo({ left: offset, behavior: 'smooth' });
          }
        });
      });
    }
  }
  showTooltip(always = false): boolean {
    const isMobile = window.innerWidth < SCREEN_SIZES.md;
    return isMobile || (this.expanded() && always);
  }

  componentCount(): number {
    return this.helpersService.enabledComponents().length;
  }

}

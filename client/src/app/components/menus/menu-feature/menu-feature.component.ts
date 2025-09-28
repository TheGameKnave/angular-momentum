import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
  ElementRef,
  AfterViewInit,
  DestroyRef,
  ViewChild
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
  @ViewChild('scrollArea') scrollArea?: ElementRef;
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
    this.scrollToCenter();
  }
  expanded = signal(false);

  constructor(
    readonly componentListService: ComponentListService,
    protected featureFlagService: FeatureFlagService,
    protected readonly helpersService: HelpersService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
    private readonly host: ElementRef,
  ) {}

  ngAfterViewInit() {
    // Scroll to active route on mobile only
    // once on load
    this.scrollToCenter();
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        // scroll on navigation
        this.scrollToCenter();
      });
  }

  scrollToCenter(): void {
    if (window.innerWidth >= SCREEN_SIZES.md) return;

    const container = this.scrollArea?.nativeElement;
    if (container){
      let attempts = 0;
      const maxAttempts = 10; // arbitrary limit
  
      const tryScroll = () => {
        const activeLink = container.querySelector('.selected') as HTMLElement;
        if (activeLink) {
          const offset = activeLink.offsetLeft + activeLink.offsetWidth / 2 - container.clientWidth / 2;
          container.scrollTo({ left: offset, behavior: 'smooth' });
        } else if (attempts++ < maxAttempts) {
          requestAnimationFrame(tryScroll);
        } else {
          console.warn('MenuFeatureComponent: no .selected element found after multiple attempts.');
        }
      };
  
      requestAnimationFrame(tryScroll);
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

import {
  Directive,
  ElementRef,
  OnInit,
  OnDestroy,
  effect,
  inject,
  input,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Directive that adds a visual timer indicator bar to any element.
 * The bar starts full and shrinks over the specified duration.
 *
 * Usage:
 *   <div [appTimerIndicator]="5">Content</div>  <!-- 5 second timer -->
 *   <button [appTimerIndicator]="10" timerPosition="top">Click me</button>
 *
 * Note: The host element's parent must have position: relative for proper positioning.
 */
@Directive({
  selector: '[appTimerIndicator]',
  standalone: true,
})
export class TimerIndicatorDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Duration in seconds for the timer. Set to 0 or negative to hide. */
  readonly appTimerIndicator = input<number>(0);

  /** Position of the indicator bar: 'top' or 'bottom' */
  readonly timerPosition = input<'top' | 'bottom'>('bottom');

  /** Height of the indicator bar in pixels */
  readonly timerHeight = input<number>(6);

  private indicatorElement: HTMLElement | null = null;
  private hostElement!: HTMLElement;

  constructor() {
    // React to input changes
    effect(() => this.updateIndicator());
  }

  /**
   * Initialize the directive and create the indicator element.
   */
  ngOnInit(): void {
    // istanbul ignore next - SSR guard
    if (!this.isBrowser) return;

    this.hostElement = this.el.nativeElement;
    this.createIndicator();
  }

  /**
   * Clean up the indicator element when the directive is destroyed.
   */
  ngOnDestroy(): void {
    this.removeIndicator();
  }

  /**
   * Create the indicator element.
   */
  private createIndicator(): void {
    this.indicatorElement = document.createElement('div');
    this.indicatorElement.className = 'timer-indicator';
    this.hostElement.appendChild(this.indicatorElement);
  }

  /**
   * Update indicator visibility and animation.
   */
  private updateIndicator(): void {
    if (!this.indicatorElement) return;

    const duration = this.appTimerIndicator();
    const position = this.timerPosition();
    const height = this.timerHeight();

    if (duration <= 0) {
      this.indicatorElement.style.display = 'none';
      return;
    }

    this.indicatorElement.style.display = 'block';
    this.indicatorElement.style.position = 'absolute';
    this.indicatorElement.style.left = 'auto';
    this.indicatorElement.style.right = '0';
    this.indicatorElement.style.width = '100%';
    this.indicatorElement.style.height = `${height}px`;

    // Position top or bottom
    if (position === 'top') {
      this.indicatorElement.style.top = '0';
      this.indicatorElement.style.bottom = 'auto';
    } else {
      this.indicatorElement.style.top = 'auto';
      this.indicatorElement.style.bottom = '0';
    }

    // Use CSS variables for theming, fallback to green gradient
    this.indicatorElement.style.background =
      'var(--timer-indicator-bg, linear-gradient(90deg, var(--progress-start, #22c55e), var(--progress-end, #16a34a)))';

    // Ensure indicator is above other content and doesn't interfere with clicks
    this.indicatorElement.style.zIndex = '1';
    this.indicatorElement.style.pointerEvents = 'none';

    // Reset and restart animation
    this.indicatorElement.style.animation = 'none';
    // Force reflow to restart animation
    this.indicatorElement.offsetWidth; // eslint-disable-line @typescript-eslint/no-unused-expressions
    this.indicatorElement.style.animation = `timer-indicator-shrink ${duration}s linear forwards`;
  }

  /**
   * Remove the indicator element.
   */
  private removeIndicator(): void {
    if (this.indicatorElement) {
      this.indicatorElement.remove();
      this.indicatorElement = null;
    }
  }
}

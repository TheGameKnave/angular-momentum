import {
  Directive,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Input,
  inject,
} from '@angular/core';

/**
 * Directive that adds a scroll indicator to scrollable elements.
 * Walks up the DOM to find the actual scrolling ancestor.
 * Indicator shows remaining scroll content, shrinking as you scroll down.
 * Indicator is placed inside the scroll ancestor for proper containment.
 */
@Directive({
  selector: '[appScrollIndicator]',
  standalone: true,
})
export class ScrollIndicatorDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);

  @Input() appScrollIndicator: 'vertical' | 'horizontal' | 'both' | '' = 'vertical';

  private hostElement!: HTMLElement;
  private scrollElement!: HTMLElement;
  private track: HTMLElement | null = null;
  private verticalIndicator: HTMLElement | null = null;
  private horizontalIndicator: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private scrollHandler: (() => void) | null = null;
  private rafId: number | null = null;
  private pollRafId: number | null = null;
  private destroyed = false;
  private initialized = false;

  // Cached dimensions to avoid forced layout during scroll
  private cachedScrollHeight = 0;
  private cachedClientHeight = 0;
  private cachedScrollWidth = 0;
  private cachedClientWidth = 0;

  /**
   * Angular lifecycle hook called after the view is initialized.
   * Stores the host element reference and begins polling for a scrollable ancestor.
   */
  ngAfterViewInit(): void {
    this.hostElement = this.el.nativeElement;
    this.pollForScrollableAncestor();
  }

  /**
   * Angular lifecycle hook called when the directive is destroyed.
   * Marks the directive as destroyed and performs cleanup.
   */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.cleanup();
  }

  /**
   * Poll using RAF until we find a scrollable ancestor.
   * Waits for element to be connected to DOM first (handles ng-template portals).
   * Never gives up - keeps watching for connection/reconnection forever.
   */
  private pollForScrollableAncestor(connectedAttempts = 0): void {
    if (this.destroyed || this.initialized) return;

    // Wait until element is actually in the DOM (not just in ng-template)
    // istanbul ignore next - portal scenarios can't be unit tested
    if (!this.hostElement.isConnected) {
      this.scheduleConnectionPoll(connectedAttempts);
      return;
    }

    // Element is connected - find scrollable ancestor
    const scrollEl = this.findScrollingAncestor();

    // Initialize if we found a scrollable element (or host itself is scrollable)
    if (scrollEl !== this.hostElement || this.isScrollable(scrollEl)) {
      this.scrollElement = scrollEl;
      this.createIndicator();
      this.setupListeners();
      this.updateDimensionCache();
      this.updateIndicator();
      this.initialized = true;
      return;
    }

    // Keep polling - CSS might not be applied yet
    this.scheduleContinuedPolling(connectedAttempts);
  }

  /**
   * Schedule connection polling with appropriate delay based on attempt count.
   * Extracted to reduce cognitive complexity of pollForScrollableAncestor.
   */
  // istanbul ignore next - portal scenarios can't be unit tested
  private scheduleConnectionPoll(connectedAttempts: number): void {
    // Keep waiting forever for connection, but throttle after a while
    const delay = this.getPollingDelay(connectedAttempts);
    if (delay === 0) {
      this.pollRafId = requestAnimationFrame(() => {
        this.pollForScrollableAncestor(connectedAttempts + 1);
      });
    } else {
      setTimeout(() => {
        if (!this.destroyed && !this.initialized) {
          this.pollForScrollableAncestor(connectedAttempts + 1);
        }
      }, delay);
    }
  }

  /**
   * Calculate polling delay based on attempt count.
   * Returns 0 for RAF (fast), or ms delay for throttled polling.
   */
  private getPollingDelay(attempts: number): number {
    if (attempts < 60) return 0;
    if (attempts < 300) return 100;
    return 500;
  }

  /**
   * Schedule continued polling when no scrollable ancestor found yet.
   * Extracted to reduce cognitive complexity of pollForScrollableAncestor.
   */
  // istanbul ignore next - continued polling only happens when no scrollable found
  private scheduleContinuedPolling(connectedAttempts: number): void {
    // Use RAF for first 120 attempts (~2 seconds), then throttle
    if (connectedAttempts < 120) {
      this.pollRafId = requestAnimationFrame(() => {
        this.pollForScrollableAncestor(connectedAttempts + 1);
      });
    } else {
      // Throttle but never give up - check every 200ms
      setTimeout(() => {
        if (!this.destroyed && !this.initialized) {
          this.pollForScrollableAncestor(connectedAttempts + 1);
        }
      }, 200);
    }
  }

  /**
   * Clean up all resources: cancel animations, remove listeners, and remove DOM elements.
   * Optionally starts watching for reconnection if not destroyed (portal reattach).
   */
  private cleanup(): void {
    this.initialized = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.pollRafId !== null) {
      cancelAnimationFrame(this.pollRafId);
      this.pollRafId = null;
    }
    if (this.scrollHandler && this.scrollElement) {
      this.scrollElement.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.track) {
      this.track.remove();
      this.track = null;
      this.verticalIndicator = null;
      this.horizontalIndicator = null;
    }

    // Start watching for reconnection (portal reattach)
    // istanbul ignore next - only called when cleanup happens without destroy
    if (!this.destroyed) {
      this.watchForReconnection();
    }
  }

  /**
   * Watch for host element to be reconnected to DOM (portal reattach).
   */
  // istanbul ignore next - portal reattach scenarios can't be unit tested
  private watchForReconnection(): void {
    if (this.destroyed) return;
    if (this.initialized) return;

    if (this.hostElement.isConnected) {
      // Small delay to let DOM settle after portal attach
      setTimeout(() => {
        if (!this.destroyed && !this.initialized) {
          this.pollForScrollableAncestor();
        }
      }, 16);
      return;
    }

    this.pollRafId = requestAnimationFrame(() => this.watchForReconnection());
  }

  /**
   * Check if element has scrollable overflow CSS (regardless of current content size).
   */
  private isScrollable(el: HTMLElement): boolean {
    const style = globalThis.getComputedStyle(el);
    const mode = this.appScrollIndicator || 'vertical';

    const isScrollableY = style.overflowY === 'auto' || style.overflowY === 'scroll';
    const isScrollableX = style.overflowX === 'auto' || style.overflowX === 'scroll';

    if (mode === 'vertical') return isScrollableY;
    if (mode === 'horizontal') return isScrollableX;
    if (mode === 'both') return isScrollableY || isScrollableX;
    // istanbul ignore next - default fallback for empty string mode
    return isScrollableY;
  }

  /**
   * Walk up DOM tree to find the nearest scrolling ancestor.
   * @returns The nearest scrollable ancestor element, or the host element as fallback.
   */
  private findScrollingAncestor(): HTMLElement {
    let el: HTMLElement | null = this.hostElement;

    while (el) {
      if (this.isScrollable(el)) {
        return el;
      }
      el = el.parentElement;
    }

    /* istanbul ignore next - fallback when no scrollable ancestor found */
    return this.hostElement;
  }

  /**
   * Create track and indicator(s) inside the scroll element.
   */
  private createIndicator(): void {
    // Force scroll element to have positioning context
    this.scrollElement.style.position = 'relative';

    this.track = document.createElement('div');
    this.track.className = 'scroll-indicator-track';

    const mode = this.appScrollIndicator || 'vertical';

    if (mode === 'vertical' || mode === 'both') {
      this.verticalIndicator = document.createElement('div');
      this.verticalIndicator.className = 'scroll-indicator-vertical';
      this.track.appendChild(this.verticalIndicator);
    }

    if (mode === 'horizontal' || mode === 'both') {
      this.horizontalIndicator = document.createElement('div');
      this.horizontalIndicator.className = 'scroll-indicator-horizontal';
      this.track.appendChild(this.horizontalIndicator);
    }

    this.scrollElement.appendChild(this.track);
  }

  /**
   * Set up scroll and resize listeners.
   */
  private setupListeners(): void {
    this.scrollHandler = () => {
      // Check if host element was removed from DOM (portal detached)
      // istanbul ignore next - portal disconnect can't be unit tested
      if (!this.hostElement.isConnected) {
        this.cleanup();
        return;
      }
      // Update synchronously to stay in sync with scroll rendering
      this.updateIndicator();
    };
    this.scrollElement.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(document.body);

    // Watch for host element being removed from DOM (portal detach)
    // istanbul ignore next - mutation observer callback for portal scenarios
    this.mutationObserver = new MutationObserver(() => {
      if (!this.hostElement.isConnected) {
        this.cleanup();
      }
    });
    // Watch the overlay container for child removals
    const overlayContainer = document.querySelector('.cdk-overlay-container');
    // istanbul ignore next - overlay container only exists in full app context
    if (overlayContainer) {
      this.mutationObserver.observe(overlayContainer, { childList: true, subtree: true });
    }
  }

  /**
   * Handle resize - re-find scrolling ancestor in case it changed.
   */
  private handleResize(): void {
    if (this.destroyed) return;

    // Check if host still connected
    // istanbul ignore if - portal disconnect can't be unit tested
    if (!this.hostElement.isConnected) {
      this.cleanup();
      return;
    }

    // If not initialized yet, try again
    if (!this.initialized) {
      this.pollForScrollableAncestor();
      return;
    }

    const newScrollElement = this.findScrollingAncestor();

    // istanbul ignore if - scroll element change is rare edge case
    if (newScrollElement !== this.scrollElement) {
      if (this.scrollHandler) {
        this.scrollElement.removeEventListener('scroll', this.scrollHandler);
      }

      if (this.track) {
        this.track.remove();
        newScrollElement.style.position = 'relative';
        newScrollElement.appendChild(this.track);
      }

      this.scrollElement = newScrollElement;

      if (this.scrollHandler) {
        this.scrollElement.addEventListener('scroll', this.scrollHandler, { passive: true });
      }
    }

    this.updateDimensionCache();
    this.scheduleUpdate();
  }

  /**
   * Schedule an indicator update on the next animation frame.
   * Deduplicates multiple calls to prevent redundant updates.
   */
  private scheduleUpdate(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.updateIndicator();
    });
  }

  /**
   * Update cached dimensions. Called on resize and initialization.
   */
  private updateDimensionCache(): void {
    if (!this.scrollElement) return;
    this.cachedScrollHeight = this.scrollElement.scrollHeight;
    this.cachedClientHeight = this.scrollElement.clientHeight;
    this.cachedScrollWidth = this.scrollElement.scrollWidth;
    this.cachedClientWidth = this.scrollElement.clientWidth;

    // Offset by scroll element's padding to position at bounding box edge
    const scrollStyle = globalThis.getComputedStyle(this.scrollElement);
    const offsetRight = Number.parseFloat(scrollStyle.paddingRight) || 0;
    const offsetBottom = Number.parseFloat(scrollStyle.paddingBottom) || 0;

    if (this.verticalIndicator) {
      this.verticalIndicator.style.setProperty('--si-offset-right', `${offsetRight}px`);
      this.verticalIndicator.style.setProperty('--si-offset-bottom', `${offsetBottom}px`);
    }
    if (this.horizontalIndicator) {
      this.horizontalIndicator.style.setProperty('--si-offset-right', `${offsetRight}px`);
      this.horizontalIndicator.style.setProperty('--si-offset-bottom', `${offsetBottom}px`);
    }
  }

  /**
   * Update indicator dimensions.
   * Sticky positioning handles keeping it at the bottom of viewport.
   */
  private updateIndicator(): void {
    if (this.destroyed) return;
    this.updateVerticalIndicator();
    this.updateHorizontalIndicator();
  }

  /**
   * Update vertical indicator size based on remaining scroll content.
   */
  private updateVerticalIndicator(): void {
    if (!this.verticalIndicator) return;

    const scrollTop = this.scrollElement.scrollTop;
    const scrollHeight = this.cachedScrollHeight;
    const clientHeight = this.cachedClientHeight;
    const scrollableDistance = scrollHeight - clientHeight;

    if (scrollableDistance <= 0) {
      this.verticalIndicator.style.opacity = '0';
      return;
    }

    const remainingContent = scrollableDistance - scrollTop;
    const indicatorHeight = (remainingContent / scrollHeight) * clientHeight;

    if (indicatorHeight < 2) {
      this.verticalIndicator.style.opacity = '0';
    } else {
      this.verticalIndicator.style.setProperty('--si-height', `${indicatorHeight}px`);
      this.verticalIndicator.style.opacity = '1';
    }
  }

  /**
   * Update horizontal indicator size based on remaining scroll content.
   */
  private updateHorizontalIndicator(): void {
    if (!this.horizontalIndicator) return;

    const scrollLeft = this.scrollElement.scrollLeft;
    const scrollWidth = this.cachedScrollWidth;
    const clientWidth = this.cachedClientWidth;
    const scrollableDistance = scrollWidth - clientWidth;

    if (scrollableDistance <= 0) {
      this.horizontalIndicator.style.opacity = '0';
      return;
    }

    const remainingContent = scrollableDistance - scrollLeft;
    const indicatorWidth = (remainingContent / scrollWidth) * clientWidth;

    if (indicatorWidth < 2) {
      this.horizontalIndicator.style.opacity = '0';
    } else {
      this.horizontalIndicator.style.setProperty('--si-width', `${indicatorWidth}px`);
      this.horizontalIndicator.style.opacity = '1';
    }
  }
}

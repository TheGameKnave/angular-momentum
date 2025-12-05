import {
  Directive,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Input,
  inject,
} from '@angular/core';

/**
 * Scroll state for header/footer updates.
 */
interface ScrollState {
  movingUp: boolean;
  movingDown: boolean;
  scrollingUp: boolean;
  scrollingDown: boolean;
}

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

  @Input() appScrollIndicator: 'vertical' | 'horizontal' | 'both' | '' = 'both';

  private hostElement!: HTMLElement;
  private scrollElement!: HTMLElement;
  private track: HTMLElement | null = null;
  private verticalIndicator: HTMLElement | null = null;
  private horizontalIndicator: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private contentObserver: MutationObserver | null = null;
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

  // Header/footer show/hide state
  private headerElement: HTMLElement | null = null;
  private footerElement: HTMLElement | null = null; // Used for indicator placement
  private headerHeight = 0;
  private lastScrollTop = 0;
  private lastDirectionChangeScrollTop = 0; // Track position where direction last changed
  private headerMagicVisible = false; // True when header shown via scroll-up magic
  private headerAnimating = false; // True during CSS transition, prevents interruption
  private readonly SCROLL_THRESHOLD = 10; // Min px to travel before triggering magic show/hide
  private readonly ANIMATION_DURATION = 200; // Match CSS transition duration
  private scrollEndTimeout: ReturnType<typeof setTimeout> | null = null;
  private animationTimeout: ReturnType<typeof setTimeout> | null = null;

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
      this.findHeaderFooter();
      this.createIndicator();
      this.setupListeners();
      this.updateDimensionCache();
      this.updateIndicator();
      this.initHeaderFooterState();
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
    if (this.contentObserver) {
      this.contentObserver.disconnect();
      this.contentObserver = null;
    }
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
      this.scrollEndTimeout = null;
    }
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
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
    const mode = this.appScrollIndicator || 'both';

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
   * Create a single sticky track with indicator(s) inside.
   * Track uses sticky positioning; indicators are absolutely positioned within.
   * Insert before footer if present to avoid creating a gap after footer.
   */
  private createIndicator(): void {
    const mode = this.appScrollIndicator || 'both';

    // Create single track to hold all indicators
    this.track = document.createElement('div');
    this.track.className = 'scroll-indicator-track';

    // Insert before footer if present, otherwise append
    if (this.footerElement) {
      this.scrollElement.insertBefore(this.track, this.footerElement);
    } else {
      this.scrollElement.appendChild(this.track);
    }

    // Vertical indicator
    if (mode === 'vertical' || mode === 'both') {
      this.verticalIndicator = document.createElement('div');
      this.verticalIndicator.className = 'scroll-indicator-vertical';
      this.track.appendChild(this.verticalIndicator);
    }

    // Horizontal indicator
    if (mode === 'horizontal' || mode === 'both') {
      this.horizontalIndicator = document.createElement('div');
      this.horizontalIndicator.className = 'scroll-indicator-horizontal';
      this.track.appendChild(this.horizontalIndicator);
    }
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
      this.updateHeaderFooter();

      // Schedule scroll-end check to correct header if it got left behind during fast scroll
      this.scheduleScrollEndCheck();
    };
    this.scrollElement.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(document.body);
    this.resizeObserver.observe(this.scrollElement);

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

    // Watch scroll element for content changes (e.g., route navigation)
    this.contentObserver = new MutationObserver(() => this.handleContentChange());
    this.contentObserver.observe(this.scrollElement, { childList: true, subtree: true });
  }

  /**
   * Handle content changes inside scroll element (e.g., navigation).
   */
  private handleContentChange(): void {
    if (this.destroyed) return;
    // Debounce with RAF to batch rapid mutations
    this.updateDimensionCache();
    this.scheduleUpdate();
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

      // Move track to new scroll element
      if (this.track) {
        this.track.remove();
        newScrollElement.appendChild(this.track);
      }

      this.scrollElement = newScrollElement;

      if (this.scrollHandler) {
        this.scrollElement.addEventListener('scroll', this.scrollHandler, { passive: true });
      }
    }

    this.updateDimensionCache();
    this.updateHeaderFooterDimensions();

    // Update header/footer transforms immediately with new dimensions
    this.updateHeaderFooter();
    this.scheduleUpdate();
  }

  /**
   * Update header/footer height cache after resize.
   * Only updates dimensions; does not reset scroll state or apply transforms.
   * The scroll handler will naturally update transforms on next scroll.
   */
  private updateHeaderFooterDimensions(): void {
    if (this.headerElement) {
      this.headerHeight = this.headerElement.offsetHeight;
    }
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
    if (!this.scrollElement || !this.track) return;
    this.cachedScrollHeight = this.scrollElement.scrollHeight;
    this.cachedClientHeight = this.scrollElement.clientHeight;
    this.cachedScrollWidth = this.scrollElement.scrollWidth;
    this.cachedClientWidth = this.scrollElement.clientWidth;

    // Set padding offset as CSS variable for indicator positioning
    const scrollStyle = globalThis.getComputedStyle(this.scrollElement);
    const paddingRight = Number.parseFloat(scrollStyle.paddingRight) || 0;
    const paddingBottom = Number.parseFloat(scrollStyle.paddingBottom) || 0;
    this.track.style.setProperty('--si-offset-right', `${paddingRight}px`);
    this.track.style.setProperty('--si-offset-bottom', `${paddingBottom}px`);
  }

  /**
   * Update indicator dimensions.
   * Track handles positioning via sticky; indicators sized via CSS variables.
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

  /**
   * Find header and footer elements within the scroll container.
   */
  private findHeaderFooter(): void {
    this.headerElement = this.scrollElement.querySelector('header');
    this.footerElement = this.scrollElement.querySelector('footer');

    if (this.headerElement) {
      this.headerHeight = this.headerElement.offsetHeight;
    }
  }

  /**
   * Initialize header/footer visibility state based on initial scroll position.
   */
  private initHeaderFooterState(): void {
    const scrollTop = this.scrollElement.scrollTop;
    this.lastScrollTop = scrollTop;
    this.lastDirectionChangeScrollTop = scrollTop;
    this.headerMagicVisible = false;

    // Apply initial transforms
    this.updateHeaderFooter();
  }

  /**
   * Update header/footer visibility based on scroll position.
   * Header: proportionally tracks near top, magic show/hide in middle (scroll direction)
   * Footer: tracks horizontal scroll position
   */
  private updateHeaderFooter(): void {
    const scrollTop = this.scrollElement.scrollTop;
    const maxScroll = this.cachedScrollHeight - this.cachedClientHeight;
    const clampedScrollTop = Math.max(0, Math.min(scrollTop, maxScroll));

    const scrollState = this.computeScrollState(scrollTop, maxScroll, clampedScrollTop);
    this.updateDirectionTracking(scrollState);

    if (this.headerElement) {
      this.updateHeaderForMagicVisible(clampedScrollTop, scrollState);
      this.updateHeaderForNonMagicVisible(clampedScrollTop, scrollState);
    }

    if (this.footerElement) {
      this.footerElement.style.left = `${this.scrollElement.scrollLeft}px`;
    }

    this.lastScrollTop = clampedScrollTop;
  }

  /**
   * Compute scroll direction and threshold state.
   */
  private computeScrollState(scrollTop: number, maxScroll: number, clampedScrollTop: number): ScrollState {
    const movingUp = clampedScrollTop < this.lastScrollTop;
    const movingDown = clampedScrollTop > this.lastScrollTop;

    const atTop = scrollTop <= 0;
    const atBottom = scrollTop >= maxScroll;
    const distanceSinceDirectionChange = Math.abs(clampedScrollTop - this.lastDirectionChangeScrollTop);
    const thresholdMet = distanceSinceDirectionChange >= this.SCROLL_THRESHOLD;

    return {
      movingUp,
      movingDown,
      scrollingUp: !atTop && !atBottom && movingUp && thresholdMet,
      scrollingDown: !atTop && !atBottom && movingDown && thresholdMet,
    };
  }

  /**
   * Update direction change tracking when scroll direction reverses.
   */
  private updateDirectionTracking(state: ScrollState): void {
    const directionReversedUp = state.movingUp && this.lastScrollTop > this.lastDirectionChangeScrollTop;
    const directionReversedDown = state.movingDown && this.lastScrollTop < this.lastDirectionChangeScrollTop;

    if (directionReversedUp || directionReversedDown) {
      this.lastDirectionChangeScrollTop = this.lastScrollTop;
    }
  }

  /**
   * Handle header when it's magic-visible.
   */
  private updateHeaderForMagicVisible(clampedScrollTop: number, state: ScrollState): void {
    if (!this.headerMagicVisible) return;

    if (state.scrollingDown) {
      this.hideMagicVisibleHeader();
    } else if (clampedScrollTop === 0) {
      this.transitionMagicToProportional();
    }
  }

  /**
   * Handle header when it's not magic-visible.
   */
  private updateHeaderForNonMagicVisible(clampedScrollTop: number, state: ScrollState): void {
    if (this.headerMagicVisible) return;

    if (clampedScrollTop <= this.headerHeight) {
      this.applyProportionalHeaderTransform(clampedScrollTop);
    } else if (state.scrollingUp && !this.headerAnimating) {
      this.showHeaderWithMagic();
    } else if (!this.headerAnimating) {
      this.enforceHeaderHidden();
    }
  }

  /**
   * Hide header that was magic-visible with animation.
   */
  private hideMagicVisibleHeader(): void {
    this.headerElement!.style.transition = '';
    this.headerElement!.style.transform = `translateY(-${this.headerHeight}px)`;
    this.headerMagicVisible = false;
    this.startHeaderAnimation();
  }

  /**
   * Transition from magic-visible to proportional mode when reaching top.
   */
  private transitionMagicToProportional(): void {
    this.headerMagicVisible = false;
    this.lastDirectionChangeScrollTop = 0;
  }

  /**
   * Apply proportional header transform in the near-top zone.
   */
  private applyProportionalHeaderTransform(clampedScrollTop: number): void {
    if (!this.headerAnimating) {
      this.headerElement!.style.transition = 'none';
      this.headerElement!.style.transform = `translateY(${-clampedScrollTop}px)`;
    }
    this.lastDirectionChangeScrollTop = clampedScrollTop;
  }

  /**
   * Show header with magic animation when scrolling up in middle zone.
   */
  private showHeaderWithMagic(): void {
    this.headerElement!.style.transition = '';
    this.headerElement!.style.transform = 'translateY(0)';
    this.headerMagicVisible = true;
    this.startHeaderAnimation();
  }

  /**
   * Enforce header hidden position (catches fast scrolling).
   */
  private enforceHeaderHidden(): void {
    this.headerElement!.style.transition = 'none';
    this.headerElement!.style.transform = `translateY(-${this.headerHeight}px)`;
  }

  /**
   * Schedule a check after scrolling stops to correct header position if needed.
   * Debounced - resets on each scroll event.
   */
  private scheduleScrollEndCheck(): void {
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
    }
    this.scrollEndTimeout = setTimeout(() => {
      this.correctHeaderPosition();
    }, 150);
  }

  /**
   * Start header animation timer to prevent interruption during CSS transition.
   */
  private startHeaderAnimation(): void {
    this.headerAnimating = true;
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    this.animationTimeout = setTimeout(() => {
      this.headerAnimating = false;
    }, this.ANIMATION_DURATION);
  }

  /**
   * Correct header position after fast scrolling leaves it in an intermediate state.
   * If header should be hidden but isn't fully hidden, animate it closed.
   */
  private correctHeaderPosition(): void {
    if (!this.headerElement) return;

    const scrollTop = this.scrollElement.scrollTop;
    const maxScroll = this.cachedScrollHeight - this.cachedClientHeight;
    const clampedScrollTop = Math.max(0, Math.min(scrollTop, maxScroll));

    // If we're past the header zone and header isn't magic-visible, ensure it's fully hidden
    if (clampedScrollTop > this.headerHeight && !this.headerMagicVisible) {
      this.headerElement.style.transition = '';
      this.headerElement.style.transform = `translateY(-${this.headerHeight}px)`;
    }
  }
}

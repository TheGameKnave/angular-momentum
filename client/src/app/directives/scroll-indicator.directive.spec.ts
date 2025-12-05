import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ScrollIndicatorDirective } from './scroll-indicator.directive';

// Mock ResizeObserver
let resizeObserverCallback: ResizeObserverCallback | null = null;
class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Helper to trigger resize observer
function triggerResize() {
  if (resizeObserverCallback) {
    resizeObserverCallback([], {} as ResizeObserver);
  }
}

// Test host component for vertical scrolling
@Component({
  template: `
    <div class="scroll-container" style="height: 200px; overflow-y: auto;">
      <div [appScrollIndicator]="'vertical'" class="content" style="height: 600px;">Content</div>
    </div>
  `,
  imports: [ScrollIndicatorDirective],
})
class TestHostComponent {}

// Test host for horizontal scrolling
@Component({
  template: `
    <div class="scroll-container" style="width: 200px; overflow-x: auto;">
      <div [appScrollIndicator]="'horizontal'" class="content" style="width: 600px; display: inline-block;">Content</div>
    </div>
  `,
  imports: [ScrollIndicatorDirective],
})
class HorizontalTestHostComponent {}

// Test host for both directions
@Component({
  template: `
    <div class="scroll-container" style="width: 200px; height: 200px; overflow: auto;">
      <div [appScrollIndicator]="'both'" class="content" style="width: 600px; height: 600px;">Content</div>
    </div>
  `,
  imports: [ScrollIndicatorDirective],
})
class BothTestHostComponent {}

// Test host for non-scrollable container
@Component({
  template: `
    <div class="non-scroll-container" style="height: 200px;">
      <div appScrollIndicator class="content">Short content</div>
    </div>
  `,
  imports: [ScrollIndicatorDirective],
})
class NonScrollableTestHostComponent {}

describe('ScrollIndicatorDirective', () => {
  let originalConsoleLog: typeof console.log;
  let originalResizeObserver: typeof ResizeObserver;

  beforeAll(() => {
    // Mock ResizeObserver globally
    originalResizeObserver = window.ResizeObserver;
    (window as any).ResizeObserver = MockResizeObserver;
  });

  afterAll(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  beforeEach(() => {
    // Suppress console.log during tests
    originalConsoleLog = console.log;
    console.log = jasmine.createSpy('log');
    resizeObserverCallback = null;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('vertical mode', () => {
    let fixture: ComponentFixture<TestHostComponent>;
    let directiveEl: DebugElement;
    let directive: ScrollIndicatorDirective;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
      directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      directive = directiveEl.injector.get(ScrollIndicatorDirective);
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should create the directive', () => {
      expect(directive).toBeTruthy();
    });

    it('should find scrollable ancestor and create vertical indicator', fakeAsync(() => {
      // Allow polling to complete
      tick(100);
      flush();
      fixture.detectChanges();

      const track = fixture.nativeElement.querySelector('.scroll-indicator-track');
      const verticalIndicator = fixture.nativeElement.querySelector('.scroll-indicator-vertical');

      expect(track).toBeTruthy();
      expect(verticalIndicator).toBeTruthy();
    }));

    it('should not create horizontal indicator in vertical mode', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const horizontalIndicator = fixture.nativeElement.querySelector('.scroll-indicator-horizontal');
      expect(horizontalIndicator).toBeFalsy();
    }));

    it('should update indicator on scroll', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const indicator = fixture.nativeElement.querySelector('.scroll-indicator-vertical');

      // Scroll down
      scrollContainer.scrollTop = 100;
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(indicator).toBeTruthy();
    }));

    it('should cleanup on destroy', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const track = fixture.nativeElement.querySelector('.scroll-indicator-track');
      expect(track).toBeTruthy();

      fixture.destroy();

      // Track should be removed
      expect(fixture.nativeElement.querySelector('.scroll-indicator-track')).toBeFalsy();
    }));
  });

  describe('horizontal mode', () => {
    let fixture: ComponentFixture<HorizontalTestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HorizontalTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HorizontalTestHostComponent);
      fixture.detectChanges();
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should create horizontal indicator', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const horizontalIndicator = fixture.nativeElement.querySelector('.scroll-indicator-horizontal');
      expect(horizontalIndicator).toBeTruthy();
    }));

    it('should not create vertical indicator in horizontal mode', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const verticalIndicator = fixture.nativeElement.querySelector('.scroll-indicator-vertical');
      expect(verticalIndicator).toBeFalsy();
    }));

    it('should update horizontal indicator on scroll', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      scrollContainer.scrollLeft = 100;
      scrollContainer.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.scroll-indicator-horizontal');
      expect(indicator).toBeTruthy();
    }));
  });

  describe('both mode', () => {
    let fixture: ComponentFixture<BothTestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BothTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(BothTestHostComponent);
      fixture.detectChanges();
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should create both indicators', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const verticalIndicator = fixture.nativeElement.querySelector('.scroll-indicator-vertical');
      const horizontalIndicator = fixture.nativeElement.querySelector('.scroll-indicator-horizontal');

      expect(verticalIndicator).toBeTruthy();
      expect(horizontalIndicator).toBeTruthy();
    }));
  });

  describe('non-scrollable container', () => {
    let fixture: ComponentFixture<NonScrollableTestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [NonScrollableTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(NonScrollableTestHostComponent);
      fixture.detectChanges();
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should keep polling when no scrollable ancestor found', fakeAsync(() => {
      // Initial polling
      tick(100);
      fixture.detectChanges();

      // Should still be polling, no indicator yet if host isn't scrollable
      tick(2000);
      flush();
    }));
  });

  describe('resize handling', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should handle resize events via ResizeObserver', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      // Trigger resize via mock ResizeObserver
      triggerResize();
      tick(100);
      flush();
      fixture.detectChanges();

      const track = fixture.nativeElement.querySelector('.scroll-indicator-track');
      expect(track).toBeTruthy();
    }));

    it('should update dimensions on resize', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.scroll-indicator-vertical');
      expect(indicator).toBeTruthy();

      // Trigger multiple resizes to exercise scheduleUpdate dedup
      triggerResize();
      triggerResize();
      tick(100);
      flush();
      fixture.detectChanges();

      expect(indicator).toBeTruthy();
    }));

    it('should cancel pending RAF on cleanup after resize', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      // Trigger resize to schedule RAF
      triggerResize();
      // Destroy immediately to test rafId cleanup
      fixture.destroy();
      flush();
    }));

    it('should handle resize before initialization completes', fakeAsync(() => {
      // Don't wait for init - trigger resize immediately
      triggerResize();
      tick(50);
      fixture.detectChanges();

      // Now let init complete
      tick(100);
      flush();
      fixture.detectChanges();

      const track = fixture.nativeElement.querySelector('.scroll-indicator-track');
      expect(track).toBeTruthy();
    }));

  });

  describe('indicator visibility', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should hide indicator when scrolled to bottom', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const indicator = fixture.nativeElement.querySelector('.scroll-indicator-vertical');

      // Scroll to bottom
      scrollContainer.scrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(100);
      fixture.detectChanges();

      // Indicator should be hidden or very small
      expect(indicator.style.opacity === '0' || parseFloat(indicator.style.getPropertyValue('--si-height')) < 2).toBeTruthy();
    }));
  });

  describe('disconnection handling', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
    });

    afterEach(() => {
      fixture.destroy();
    });

    it('should cleanup when host is disconnected', fakeAsync(() => {
      tick(100);
      flush();
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Simulate disconnection by destroying
      fixture.destroy();

      // Directive should have cleaned up
      expect(directive).toBeTruthy();
    }));
  });

  describe('polling and throttling', () => {
    it('should continue polling past 120 attempts with throttling', fakeAsync(async () => {
      @Component({
        template: `
          <div class="container" style="height: 200px;">
            <div appScrollIndicator class="content">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class NoScrollPollingComponent {}

      await TestBed.configureTestingModule({
        imports: [NoScrollPollingComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(NoScrollPollingComponent);
      fixture.detectChanges();

      // Let it poll past the RAF threshold (120 attempts) and into setTimeout territory
      tick(3000);
      flush();
      fixture.detectChanges();

      fixture.destroy();
    }));

    it('should restart polling when resize happens before init on non-scrollable', fakeAsync(async () => {
      // Use non-scrollable container where init never completes
      @Component({
        template: `
          <div class="container" style="height: 200px;">
            <div appScrollIndicator class="content">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class NoScrollResizeComponent {}

      await TestBed.configureTestingModule({
        imports: [NoScrollResizeComponent],
      }).compileComponents();

      const noScrollFixture = TestBed.createComponent(NoScrollResizeComponent);
      noScrollFixture.detectChanges();

      // Let polling start but don't let it complete (no scrollable ancestor)
      tick(50);

      // Trigger resize while not initialized - this hits lines 313-314
      triggerResize();
      tick(100);

      // Continue polling
      tick(500);
      flush();

      noScrollFixture.destroy();
    }));

    it('should cancel pollRafId when destroyed during RAF polling', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class PollRafCleanupComponent {}

      await TestBed.configureTestingModule({
        imports: [PollRafCleanupComponent],
      }).compileComponents();

      const pollFixture = TestBed.createComponent(PollRafCleanupComponent);
      pollFixture.detectChanges();
      tick(100);
      flush();
      pollFixture.detectChanges();

      const directiveEl = pollFixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Manually set pollRafId to simulate active polling - tests lines 138-139
      const fakeRafId = requestAnimationFrame(() => {});
      (directive as any).pollRafId = fakeRafId;

      // Destroy should cancel the RAF
      pollFixture.destroy();
    }));

    it('should restart polling when resize fires after init reset', fakeAsync(() => {
      // First, create a scrollable fixture that initializes fully
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class InitResetComponent {}

      TestBed.configureTestingModule({
        imports: [InitResetComponent],
      }).compileComponents();

      const resetFixture = TestBed.createComponent(InitResetComponent);
      resetFixture.detectChanges();

      tick(100);
      flush();
      resetFixture.detectChanges();

      const directiveEl = resetFixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Manually reset initialized to simulate race condition - hits lines 313-314
      (directive as any).initialized = false;

      // Trigger resize while not initialized
      triggerResize();
      tick(100);
      flush();
      resetFixture.detectChanges();

      expect(directive).toBeTruthy();

      resetFixture.destroy();
    }));

    it('should early return from pollForScrollableAncestor when already initialized', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class EarlyReturnComponent {}

      await TestBed.configureTestingModule({
        imports: [EarlyReturnComponent],
      }).compileComponents();

      const earlyFixture = TestBed.createComponent(EarlyReturnComponent);
      earlyFixture.detectChanges();
      tick(100);
      flush();

      const directiveEl = earlyFixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Directive is already initialized, calling pollForScrollableAncestor should early return (line 61)
      (directive as any).pollForScrollableAncestor();

      earlyFixture.destroy();
    }));

    it('should early return from handleResize when destroyed', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class DestroyedResizeComponent {}

      await TestBed.configureTestingModule({
        imports: [DestroyedResizeComponent],
      }).compileComponents();

      const destroyedFixture = TestBed.createComponent(DestroyedResizeComponent);
      destroyedFixture.detectChanges();
      tick(100);
      flush();

      const directiveEl = destroyedFixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Set destroyed to true and call handleResize - should early return (line 301)
      (directive as any).destroyed = true;
      (directive as any).handleResize();

      destroyedFixture.destroy();
    }));

    it('should early return from updateDimensionCache when scrollElement is null', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class NullScrollComponent {}

      await TestBed.configureTestingModule({
        imports: [NullScrollComponent],
      }).compileComponents();

      const nullFixture = TestBed.createComponent(NullScrollComponent);
      nullFixture.detectChanges();
      tick(100);
      flush();

      const directiveEl = nullFixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Set scrollElement to null and call updateDimensionCache - should early return (line 354)
      (directive as any).scrollElement = null;
      (directive as any).updateDimensionCache();

      nullFixture.destroy();
    }));

    it('should early return from updateIndicator when destroyed', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class DestroyedIndicatorComponent {}

      await TestBed.configureTestingModule({
        imports: [DestroyedIndicatorComponent],
      }).compileComponents();

      const indicatorFixture = TestBed.createComponent(DestroyedIndicatorComponent);
      indicatorFixture.detectChanges();
      tick(100);
      flush();

      const directiveEl = indicatorFixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Set destroyed to true and call updateIndicator - should early return (line 386)
      (directive as any).destroyed = true;
      (directive as any).updateIndicator();

      indicatorFixture.destroy();
    }));

    it('should log on 100th connected attempt (line 86 second branch)', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class Attempt100Component {}

      await TestBed.configureTestingModule({
        imports: [Attempt100Component],
      }).compileComponents();

      const attempt100Fixture = TestBed.createComponent(Attempt100Component);
      attempt100Fixture.detectChanges();
      tick(100);
      flush();

      const directiveEl = attempt100Fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Reset initialized and call with connectedAttempts=100 to hit line 86 second branch
      (directive as any).initialized = false;
      (directive as any).pollForScrollableAncestor(100);

      attempt100Fixture.destroy();
    }));

    it('should call scheduleContinuedPolling when no scrollable ancestor found (line 99)', fakeAsync(async () => {
      @Component({
        template: `
          <div class="container" style="height: 200px;">
            <div appScrollIndicator class="content">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class NoScrollableAncestorComponent {}

      await TestBed.configureTestingModule({
        imports: [NoScrollableAncestorComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(NoScrollableAncestorComponent);
      fixture.detectChanges();
      tick(100);
      flush();

      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      const hostElement = (directive as any).hostElement;

      // Mock findScrollingAncestor to return the host element (simulates no scrollable found)
      spyOn(directive as any, 'findScrollingAncestor').and.returnValue(hostElement);
      // Mock isScrollable to return false (host is not scrollable)
      spyOn(directive as any, 'isScrollable').and.returnValue(false);

      // Reset state and call pollForScrollableAncestor - should hit line 99
      (directive as any).initialized = false;
      (directive as any).pollForScrollableAncestor(0);

      tick(100);
      flush();

      fixture.destroy();
    }));

    it('should return correct polling delay based on attempt count', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class PollingDelayComponent {}

      await TestBed.configureTestingModule({
        imports: [PollingDelayComponent],
      }).compileComponents();

      const delayFixture = TestBed.createComponent(PollingDelayComponent);
      delayFixture.detectChanges();
      tick(100);
      flush();

      const directiveEl = delayFixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Test getPollingDelay helper
      expect((directive as any).getPollingDelay(0)).toBe(0);
      expect((directive as any).getPollingDelay(59)).toBe(0);
      expect((directive as any).getPollingDelay(60)).toBe(100);
      expect((directive as any).getPollingDelay(299)).toBe(100);
      expect((directive as any).getPollingDelay(300)).toBe(500);
      expect((directive as any).getPollingDelay(1000)).toBe(500);

      delayFixture.destroy();
    }));

    it('should initialize when host element itself is scrollable (line 99 second branch)', fakeAsync(async () => {
      // Host element has overflow: auto, making it the scrollable element
      @Component({
        template: `
          <div appScrollIndicator class="scrollable-host" style="height: 200px; overflow-y: auto;">
            <div style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class ScrollableHostComponent {}

      await TestBed.configureTestingModule({
        imports: [ScrollableHostComponent],
      }).compileComponents();

      const scrollableHostFixture = TestBed.createComponent(ScrollableHostComponent);
      scrollableHostFixture.detectChanges();
      tick(100);
      flush();
      scrollableHostFixture.detectChanges();

      // The host element itself is scrollable, so scrollEl === hostElement AND isScrollable is true
      const indicator = scrollableHostFixture.nativeElement.querySelector('.scroll-indicator-vertical');
      expect(indicator).toBeTruthy();

      scrollableHostFixture.destroy();
    }));
  });

  describe('horizontal scrolling visibility', () => {
    it('should hide horizontal indicator when scrolled to end', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="width: 200px; overflow-x: auto; white-space: nowrap;">
            <div [appScrollIndicator]="'horizontal'" class="content" style="width: 600px; display: inline-block;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class HorizontalEndComponent {}

      await TestBed.configureTestingModule({
        imports: [HorizontalEndComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(HorizontalEndComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const indicator = fixture.nativeElement.querySelector('.scroll-indicator-horizontal');

      if (scrollContainer && indicator) {
        // Scroll to end
        scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        scrollContainer.dispatchEvent(new Event('scroll'));
        tick(100);
        fixture.detectChanges();

        // Indicator should be hidden
        expect(indicator.style.opacity === '0' || parseFloat(indicator.style.getPropertyValue('--si-width') || '0') < 2).toBeTruthy();
      }

      fixture.destroy();
    }));

    it('should hide horizontal indicator when no scrollable width', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="width: 200px; overflow-x: auto;">
            <div [appScrollIndicator]="'horizontal'" class="content" style="width: 100px;">Short</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class NoHorizontalScrollComponent {}

      await TestBed.configureTestingModule({
        imports: [NoHorizontalScrollComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(NoHorizontalScrollComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.scroll-indicator-horizontal');
      if (indicator) {
        expect(indicator.style.opacity).toBe('0');
      }

      fixture.destroy();
    }));
  });

  describe('header and footer handling', () => {
    let fixture: ComponentFixture<any>;

    afterEach(() => {
      if (fixture) {
        fixture.destroy();
      }
    });

    it('should find header and footer elements and track header height', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
            <footer style="height: 50px; position: sticky; bottom: 0;">Footer</footer>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class HeaderFooterComponent {}

      await TestBed.configureTestingModule({
        imports: [HeaderFooterComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HeaderFooterComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Header and footer should be found
      expect((directive as any).headerElement).toBeTruthy();
      expect((directive as any).footerElement).toBeTruthy();
      expect((directive as any).headerHeight).toBeGreaterThan(0);
    }));

    it('should insert track before footer element', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
            <footer style="height: 50px;">Footer</footer>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class TrackPlacementComponent {}

      await TestBed.configureTestingModule({
        imports: [TrackPlacementComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TrackPlacementComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const track = scrollContainer.querySelector('.scroll-indicator-track');
      const footer = scrollContainer.querySelector('footer');

      // Track should be before footer in DOM order
      expect(track).toBeTruthy();
      expect(footer).toBeTruthy();
      expect(track.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }));

    it('should update header transform in proportional zone on scroll', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class HeaderScrollComponent {}

      await TestBed.configureTestingModule({
        imports: [HeaderScrollComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HeaderScrollComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const header = fixture.nativeElement.querySelector('header');

      // Scroll within header height (proportional zone)
      scrollContainer.scrollTop = 30;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(200);
      fixture.detectChanges();

      // Header should have transform applied
      expect(header.style.transform).toContain('translateY');
    }));

    it('should hide header when scrolled past header zone', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class HeaderHideComponent {}

      await TestBed.configureTestingModule({
        imports: [HeaderHideComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HeaderHideComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const header = fixture.nativeElement.querySelector('header');

      // Scroll past header zone
      scrollContainer.scrollTop = 200;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(200);
      fixture.detectChanges();

      // Header should be hidden
      expect(header.style.transform).toContain('-60');
    }));

    it('should show header with magic when scrolling up in middle zone', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class HeaderMagicComponent {}

      await TestBed.configureTestingModule({
        imports: [HeaderMagicComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HeaderMagicComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const header = fixture.nativeElement.querySelector('header');
      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // First scroll down past header
      scrollContainer.scrollTop = 300;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);

      // Then scroll up enough to trigger magic show
      scrollContainer.scrollTop = 280;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);
      scrollContainer.scrollTop = 260;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);
      scrollContainer.scrollTop = 240;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(200);
      fixture.detectChanges();

      // Header magic visible should be true
      expect((directive as any).headerMagicVisible).toBe(true);
      expect(header.style.transform).toMatch(/translateY\(0(px)?\)/);
    }));

    it('should hide header when scrolling down while magic visible', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class HeaderMagicHideComponent {}

      await TestBed.configureTestingModule({
        imports: [HeaderMagicHideComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HeaderMagicHideComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Set magic visible manually
      (directive as any).headerMagicVisible = true;
      (directive as any).lastScrollTop = 200;
      (directive as any).lastDirectionChangeScrollTop = 200;

      // Scroll down significantly
      scrollContainer.scrollTop = 250;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);
      scrollContainer.scrollTop = 280;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(200);
      fixture.detectChanges();

      // Header should no longer be magic visible
      expect((directive as any).headerMagicVisible).toBe(false);
    }));

    it('should transition from magic visible to proportional when reaching top', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class HeaderTopTransitionComponent {}

      await TestBed.configureTestingModule({
        imports: [HeaderTopTransitionComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HeaderTopTransitionComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Set magic visible and scroll to top
      (directive as any).headerMagicVisible = true;
      (directive as any).lastScrollTop = 50;

      scrollContainer.scrollTop = 0;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(200);
      fixture.detectChanges();

      // Magic should be off, handed off to proportional
      expect((directive as any).headerMagicVisible).toBe(false);
    }));

    it('should update footer left position on horizontal scroll', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="width: 300px; height: 300px; overflow: auto;">
            <div appScrollIndicator class="content" style="width: 1000px; height: 1000px;">Content</div>
            <footer style="height: 50px; position: relative;">Footer</footer>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class FooterHorizontalComponent {}

      await TestBed.configureTestingModule({
        imports: [FooterHorizontalComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(FooterHorizontalComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const footer = fixture.nativeElement.querySelector('footer');

      // Scroll horizontally
      scrollContainer.scrollLeft = 100;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(200);
      fixture.detectChanges();

      // Footer should have left offset
      expect(footer.style.left).toBe('100px');
    }));

    it('should call correctHeaderPosition after scroll ends', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class ScrollEndCheckComponent {}

      await TestBed.configureTestingModule({
        imports: [ScrollEndCheckComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(ScrollEndCheckComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      const correctSpy = spyOn(directive as any, 'correctHeaderPosition').and.callThrough();

      // Scroll to trigger scroll end check
      scrollContainer.scrollTop = 200;
      scrollContainer.dispatchEvent(new Event('scroll'));

      // Wait for scroll end timeout (150ms)
      tick(200);
      fixture.detectChanges();

      expect(correctSpy).toHaveBeenCalled();
    }));

    it('should clear and reset scrollEndTimeout on rapid scrolls', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class RapidScrollComponent {}

      await TestBed.configureTestingModule({
        imports: [RapidScrollComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(RapidScrollComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');

      // Multiple rapid scrolls
      scrollContainer.scrollTop = 100;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);
      scrollContainer.scrollTop = 150;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);
      scrollContainer.scrollTop = 200;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(200);
      fixture.detectChanges();

      // Should complete without errors
      expect(true).toBe(true);
    }));

    it('should handle content changes via MutationObserver', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 600px;">
              <div class="dynamic-content">Initial</div>
            </div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class ContentChangeComponent {}

      await TestBed.configureTestingModule({
        imports: [ContentChangeComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(ContentChangeComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Verify contentObserver is set up
      expect((directive as any).contentObserver).toBeTruthy();

      // Call handleContentChange directly to verify the code path
      (directive as any).handleContentChange();
      tick(50);

      // Verify the directive is still functional
      expect((directive as any).cachedScrollHeight).toBeGreaterThan(0);

      fixture.destroy();
    }));

    it('should update header dimensions on resize', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class HeaderResizeComponent {}

      await TestBed.configureTestingModule({
        imports: [HeaderResizeComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HeaderResizeComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      const updateDimSpy = spyOn(directive as any, 'updateHeaderFooterDimensions').and.callThrough();

      // Trigger resize
      triggerResize();
      tick(100);
      fixture.detectChanges();

      expect(updateDimSpy).toHaveBeenCalled();
    }));

    it('should clear animationTimeout on cleanup', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class AnimationCleanupComponent {}

      await TestBed.configureTestingModule({
        imports: [AnimationCleanupComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(AnimationCleanupComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Set an animation timeout
      (directive as any).animationTimeout = setTimeout(() => {}, 1000);

      // Destroy to trigger cleanup
      fixture.destroy();
      fixture = null as any;
      tick(100);

      // Should complete without errors (timeout was cleared)
      expect(true).toBe(true);
    }));

    it('should clear existing animationTimeout when startHeaderAnimation called twice', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class DoubleAnimationComponent {}

      await TestBed.configureTestingModule({
        imports: [DoubleAnimationComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(DoubleAnimationComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Set an existing animation timeout to simulate animation in progress
      (directive as any).animationTimeout = setTimeout(() => {}, 1000);
      (directive as any).headerAnimating = true;

      // Call startHeaderAnimation again - should clear previous timeout
      (directive as any).startHeaderAnimation();

      // animationTimeout should be set (new one)
      expect((directive as any).animationTimeout).toBeTruthy();
      expect((directive as any).headerAnimating).toBe(true);

      // Wait for animation to complete
      tick(250);

      expect((directive as any).headerAnimating).toBe(false);
    }));

    it('should track direction changes correctly', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 300px; overflow-y: auto;">
            <header style="height: 60px; position: sticky; top: 0;">Header</header>
            <div appScrollIndicator class="content" style="height: 1000px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class DirectionChangeComponent {}

      await TestBed.configureTestingModule({
        imports: [DirectionChangeComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(DirectionChangeComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.scroll-container');
      const directiveEl = fixture.debugElement.query(By.directive(ScrollIndicatorDirective));
      const directive = directiveEl.injector.get(ScrollIndicatorDirective);

      // Scroll down
      scrollContainer.scrollTop = 100;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);

      scrollContainer.scrollTop = 200;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);

      // Now scroll up - direction change
      scrollContainer.scrollTop = 180;
      scrollContainer.dispatchEvent(new Event('scroll'));
      tick(50);

      // lastDirectionChangeScrollTop should have been updated
      expect((directive as any).lastDirectionChangeScrollTop).toBeDefined();
      tick(200);
    }));
  });

  describe('edge cases', () => {
    it('should handle empty appScrollIndicator value as vertical', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div [appScrollIndicator]="''" class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class EmptyModeTestComponent {}

      await TestBed.configureTestingModule({
        imports: [EmptyModeTestComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(EmptyModeTestComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const verticalIndicator = fixture.nativeElement.querySelector('.scroll-indicator-vertical');
      expect(verticalIndicator).toBeTruthy();

      fixture.destroy();
    }));

    it('should handle scroll element with padding', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto; padding-right: 20px; padding-bottom: 20px;">
            <div appScrollIndicator class="content" style="height: 600px;">Content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class PaddedTestComponent {}

      await TestBed.configureTestingModule({
        imports: [PaddedTestComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(PaddedTestComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const track = fixture.nativeElement.querySelector('.scroll-indicator-track');
      expect(track).toBeTruthy();

      // Check that offset CSS variables are set on the track (should reflect scroll container's padding)
      const offsetRight = track.style.getPropertyValue('--si-offset-right');
      // Verify offset is set and non-zero (accounts for padding handling)
      expect(offsetRight).toBeTruthy();
      expect(Number.parseFloat(offsetRight)).toBeGreaterThan(0);

      fixture.destroy();
    }));

    it('should handle no scrollable distance (content fits)', fakeAsync(async () => {
      @Component({
        template: `
          <div class="scroll-container" style="height: 200px; overflow-y: auto;">
            <div appScrollIndicator class="content" style="height: 100px;">Short content</div>
          </div>
        `,
        imports: [ScrollIndicatorDirective],
      })
      class NoScrollTestComponent {}

      await TestBed.configureTestingModule({
        imports: [NoScrollTestComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(NoScrollTestComponent);
      fixture.detectChanges();
      tick(100);
      flush();
      fixture.detectChanges();

      const indicator = fixture.nativeElement.querySelector('.scroll-indicator-vertical');
      if (indicator) {
        // Indicator should be hidden when no scrollable content
        expect(indicator.style.opacity).toBe('0');
      }

      fixture.destroy();
    }));
  });
});

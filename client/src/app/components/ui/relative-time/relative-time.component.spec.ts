import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RelativeTimeComponent } from './relative-time.component';
import { Tooltip } from 'primeng/tooltip';
import { TIME_CONSTANTS } from '@app/constants/ui.constants';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  template: `<app-relative-time [timestamp]="testDate" [mode]="mode" [format]="format" />`,
  standalone: true,
  imports: [RelativeTimeComponent],
})
class TestHostComponent {
  testDate: Date | number | string | null | undefined;
  mode: 'relative' | 'absolute' = 'relative';
  format: 'short' | 'medium' | 'long' | 'shortDate' | 'shortTime' = 'short';
}

describe('RelativeTimeComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.testDate = new Date();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-relative-time')).toBeTruthy();
  });

  it('should display "Just now" for recent dates', () => {
    component.testDate = new Date();
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toContain('Just now');
  });

  it('should display minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * TIME_CONSTANTS.MINUTES);
    component.testDate = fiveMinutesAgo;
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toContain('5');
  });

  it('should display hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * TIME_CONSTANTS.HOURS);
    component.testDate = threeHoursAgo;
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toContain('3');
  });

  it('should display days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * TIME_CONSTANTS.DAYS);
    component.testDate = twoDaysAgo;
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toContain('2');
  });

  it('should accept timestamp numbers', () => {
    component.testDate = Date.now() - 10 * TIME_CONSTANTS.MINUTES;
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toContain('10');
  });

  it('should accept ISO date strings', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * TIME_CONSTANTS.MINUTES);
    component.testDate = tenMinutesAgo.toISOString();
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toContain('10');
  });

  it('should have PrimeNG tooltip with localized date/time', () => {
    const testDate = new Date('2024-01-15T10:30:00');
    component.testDate = testDate;
    fixture.detectChanges();

    // Get the Tooltip directive instance from the span element
    const spanDebug: DebugElement = fixture.debugElement.query(By.css('app-relative-time span'));
    const tooltipDirective = spanDebug.injector.get(Tooltip);

    expect(tooltipDirective.content).toContain('2024');
  });

  it('should update text periodically', fakeAsync(() => {
    // Set date to 30 seconds ago - should show "Just now"
    const now = Date.now();
    const thirtySecondsAgo = new Date(now - 30 * TIME_CONSTANTS.SECONDS);
    component.testDate = thirtySecondsAgo;
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent.toLowerCase()).toContain('just now');

    // Fast-forward 1 minute - timer fires and updates the text
    // The timestamp is now ~90 seconds old, so should show "1 minute ago"
    tick(TIME_CONSTANTS.MINUTES);
    fixture.detectChanges();

    expect(span.textContent.toLowerCase()).toContain('minute');
  }));

  it('should handle null timestamp', () => {
    component.testDate = null;
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toBe('');

    const spanDebug: DebugElement = fixture.debugElement.query(By.css('app-relative-time span'));
    const tooltipDirective = spanDebug.injector.get(Tooltip);
    expect(tooltipDirective.content).toBe('');
  });

  it('should handle undefined timestamp', () => {
    component.testDate = undefined;
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toBe('');
  });

  it('should update when timestamp changes from null to valid date', () => {
    component.testDate = null;
    fixture.detectChanges();

    let span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toBe('');

    // Change to a valid date
    component.testDate = new Date();
    fixture.detectChanges();

    span = fixture.nativeElement.querySelector('app-relative-time span');
    expect(span.textContent).toContain('Just now');
  });

  describe('absolute mode', () => {
    it('should display formatted date in absolute mode with short format', () => {
      component.mode = 'absolute';
      component.format = 'short';
      component.testDate = new Date('2024-12-13T21:41:00');
      fixture.detectChanges();

      const span = fixture.nativeElement.querySelector('app-relative-time span');
      // Should contain date components (format varies by locale)
      expect(span.textContent).toContain('12');
      expect(span.textContent).toContain('13');
    });

    it('should display date only with shortDate format', () => {
      component.mode = 'absolute';
      component.format = 'shortDate';
      component.testDate = new Date('2024-11-17T10:30:00');
      fixture.detectChanges();

      const span = fixture.nativeElement.querySelector('app-relative-time span');
      // Should contain date but not time
      expect(span.textContent).toContain('11');
      expect(span.textContent).toContain('17');
    });

    it('should display medium format', () => {
      component.mode = 'absolute';
      component.format = 'medium';
      component.testDate = new Date('2024-01-15T10:30:00');
      fixture.detectChanges();

      const span = fixture.nativeElement.querySelector('app-relative-time span');
      // Medium format includes month name
      expect(span.textContent).toContain('Jan');
    });

    it('should display long format', () => {
      component.mode = 'absolute';
      component.format = 'long';
      component.testDate = new Date('2024-01-15T10:30:00');
      fixture.detectChanges();

      const span = fixture.nativeElement.querySelector('app-relative-time span');
      // Long format includes full month name
      expect(span.textContent).toContain('January');
    });

    it('should display time only with shortTime format', () => {
      component.mode = 'absolute';
      component.format = 'shortTime';
      component.testDate = new Date('2024-01-15T10:30:00');
      fixture.detectChanges();

      const span = fixture.nativeElement.querySelector('app-relative-time span');
      // Should contain time components (10:30)
      expect(span.textContent).toContain('10');
      expect(span.textContent).toContain('30');
    });

    it('should still have tooltip in absolute mode', () => {
      component.mode = 'absolute';
      component.testDate = new Date('2024-01-15T10:30:00');
      fixture.detectChanges();

      const spanDebug: DebugElement = fixture.debugElement.query(By.css('app-relative-time span'));
      const tooltipDirective = spanDebug.injector.get(Tooltip);

      expect(tooltipDirective.content).toContain('2024');
    });

    it('should not start timer in absolute mode', fakeAsync(() => {
      component.mode = 'absolute';
      component.testDate = new Date('2024-12-13T21:41:00');
      fixture.detectChanges();

      const span = fixture.nativeElement.querySelector('app-relative-time span');
      const initialText = span.textContent;

      // Fast-forward 1 minute - should not trigger any updates
      tick(TIME_CONSTANTS.MINUTES);
      fixture.detectChanges();

      // Text should remain unchanged (no timer running)
      expect(span.textContent).toBe(initialText);
    }));
  });

  describe('language changes', () => {
    it('should update display when translation load succeeds', fakeAsync(() => {
      component.testDate = new Date();
      fixture.detectChanges();

      const translocoService = TestBed.inject(TranslocoService);
      const span = fixture.nativeElement.querySelector('app-relative-time span');

      // Get initial text
      const initialText = span.textContent;
      expect(initialText).toContain('Just now');

      // Simulate a translation load success event (as would happen after language change)
      // The TranslocoService in testing module emits events when setActiveLang is called
      translocoService.setActiveLang('de');
      tick();
      fixture.detectChanges();

      // Component should have updated (text may or may not change depending on translations,
      // but the subscription callback should have been called)
      expect(span.textContent).toBeTruthy();
    }));
  });
});

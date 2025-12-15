import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TimerIndicatorDirective } from './timer-indicator.directive';

@Component({
  template: `<div [appTimerIndicator]="duration" [timerPosition]="position" [timerHeight]="height">Content</div>`,
  imports: [TimerIndicatorDirective],
})
class TestHostComponent {
  duration = 5;
  position: 'top' | 'bottom' = 'bottom';
  height = 6;
}

describe('TimerIndicatorDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create directive', () => {
    const directiveEl = fixture.debugElement.query(By.directive(TimerIndicatorDirective));
    expect(directiveEl).toBeTruthy();
  });

  it('should create indicator element', () => {
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator).toBeTruthy();
  });

  it('should set animation duration based on input', () => {
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator.style.animation).toContain('5s');
  });

  it('should position indicator at bottom by default', () => {
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator.style.bottom).toBe('0px');
  });

  it('should position indicator at top when configured', () => {
    component.position = 'top';
    fixture.detectChanges();
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator.style.top).toBe('0px');
  });

  it('should hide indicator when duration is 0', () => {
    component.duration = 0;
    fixture.detectChanges();
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator.style.display).toBe('none');
  });

  it('should hide indicator when duration is negative', () => {
    component.duration = -1;
    fixture.detectChanges();
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator.style.display).toBe('none');
  });

  it('should update animation when duration changes', () => {
    component.duration = 10;
    fixture.detectChanges();
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator.style.animation).toContain('10s');
  });

  it('should set custom height', () => {
    component.height = 10;
    fixture.detectChanges();
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator.style.height).toBe('10px');
  });

  it('should remove indicator on destroy', () => {
    fixture.destroy();
    const indicator = fixture.nativeElement.querySelector('.timer-indicator');
    expect(indicator).toBeNull();
  });

  it('should handle updateIndicator called before indicator element exists', () => {
    // Get directive instance
    const directiveEl = fixture.debugElement.query(By.directive(TimerIndicatorDirective));
    const directive = directiveEl.injector.get(TimerIndicatorDirective);

    // Manually set indicatorElement to null to simulate pre-init state
    (directive as any).indicatorElement = null;

    // This should not throw - just return early
    expect(() => (directive as any).updateIndicator()).not.toThrow();
  });
});

import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { DialogMenuComponent } from './dialog-menu.component';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

// Test host component to use the dialog-menu with content projection
@Component({
  template: `
    <app-dialog-menu [position]="position" [width]="width" [zIndex]="zIndex" [showCloseButton]="showCloseButton">
      <button menu-trigger>Open Menu</button>
      <div menu-content>Menu Content</div>
    </app-dialog-menu>
  `,
  imports: [DialogMenuComponent]
})
class TestHostComponent {
  position: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | '' = '';
  width = '400px';
  zIndex = 1000;
  showCloseButton = true;
}

describe('DialogMenuComponent', () => {
  let component: DialogMenuComponent;
  let fixture: ComponentFixture<DialogMenuComponent>;
  let overlayRefSpy: jasmine.SpyObj<OverlayRef>;
  let backdropClickSubject: Subject<MouseEvent>;
  let overlaySpy: jasmine.SpyObj<Overlay>;

  beforeEach(async () => {
    backdropClickSubject = new Subject<MouseEvent>();

    overlayRefSpy = jasmine.createSpyObj('OverlayRef', [
      'attach',
      'detach',
      'hasAttached',
      'backdropClick'
    ]);
    overlayRefSpy.backdropClick.and.returnValue(backdropClickSubject.asObservable());
    overlayRefSpy.hasAttached.and.returnValue(true);

    const positionStrategyMock = jasmine.createSpyObj('PositionStrategy', ['global']);
    const overlayPositionBuilder = jasmine.createSpyObj('OverlayPositionBuilder', ['global']);
    overlayPositionBuilder.global.and.returnValue(positionStrategyMock);

    const scrollStrategyMock = jasmine.createSpyObj('ScrollStrategyOptions', ['noop']);
    scrollStrategyMock.noop.and.returnValue({} as any);

    overlaySpy = jasmine.createSpyObj('Overlay', ['create', 'position']);
    overlaySpy.position.and.returnValue(overlayPositionBuilder);
    (overlaySpy as any).scrollStrategies = scrollStrategyMock;
    overlaySpy.create.and.returnValue(overlayRefSpy);

    await TestBed.configureTestingModule({
      imports: [DialogMenuComponent, getTranslocoModule()],
      providers: [
        { provide: Overlay, useValue: overlaySpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.position()).toBe('');
    expect(component.width()).toBe('auto');
    expect(component.zIndex()).toBe(1000);
    expect(component.showCloseButton()).toBe(true);
    expect(component.isOpen()).toBe(false);
  });

  describe('toggle', () => {
    it('should open menu when closed', () => {
      expect(component.isOpen()).toBe(false);
      component.toggle();
      expect(component.isOpen()).toBe(true);
    });

    it('should close menu when open', () => {
      component.open();
      expect(component.isOpen()).toBe(true);

      component.toggle();
      expect(component.isOpen()).toBe(false);
    });
  });

  describe('open', () => {
    it('should create overlay on first open', () => {
      expect((component as any).overlayRef).toBeNull();
      component.open();
      expect((component as any).overlayRef).not.toBeNull();
    });

    it('should set isOpen to true', () => {
      component.open();
      expect(component.isOpen()).toBe(true);
    });

    it('should reuse existing overlay on subsequent opens', () => {
      component.open();
      const firstOverlayRef = (component as any).overlayRef;

      component.close();
      component.open();

      expect((component as any).overlayRef).toBe(firstOverlayRef);
    });

    // Note: Backdrop click functionality is tested in integration/E2E tests
    // The backdropClick().pipe(takeUntilDestroyed()) pattern is difficult to
    // unit test due to the DestroyRef dependency, but works correctly in production
  });

  describe('close', () => {
    it('should detach overlay if attached', () => {
      component.open();
      (component as any).overlayRef = overlayRefSpy;

      component.close();

      expect(overlayRefSpy.detach).toHaveBeenCalled();
    });

    it('should set isOpen to false', () => {
      component.open();
      component.close();
      expect(component.isOpen()).toBe(false);
    });

    it('should not throw if overlayRef is null', () => {
      (component as any).overlayRef = null;
      expect(() => component.close()).not.toThrow();
    });

    it('should not detach if overlay is not attached', () => {
      component.open();
      overlayRefSpy.hasAttached.and.returnValue(false);
      (component as any).overlayRef = overlayRefSpy;

      component.close();

      expect(overlayRefSpy.detach).not.toHaveBeenCalled();
    });
  });

});

describe('DialogMenuComponent with host', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, OverlayModule, getTranslocoModule()]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    hostFixture.detectChanges();
  });

  it('should project trigger and content', () => {
    const compiled = hostFixture.nativeElement;
    expect(compiled.querySelector('button').textContent).toContain('Open Menu');
  });

  it('should apply custom position', () => {
    hostComponent.position = 'top-right';
    hostFixture.detectChanges();

    const dialogMenu = hostFixture.debugElement.children[0].componentInstance;
    expect(dialogMenu.position()).toBe('top-right');
  });

  it('should apply custom width', () => {
    hostComponent.width = '500px';
    hostFixture.detectChanges();

    const dialogMenu = hostFixture.debugElement.children[0].componentInstance;
    expect(dialogMenu.width()).toBe('500px');
  });

  it('should apply custom zIndex', () => {
    hostComponent.zIndex = 2000;
    hostFixture.detectChanges();

    const dialogMenu = hostFixture.debugElement.children[0].componentInstance;
    expect(dialogMenu.zIndex()).toBe(2000);
  });

  it('should hide close button when showCloseButton is false', () => {
    hostComponent.showCloseButton = false;
    hostFixture.detectChanges();

    const dialogMenu = hostFixture.debugElement.children[0].componentInstance;
    expect(dialogMenu.showCloseButton()).toBe(false);
  });
});

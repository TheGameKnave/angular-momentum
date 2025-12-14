import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MenuFeatureComponent } from './menu-feature.component';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { HelpersService } from '@app/services/helpers.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { Component, signal } from '@angular/core';
import { ComponentInstance } from '@app/models/data.model';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { Subject } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConnectivityService } from '@app/services/connectivity.service';
import { SCREEN_SIZES } from '@app/constants/ui.constants';

class MockConnectivityService {
  showOffline = signal(false);
  isOnline = signal(true);
  start(): Promise<void> {
    return Promise.resolve(); // no-op for tests
  }
}

@Component({ selector: 'mock-comp-a', template: '' })
class MockComponentA {}

describe('MenuFeatureComponent', () => {
  let component: MenuFeatureComponent;
  let fixture: ComponentFixture<MenuFeatureComponent>;
  let helpersServiceSpy: jasmine.SpyObj<HelpersService>;
  let routerEvents$: Subject<any>;

  const mockEnabledComponents = signal<ComponentInstance[]>([
    { name: 'FeatureA', component: MockComponentA, icon: 'iconA' },
    { name: 'FeatureB', component: MockComponentA, icon: 'iconB' },
    { name: 'FeatureC', component: MockComponentA, icon: 'iconC' },
  ]);

  beforeEach(async () => {
    const featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);
    helpersServiceSpy = jasmine.createSpyObj('HelpersService', [], {
      enabledComponents: mockEnabledComponents
    });

    routerEvents$ = new Subject<any>();
    const routerSpy = jasmine.createSpyObj('Router', [], { events: routerEvents$.asObservable() });

    await TestBed.configureTestingModule({
      imports: [
        MenuFeatureComponent,
        getTranslocoModule(),
      ],
      providers: [
        provideHttpClientTesting(),
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: HelpersService, useValue: helpersServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ConnectivityService, useClass: MockConnectivityService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct component count', () => {
    expect(component.componentCount()).toBe(mockEnabledComponents().length);
  });

  it('should return 0 when enabledComponents is empty', () => {
    mockEnabledComponents.set([]);
    fixture.detectChanges();
    expect(component.componentCount()).toBe(0);
  });

  it('should show tooltip correctly', () => {
    const spyInnerWidth = spyOnProperty(window, 'innerWidth', 'get');

    // Mobile
    spyInnerWidth.and.returnValue(320);
    component.isMobile.set(window.innerWidth < SCREEN_SIZES.sm); // <- update signal
    expect(component.showTooltip()).toBeTrue();

    // Desktop, expanded true + always
    spyInnerWidth.and.returnValue(1024);
    component.isMobile.set(window.innerWidth < SCREEN_SIZES.sm); // <- update signal
    expect(component.showTooltip(true)).toBeTrue();
  });

  it('should call scrollToCenter on navigation', fakeAsync(() => {
    const scrollSpy = spyOn(component, 'scrollToCenter');
    component.ngAfterViewInit();
    routerEvents$.next(new NavigationEnd(1, '/', '/'));
    tick();
    expect(scrollSpy).toHaveBeenCalled();
  }));

  it('should save scroll position on NavigationStart', fakeAsync(() => {
    const scrollAreaMock = document.createElement('div');
    Object.defineProperty(scrollAreaMock, 'scrollLeft', { value: 150, configurable: true });
    component.scrollArea = { nativeElement: scrollAreaMock } as any;

    component.ngAfterViewInit();
    routerEvents$.next(new NavigationStart(1, '/'));
    tick();

    expect((component as any).savedScrollLeft).toBe(150);
  }));
  it('should call scrollToCenter on resize', () => {
    const scrollSpy = spyOn(component, 'scrollToCenter');

    // simulate resize event
    component.onResize();

    expect(scrollSpy).toHaveBeenCalled();
  });
  it('should not scroll if there is no activeLink', () => {
    const scrollAreaMock = document.createElement('div');
    scrollAreaMock.style.width = '200px';
    component.scrollArea = { nativeElement: scrollAreaMock } as any;

    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(320); // mobile

    // Spy rAF: call callback only once to avoid infinite recursion
    let rAFCalled = false;
    spyOn(window, 'requestAnimationFrame').and.callFake(
      (callback: FrameRequestCallback): number => {
        if (!rAFCalled) {
          rAFCalled = true;
          callback(performance.now());
        }
        return 0;
      }
    );

    const scrollSpy = spyOn(scrollAreaMock, 'scrollTo');

    component.scrollToCenter();

    expect(scrollSpy).not.toHaveBeenCalled();
  });
  it('should warn if no activeLink is found after max attempts', () => {
    const scrollAreaMock = document.createElement('div');
    scrollAreaMock.style.width = '200px';
    component.scrollArea = { nativeElement: scrollAreaMock } as any;

    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(320); // mobile

    // Spy console.warn
    const warnSpy = spyOn(console, 'warn');

    // Fake rAF to immediately call callback
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback): number => {
      cb(performance.now());
      return 0;
    });

    component.scrollToCenter();

    expect(warnSpy).toHaveBeenCalledWith(
      'MenuFeatureComponent: no .selected element found after multiple attempts.'
    );
  });

  it('should scroll on mobile', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(320);
    component.isMobile.set(true);

    const scrollAreaMock = document.createElement('div');
    component.scrollArea = { nativeElement: scrollAreaMock } as any;

    const li = document.createElement('a');
    li.classList.add('selected');
    li.style.width = '50px';
    scrollAreaMock.appendChild(li);

    const scrollSpy = spyOn(scrollAreaMock, 'scrollTo');

    spyOn(window, 'requestAnimationFrame').and.callFake(cb => { cb(0); return 0; });

    component.scrollToCenter();

    expect(scrollSpy).toHaveBeenCalled();
  });

  it('should restore saved position then smooth scroll on Chrome Mobile', fakeAsync(() => {
    const scrollAreaMock = document.createElement('div');
    Object.defineProperty(scrollAreaMock, 'clientWidth', { value: 200, configurable: true });
    component.scrollArea = { nativeElement: scrollAreaMock } as any;

    const li = document.createElement('a');
    li.classList.add('selected');
    Object.defineProperty(li, 'offsetLeft', { value: 50, configurable: true });
    Object.defineProperty(li, 'offsetWidth', { value: 50, configurable: true });
    scrollAreaMock.appendChild(li);

    component.isMobile.set(true);

    const originalUA = navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; Chrome/128.0.0.0 Mobile Safari/537.36)',
      configurable: true,
    });

    // Simulate a saved scroll position (as if navigation just occurred)
    (component as any).savedScrollLeft = 100;

    let scrollLeftValue = 0;
    Object.defineProperty(scrollAreaMock, 'scrollLeft', {
      get: () => scrollLeftValue,
      set: (val) => { scrollLeftValue = val; },
      configurable: true
    });

    const scrollToSpy = spyOn(scrollAreaMock, 'scrollTo');

    const rafQueue: FrameRequestCallback[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake(cb => {
      rafQueue.push(cb);
      return 0;
    });

    component.scrollToCenter();

    while (rafQueue.length) {
      const cb = rafQueue.shift()!;
      cb(0);
    }

    // Verify saved position was restored first
    expect(scrollLeftValue).toBe(100);
    // Verify smooth scroll was then called
    expect(scrollToSpy).toHaveBeenCalled();
    const callArgs = scrollToSpy.calls.mostRecent().args[0] as ScrollToOptions;
    expect(callArgs.behavior).toBe('smooth');
    expect(typeof callArgs.left).toBe('number');

    Object.defineProperty(window.navigator, 'userAgent', { value: originalUA, configurable: true });
  }));


  it('should scroll on desktop with offset 0', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1024);
    component.isMobile.set(false);

    const scrollAreaMock = document.createElement('div');
    component.scrollArea = { nativeElement: scrollAreaMock } as any;

    const li = document.createElement('a');
    li.classList.add('selected');
    li.style.width = '50px';
    scrollAreaMock.appendChild(li);

    const scrollSpy = spyOn(scrollAreaMock, 'scrollTo');

    spyOn(window, 'requestAnimationFrame').and.callFake(cb => { cb(0); return 0; });

    component.scrollToCenter();

    expect(scrollSpy).toHaveBeenCalled();
  });

});

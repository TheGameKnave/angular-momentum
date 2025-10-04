import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MenuFeatureComponent } from './menu-feature.component';
import { ComponentListService } from '@app/services/component-list.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { HelpersService } from '@app/services/helpers.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { Component, signal } from '@angular/core';
import { ComponentInstance } from '@app/models/data.model';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConnectivityService } from '@app/services/connectivity.service';
import { SCREEN_SIZES } from '@app/helpers/constants';

class MockConnectivityService {
  showOffline = signal(false);
  isOnline = signal(true);
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
    const componentListServiceSpy = jasmine.createSpyObj('ComponentListService', ['getComponentList']);
    const featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);
    helpersServiceSpy = jasmine.createSpyObj('HelpersService', [], {
      enabledComponents: mockEnabledComponents
    });

    routerEvents$ = new Subject<any>();
    const routerSpy = jasmine.createSpyObj('Router', [], { events: routerEvents$.asObservable() });

    await TestBed.configureTestingModule({
      imports: [
        MenuFeatureComponent,
        getTranslocoModule()
      ],
      providers: [
        provideHttpClientTesting(),
        { provide: ComponentListService, useValue: componentListServiceSpy },
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

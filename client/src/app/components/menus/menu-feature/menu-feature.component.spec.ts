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

  it('should toggle expanded on mouseenter and mouseleave for desktop', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(1024); // desktop
    component.onMouseEnter();
    expect(component.expanded()).toBeTrue();
    component.onMouseLeave();
    expect(component.expanded()).toBeFalse();
  });

  it('should collapse expanded on click', () => {
    component.expanded.set(true);
    component.onClick();
    expect(component.expanded()).toBeFalse();
  });

  it('should show tooltip correctly', () => {
    const spyInnerWidth = spyOnProperty(window, 'innerWidth', 'get');
    
    // Mobile
    spyInnerWidth.and.returnValue(320);
    expect(component.showTooltip()).toBeTrue();

    // Desktop, expanded false
    spyInnerWidth.and.returnValue(1024);
    component.expanded.set(false);
    expect(component.showTooltip()).toBeFalse();

    // Desktop, expanded true + always
    component.expanded.set(true);
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


  it('should attempt to scroll only on mobile', () => {
    const scrollAreaMock = document.createElement('div');
    scrollAreaMock.style.width = '200px';
    component.scrollArea = { nativeElement: scrollAreaMock } as any;

    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(320); // mobile

    const scrollSpy = spyOn(scrollAreaMock, 'scrollTo');

    const li = document.createElement('a');
    li.classList.add('selected');
    li.style.width = '50px';
    scrollAreaMock.appendChild(li);

    // Only one properly typed rAF spy
    spyOn(window, 'requestAnimationFrame').and.callFake(
      (callback: FrameRequestCallback): number => {
        callback(performance.now()); // pass timestamp
        return 0;                    // dummy rAF ID
      }
    );

    component.scrollToCenter();

    expect(scrollSpy).toHaveBeenCalled();
  });


});

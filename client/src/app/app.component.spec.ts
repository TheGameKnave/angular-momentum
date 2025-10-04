import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { UpdateService } from '@app/services/update.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { ComponentListService } from '@app/services/component-list.service';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { Router, NavigationEnd } from '@angular/router';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Socket } from 'ngx-socket-io';
import { of, Subject } from 'rxjs';
import { SCREEN_SIZES } from './helpers/constants';
import { Component, signal, Type } from '@angular/core';
import { ConnectivityService } from './services/connectivity.service';

// Dummy component just to satisfy ComponentInstance typing
@Component({ template: '' })
class DummyComponent{}
class MockConnectivityService {
  showOffline = signal(false);
  isOnline = signal(true);
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  let updateService: jasmine.SpyObj<UpdateService>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let slugPipe: jasmine.SpyObj<SlugPipe>;
  let componentListService: jasmine.SpyObj<ComponentListService>;
  let routerEvents$: Subject<any>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    updateService = jasmine.createSpyObj('UpdateService', ['checkForUpdates']);
    featureFlagService = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);
    slugPipe = jasmine.createSpyObj('SlugPipe', ['transform']);
    componentListService = jasmine.createSpyObj('ComponentListService', ['getComponentList']);

    // default mock: empty array to prevent forEach errors
    componentListService.getComponentList.and.returnValue([]);

    routerEvents$ = new Subject<any>();
    router = jasmine.createSpyObj('Router', ['navigate'], { events: routerEvents$.asObservable() });

    const socketSpy = jasmine.createSpyObj('Socket', ['on', 'fromEvent', 'emit', 'disconnect', 'connect']);

    TestBed.configureTestingModule({
      imports: [
        AppComponent,
        getTranslocoModule()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UpdateService, useValue: updateService },
        { provide: FeatureFlagService, useValue: featureFlagService },
        { provide: SlugPipe, useValue: slugPipe },
        { provide: ComponentListService, useValue: componentListService },
        { provide: Router, useValue: router },
        { provide: Socket, useValue: socketSpy },
        { provide: ConnectivityService, useClass: MockConnectivityService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.className = ''; // cleanup
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize version from package.json', () => {
    expect(component.version).toBeDefined();
  });

  it('should set isDevMode correctly', () => {
    expect(typeof component.isDevMode).toBe('boolean');
  });

  describe('ngOnInit', () => {
    it('should reset openMenu and set routePath/breadcrumb on NavigationEnd', () => {
      slugPipe.transform.and.returnValue('foo_bar');
      componentListService.getComponentList.and.returnValue([
        { name: 'Foo Bar', component: DummyComponent, icon: 'test-icon' }
      ]);

      const navEvent = new NavigationEnd(1, '/foo/bar', '/foo/bar');
      routerEvents$.next(navEvent);

      expect(component.openMenu).toBe('');
      expect(component.routePath).toBe('foo_bar');
      expect(component.breadcrumb).toBe('Foo Bar');
    });

    it('should clear breadcrumb if no routePath', () => {
      slugPipe.transform.and.returnValue('');
      componentListService.getComponentList.and.returnValue([
        { name: 'Foo Bar', component: DummyComponent, icon: 'test-icon' }
      ]);

      const navEvent = new NavigationEnd(1, '/', '/');
      routerEvents$.next(navEvent);

      expect(component.breadcrumb).toBe('');
      expect(component.routePath).toBe('index'); // because of default replacement logic
    });

    it('should handle empty component list without crashing', () => {
      slugPipe.transform.and.returnValue('');
      componentListService.getComponentList.and.returnValue([]);

      const navEvent = new NavigationEnd(1, '/foo', '/foo');
      routerEvents$.next(navEvent);

      expect(component.breadcrumb).toBe('');
      expect(component.routePath).toBe('foo');
    });
  });

  describe('bodyClasses', () => {
    it('should always reset body classes to app-dark', () => {
      component.routePath = '';
      component.bodyClasses();
      expect(document.body.classList.contains('app-dark')).toBeTrue();
    });

    it('should add routePath as class', () => {
      component.routePath = 'foo_bar';
      component.bodyClasses();
      expect(document.body.classList.contains('foo_bar')).toBeTrue();
    });

    it('should add mobile class when width < SCREEN_SIZES.md', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(SCREEN_SIZES.md - 1);
      component.bodyClasses();
      expect(document.body.classList.contains('screen-sm')).toBeTrue();
      expect(document.body.classList.contains('not-md')).toBeTrue();
      expect(document.body.classList.contains('screen-md')).toBeFalse();
    });

    it('should not add mobile class when width >= SCREEN_SIZES.md', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(SCREEN_SIZES.md + 100);
      component.bodyClasses();
      expect(document.body.classList.contains('screen-sm')).toBeTrue();
      expect(document.body.classList.contains('not-md')).toBeFalse();
      expect(document.body.classList.contains('screen-md')).toBeTrue();
    });
  });

  describe('toggleMenu', () => {
    it('should open menu on click', () => {
      const event = new MouseEvent('click');
      component.toggleMenu('testMenu', event);
      expect(component.openMenu).toBe('testMenu');
    });

    it('should toggle menu closed if already open', () => {
      const event = new MouseEvent('click');
      component.openMenu = 'testMenu';
      component.toggleMenu('testMenu', event);
      expect(component.openMenu).toBe('');
    });

    it('should open menu on Enter keydown', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.toggleMenu('keyboardMenu', event);
      expect(component.openMenu).toBe('keyboardMenu');
    });

    it('should not toggle menu for non-Enter keydown', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.toggleMenu('keyboardMenu', event);
      expect(component.openMenu).toBe('');
    });
  });

  describe('onResize', () => {
    it('should call bodyClasses on resize', () => {
      spyOn(component, 'bodyClasses');
      component.onResize();
      expect(component.bodyClasses).toHaveBeenCalled();
    });
  });
});

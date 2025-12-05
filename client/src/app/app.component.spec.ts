import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { UpdateService } from '@app/services/update.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { Router, NavigationEnd } from '@angular/router';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Socket } from 'ngx-socket-io';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import { ConnectivityService } from './services/connectivity.service';
import { SCREEN_SIZES } from './constants/ui.constants';

class MockConnectivityService {
  showOffline = signal(false);
  isOnline = signal(true);
  start(): Promise<void> {
    return Promise.resolve(); // no-op for tests
  }
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  let updateService: jasmine.SpyObj<UpdateService>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let slugPipe: jasmine.SpyObj<SlugPipe>;
  let routerEvents$: Subject<any>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    updateService = jasmine.createSpyObj('UpdateService', ['checkForUpdates']);
    featureFlagService = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);
    slugPipe = jasmine.createSpyObj('SlugPipe', ['transform']);

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
    it('should set routePath/breadcrumb on NavigationEnd', () => {
      component.breadcrumb = '';
      component.routePath = '';
      slugPipe.transform.calls.reset();
      // Mock slugPipe to return transformed version matching the logic
      slugPipe.transform.and.callFake((name: string) => {
        return name.toLowerCase().replace(/\s+/g, '-');
      });

      const navEvent = new NavigationEnd(1, '/features', '/features');
      routerEvents$.next(navEvent);

      expect(component.routePath).toBe('features');
      expect(component.breadcrumb).toBe('Features');
    });

    it('should clear breadcrumb if no routePath', () => {
      component.breadcrumb = '';
      component.routePath = '';
      slugPipe.transform.calls.reset();
      slugPipe.transform.and.callFake((name: string) => {
        return name.toLowerCase().replace(/\s+/g, '-');
      });

      const navEvent = new NavigationEnd(1, '/', '/');
      routerEvents$.next(navEvent);

      expect(component.breadcrumb).toBe('');
      expect(component.routePath).toBe('index');
    });

    it('should handle navigation to non-component routes', () => {
      component.breadcrumb = '';
      component.routePath = '';
      slugPipe.transform.calls.reset();
      slugPipe.transform.and.callFake((name: string) => {
        return name.toLowerCase().replace(/\s+/g, '-');
      });

      const navEvent = new NavigationEnd(1, '/some-random-route', '/some-random-route');
      routerEvents$.next(navEvent);

      expect(component.breadcrumb).toBe('');
      expect(component.routePath).toBe('some-random-route');
    });

    it('should scroll main element to top on navigation', () => {
      // Create a .main element with scrollTop > 0
      const mainElement = document.createElement('div');
      mainElement.className = 'main';
      mainElement.style.height = '100px';
      mainElement.style.overflow = 'auto';
      mainElement.innerHTML = '<div style="height: 500px;"></div>';
      document.body.appendChild(mainElement);

      // Set scroll position
      mainElement.scrollTop = 200;

      slugPipe.transform.and.callFake((name: string) => {
        return name.toLowerCase().replace(/\s+/g, '-');
      });

      const navEvent = new NavigationEnd(1, '/features', '/features');
      routerEvents$.next(navEvent);

      expect(mainElement.scrollTop).toBe(0);

      // Cleanup
      document.body.removeChild(mainElement);
    });
  });

  describe('bodyClasses', () => {
    it('should not add empty routePath as class', () => {
      component.routePath = '';
      component.bodyClasses();
      expect(document.body.classList.contains('')).toBeFalse();
      expect(document.body.classList.contains('screen-xs')).toBeTrue();
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

  describe('onResize', () => {
    it('should call bodyClasses on resize', () => {
      spyOn(component, 'bodyClasses');
      component.onResize();
      expect(component.bodyClasses).toHaveBeenCalled();
    });
  });

  describe('Feature flag getters', () => {
    it('should return showNotifications feature flag', () => {
      featureFlagService.getFeature.and.returnValue(true);
      const result = component.showNotifications();
      expect(featureFlagService.getFeature).toHaveBeenCalledWith('Notifications');
      expect(result).toBe(true);
    });

    it('should return showAppVersion feature flag', () => {
      featureFlagService.getFeature.and.returnValue(true);
      const result = component.showAppVersion();
      expect(featureFlagService.getFeature).toHaveBeenCalledWith('App Version');
      expect(result).toBe(true);
    });

    it('should return showEnvironment feature flag', () => {
      featureFlagService.getFeature.and.returnValue(false);
      const result = component.showEnvironment();
      expect(featureFlagService.getFeature).toHaveBeenCalledWith('Environment');
      expect(result).toBe(false);
    });

    it('should return showLanguage feature flag', () => {
      featureFlagService.getFeature.and.returnValue(true);
      const result = component.showLanguage();
      expect(featureFlagService.getFeature).toHaveBeenCalledWith('Language');
      expect(result).toBe(true);
    });
  });

  describe('isNarrowScreen signal', () => {
    it('should return true on narrow screens', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(SCREEN_SIZES.md - 1);
      component.onResize(); // update isNarrowScreen signal
      expect(component.isNarrowScreen()).toBeTrue();
    });

    it('should return false on wide screens', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(SCREEN_SIZES.md + 100);
      component.onResize(); // update isNarrowScreen signal
      expect(component.isNarrowScreen()).toBeFalse();
    });

    it('should update when screen width changes', () => {
      // Start narrow
      spyOnProperty(window, 'innerWidth').and.returnValue(SCREEN_SIZES.md - 1);
      component.onResize();
      expect(component.isNarrowScreen()).toBeTrue();
    });
  });
});

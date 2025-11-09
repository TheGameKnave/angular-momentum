import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { UpdateService } from '@app/services/update.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { COMPONENT_LIST } from '@app/helpers/component-list';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { Router, NavigationEnd } from '@angular/router';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Socket } from 'ngx-socket-io';
import { Subject } from 'rxjs';
import { SCREEN_SIZES } from './helpers/constants';
import { signal } from '@angular/core';
import { ConnectivityService } from './services/connectivity.service';

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

  describe('onResize', () => {
    it('should call bodyClasses on resize', () => {
      spyOn(component, 'bodyClasses');
      component.onResize();
      expect(component.bodyClasses).toHaveBeenCalled();
    });
  });
});

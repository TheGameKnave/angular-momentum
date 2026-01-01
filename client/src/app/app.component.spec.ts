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
import { Subject, EMPTY } from 'rxjs';
import { signal } from '@angular/core';
import { ConnectivityService } from './services/connectivity.service';
import { ResourcePreloadService } from './services/resource-preload.service';
import { SCREEN_SIZES } from './constants/ui.constants';
import { ChangeLogService } from './services/change-log.service';
import { UpdateDialogService } from './services/update-dialog.service';
import { DataMigrationService } from './services/data-migration.service';
import { MessageService } from 'primeng/api';
import { SocketIoService } from './services/socket.io.service';
import { AuthService } from './services/auth.service';

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
    featureFlagService.getFeature.and.returnValue(true); // Default: features enabled
    slugPipe = jasmine.createSpyObj('SlugPipe', ['transform']);

    routerEvents$ = new Subject<any>();
    router = jasmine.createSpyObj('Router', ['navigate'], { events: routerEvents$.asObservable() });

    const socketSpy = jasmine.createSpyObj('Socket', ['on', 'fromEvent', 'emit', 'disconnect', 'connect']);
    const socketIoServiceSpy = jasmine.createSpyObj('SocketIoService', ['listen', 'emit']);
    socketIoServiceSpy.listen.and.returnValue(EMPTY);

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getToken']);
    authServiceSpy.isAuthenticated.and.returnValue(false);
    authServiceSpy.getToken.and.returnValue(Promise.resolve(null));

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
        { provide: SocketIoService, useValue: socketIoServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ConnectivityService, useClass: MockConnectivityService },
        { provide: ResourcePreloadService, useValue: jasmine.createSpyObj('ResourcePreloadService', ['preloadAll']) },
        MessageService,
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

    it('should clear breadcrumb when navigating from component to root', () => {
      // Start on a component page with breadcrumb set
      component.breadcrumb = 'Features';
      component.routePath = 'features';
      slugPipe.transform.calls.reset();
      slugPipe.transform.and.callFake((name: string) => {
        return name.toLowerCase().replace(/\s+/g, '-');
      });

      // Navigate to root
      const navEvent = new NavigationEnd(1, '/', '/');
      routerEvents$.next(navEvent);

      // Breadcrumb should be cleared (no component matches 'index')
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

    it('should preserve viewport-ready class when updating route classes', () => {
      document.body.classList.add('viewport-ready');
      component.routePath = 'test-route';
      component.bodyClasses();
      expect(document.body.classList.contains('viewport-ready')).toBeTrue();
      expect(document.body.classList.contains('test-route')).toBeTrue();
    });

    it('should preserve app- prefixed classes when updating route classes', () => {
      document.body.classList.add('app-theme-dark');
      component.routePath = 'new-route';
      component.bodyClasses();
      expect(document.body.classList.contains('app-theme-dark')).toBeTrue();
      expect(document.body.classList.contains('new-route')).toBeTrue();
    });

    it('should remove old route class when route changes', () => {
      component.routePath = 'old-route';
      component.bodyClasses();
      expect(document.body.classList.contains('old-route')).toBeTrue();

      component.routePath = 'new-route';
      component.bodyClasses();
      expect(document.body.classList.contains('old-route')).toBeFalse();
      expect(document.body.classList.contains('new-route')).toBeTrue();
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

  describe('onKeyDown dev shortcuts', () => {
    let changeLogService: ChangeLogService;
    let updateDialogService: UpdateDialogService;
    let dataMigrationService: DataMigrationService;

    beforeEach(() => {
      changeLogService = TestBed.inject(ChangeLogService);
      updateDialogService = TestBed.inject(UpdateDialogService);
      dataMigrationService = TestBed.inject(DataMigrationService);
    });

    it('should ignore non-dev mode', () => {
      component.isDevMode = false;
      const event = new KeyboardEvent('keydown', { key: 'U', ctrlKey: true, shiftKey: true });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should ignore without ctrl key', () => {
      component.isDevMode = true;
      const event = new KeyboardEvent('keydown', { key: 'U', ctrlKey: false, shiftKey: true });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should ignore without shift key', () => {
      component.isDevMode = true;
      const event = new KeyboardEvent('keydown', { key: 'U', ctrlKey: true, shiftKey: false });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should trigger update dialog on Ctrl+Shift+U', () => {
      component.isDevMode = true;
      const event = new KeyboardEvent('keydown', { key: 'U', ctrlKey: true, shiftKey: true });
      spyOn(event, 'preventDefault');
      spyOn(updateDialogService, 'show').and.returnValue(Promise.resolve(false));
      spyOn(console, 'log');

      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(changeLogService.devVersionOverride()).toBe('0.0.0');
      expect(updateDialogService.show).toHaveBeenCalled();
    });

    it('should ignore other keys', () => {
      component.isDevMode = true;
      const event = new KeyboardEvent('keydown', { key: 'X', ctrlKey: true, shiftKey: true });
      spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});

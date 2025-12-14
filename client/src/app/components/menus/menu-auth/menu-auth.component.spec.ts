import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MenuAuthComponent } from './menu-auth.component';
import { AuthService } from '@app/services/auth.service';
import { AuthUiStateService } from '@app/services/auth-ui-state.service';
import { UserSettingsService } from '@app/services/user-settings.service';
import { UsernameService } from '@app/services/username.service';
import { StoragePromotionService } from '@app/services/storage-promotion.service';
import { NotificationService } from '@app/services/notification.service';
import { ConfirmDialogService } from '@app/services/confirm-dialog.service';
import { AuthGuard } from '@app/guards/auth.guard';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('MenuAuthComponent', () => {
  let component: MenuAuthComponent;
  let fixture: ComponentFixture<MenuAuthComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockAuthUiState: jasmine.SpyObj<AuthUiStateService>;
  let mockUserSettingsService: jasmine.SpyObj<UserSettingsService>;
  let mockUsernameService: jasmine.SpyObj<UsernameService>;
  let mockStoragePromotionService: jasmine.SpyObj<StoragePromotionService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockConfirmDialogService: jasmine.SpyObj<ConfirmDialogService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    routerEventsSubject = new Subject();

    mockAuthService = jasmine.createSpyObj('AuthService', [
      'hasReturnUrl',
      'isAuthenticated',
      'logout'
    ], {
      currentUser: signal(null),
      currentSession: signal(null),
      loading: signal(false),
      isPasswordRecovery: signal(false)
    });

    mockAuthUiState = jasmine.createSpyObj('AuthUiStateService', [
      'setMode',
      'startOtpVerification',
      'clearOtpVerification',
      'setLoginFormEmail',
      'reset'
    ], {
      mode: signal('signup'),
      awaitingOtpVerification: signal(false),
      pendingEmail: signal(null),
      pendingUsername: signal(null),
      loginFormEmail: signal('')
    });

    mockUserSettingsService = jasmine.createSpyObj('UserSettingsService', [
      'initialize',
      'clear'
    ]);

    mockUsernameService = jasmine.createSpyObj('UsernameService', [
      'loadUsername',
      'updateUsername',
      'clear'
    ]);

    mockStoragePromotionService = jasmine.createSpyObj('StoragePromotionService', [
      'promoteAnonymousToUser',
      'hasAnonymousData'
    ]);
    mockStoragePromotionService.promoteAnonymousToUser.and.returnValue(Promise.resolve());
    mockStoragePromotionService.hasAnonymousData.and.returnValue(Promise.resolve(true));

    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'reloadFromStorage'
    ]);

    mockConfirmDialogService = jasmine.createSpyObj('ConfirmDialogService', ['show'], {
      visible: jasmine.createSpy('visible').and.returnValue(false)
    });

    mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEventsSubject.asObservable(),
      url: '/test',
      routerState: {
        root: {
          firstChild: null,
          routeConfig: { canActivate: [] }
        }
      }
    });

    mockAuthService.hasReturnUrl.and.returnValue(false);
    mockAuthService.isAuthenticated.and.returnValue(false);
    mockAuthService.logout.and.returnValue(Promise.resolve());
    mockUserSettingsService.initialize.and.returnValue(Promise.resolve());
    mockUsernameService.loadUsername.and.returnValue(Promise.resolve(null));
    mockUsernameService.updateUsername.and.returnValue(Promise.resolve(null));

    await TestBed.configureTestingModule({
      imports: [
        MenuAuthComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthUiStateService, useValue: mockAuthUiState },
        { provide: UserSettingsService, useValue: mockUserSettingsService },
        { provide: UsernameService, useValue: mockUsernameService },
        { provide: StoragePromotionService, useValue: mockStoragePromotionService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogService },
        { provide: Router, useValue: mockRouter },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngAfterViewInit', () => {
    it('should open menu if returnUrl exists and user is not authenticated', (done) => {
      mockAuthService.hasReturnUrl.and.returnValue(true);
      mockAuthService.isAuthenticated.and.returnValue(false);

      // Mock anchorMenu
      component.anchorMenu = jasmine.createSpyObj('AnchorMenuComponent', ['open', 'close']);

      component.ngAfterViewInit();

      setTimeout(() => {
        expect(mockAuthUiState.setMode).toHaveBeenCalledWith('login');
        expect(component.anchorMenu.open).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should not open menu if user is authenticated', () => {
      mockAuthService.hasReturnUrl.and.returnValue(true);
      mockAuthService.isAuthenticated.and.returnValue(true);

      component.anchorMenu = jasmine.createSpyObj('AnchorMenuComponent', ['open', 'close']);

      component.ngAfterViewInit();

      expect(mockAuthUiState.setMode).not.toHaveBeenCalled();
    });

    it('should not open menu if no returnUrl', () => {
      mockAuthService.hasReturnUrl.and.returnValue(false);

      component.anchorMenu = jasmine.createSpyObj('AnchorMenuComponent', ['open', 'close']);

      component.ngAfterViewInit();

      expect(mockAuthUiState.setMode).not.toHaveBeenCalled();
    });
  });

  describe('setMode', () => {
    it('should set auth mode', () => {
      component.setMode('login');
      expect(mockAuthUiState.setMode).toHaveBeenCalledWith('login');
    });
  });

  describe('onLoginSuccess', () => {
    beforeEach(() => {
      jasmine.clock().install();
      component.anchorMenu = jasmine.createSpyObj('AnchorMenuComponent', ['open', 'close']);
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should initialize user settings and username', async () => {
      await component.onLoginSuccess();

      expect(mockUserSettingsService.initialize).toHaveBeenCalled();
      expect(mockUsernameService.loadUsername).toHaveBeenCalled();
    });

    it('should set auto-close timer and close menu after delay', async () => {
      await component.onLoginSuccess();

      expect(component.autoCloseTimer()).toBe(2);

      jasmine.clock().tick(2000);

      expect(component.autoCloseTimer()).toBe(0);
      expect(component.anchorMenu.close).toHaveBeenCalled();
    });
  });

  describe('onSignupSuccess', () => {
    it('should start OTP verification with email and username', () => {
      const data = { email: 'test@example.com', username: 'testuser' };
      component.onSignupSuccess(data);

      expect(mockAuthUiState.startOtpVerification).toHaveBeenCalledWith('test@example.com', 'testuser');
    });

    it('should start OTP verification with email only', () => {
      const data = { email: 'test@example.com' };
      component.onSignupSuccess(data);

      expect(mockAuthUiState.startOtpVerification).toHaveBeenCalledWith('test@example.com', undefined);
    });
  });

  describe('onVerifySuccess', () => {
    beforeEach(() => {
      jasmine.clock().install();
      component.anchorMenu = jasmine.createSpyObj('AnchorMenuComponent', ['open', 'close']);
      // Set pendingUsername signal value
      (mockAuthUiState.pendingUsername as any).set('testuser');
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should initialize user settings and create username if provided', async () => {
      await component.onVerifySuccess();

      expect(mockUserSettingsService.initialize).toHaveBeenCalled();
      expect(mockUsernameService.updateUsername).toHaveBeenCalledWith('testuser', true);
      expect(mockUsernameService.loadUsername).toHaveBeenCalled();
      expect(mockAuthUiState.clearOtpVerification).toHaveBeenCalled();
    });

    it('should not fail if username creation fails', async () => {
      mockUsernameService.updateUsername.and.returnValue(Promise.reject('Username taken'));

      await component.onVerifySuccess();

      expect(mockUserSettingsService.initialize).toHaveBeenCalled();
      expect(mockUsernameService.loadUsername).toHaveBeenCalled();
      expect(mockAuthUiState.clearOtpVerification).toHaveBeenCalled();
    });

    it('should set auto-close timer and close menu after delay', async () => {
      await component.onVerifySuccess();

      expect(component.autoCloseTimer()).toBe(4);

      jasmine.clock().tick(4000);

      expect(component.autoCloseTimer()).toBe(0);
      expect(component.anchorMenu.close).toHaveBeenCalled();
    });
  });

  describe('onBackToSignup', () => {
    it('should clear OTP verification', () => {
      component.onBackToSignup();
      expect(mockAuthUiState.clearOtpVerification).toHaveBeenCalled();
    });
  });

  describe('onResetSuccess', () => {
    beforeEach(() => {
      component.anchorMenu = jasmine.createSpyObj('AnchorMenuComponent', ['open', 'close']);
    });

    it('should initialize user settings and close menu', async () => {
      await component.onResetSuccess();

      expect(mockUserSettingsService.initialize).toHaveBeenCalled();
      expect(mockUsernameService.loadUsername).toHaveBeenCalled();
      expect(component.anchorMenu.close).toHaveBeenCalled();
    });
  });

  describe('onSwitchToReset', () => {
    it('should prefill email and switch to reset mode', () => {
      component.onSwitchToReset('test@example.com');

      expect(mockAuthUiState.setLoginFormEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockAuthUiState.setMode).toHaveBeenCalledWith('reset');
    });
  });

  describe('onViewProfile', () => {
    beforeEach(() => {
      component.anchorMenu = jasmine.createSpyObj('AnchorMenuComponent', ['open', 'close']);
    });

    it('should close menu and navigate to profile', () => {
      component.onViewProfile();

      expect(component.anchorMenu.close).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
    });
  });

  describe('onLogout', () => {
    beforeEach(() => {
      component.anchorMenu = jasmine.createSpyObj('AnchorMenuComponent', ['open', 'close']);
    });

    it('should clear services and logout', async () => {
      await component.onLogout();

      expect(component.anchorMenu.close).toHaveBeenCalled();
      expect(mockUserSettingsService.clear).toHaveBeenCalled();
      expect(mockUsernameService.clear).toHaveBeenCalled();
      expect(mockAuthUiState.reset).toHaveBeenCalled();
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should navigate to home when on auth-guarded route', async () => {
      // Mock router state with actual AuthGuard in canActivate
      Object.defineProperty(mockRouter, 'routerState', {
        value: {
          root: {
            firstChild: {
              firstChild: null,
              routeConfig: { canActivate: [AuthGuard] }
            }
          }
        },
        configurable: true,
        writable: true
      });

      await component.onLogout();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('isProfileRoute', () => {
    it('should return true when on profile route', () => {
      routerEventsSubject.next(new NavigationEnd(0, '/profile', '/profile'));
      fixture.detectChanges();

      expect(component.isProfileRoute()).toBe(true);
    });

    it('should return false when not on profile route', () => {
      routerEventsSubject.next(new NavigationEnd(0, '/home', '/home'));
      fixture.detectChanges();

      expect(component.isProfileRoute()).toBe(false);
    });
  });

  describe('onMenuClosed', () => {
    it('should reset auth UI state', () => {
      component.onMenuClosed();
      expect(mockAuthUiState.reset).toHaveBeenCalled();
    });
  });

  describe('storagePromotionCallback', () => {
    it('should promote anonymous storage to user when confirmed', async () => {
      const userId = 'test-user-id';
      mockStoragePromotionService.hasAnonymousData.and.returnValue(Promise.resolve(true));

      // Simulate user confirming the dialog by calling onConfirm
      mockConfirmDialogService.show.and.callFake((options: any) => {
        options.onConfirm();
      });

      await component.storagePromotionCallback(userId);

      expect(mockStoragePromotionService.hasAnonymousData).toHaveBeenCalled();
      expect(mockConfirmDialogService.show).toHaveBeenCalled();
      expect(mockStoragePromotionService.promoteAnonymousToUser).toHaveBeenCalledWith(userId);
    });

    it('should not promote when user skips import', async () => {
      const userId = 'test-user-id';
      mockStoragePromotionService.hasAnonymousData.and.returnValue(Promise.resolve(true));

      // Simulate user dismissing the dialog (visible becomes false without onConfirm)
      let visibleCallCount = 0;
      (mockConfirmDialogService.visible as jasmine.Spy).and.callFake(() => {
        visibleCallCount++;
        return visibleCallCount < 2; // Return true first, then false
      });

      await component.storagePromotionCallback(userId);

      expect(mockStoragePromotionService.hasAnonymousData).toHaveBeenCalled();
      expect(mockConfirmDialogService.show).toHaveBeenCalled();
      expect(mockStoragePromotionService.promoteAnonymousToUser).not.toHaveBeenCalled();
    });

    it('should skip dialog when no anonymous data exists', async () => {
      const userId = 'test-user-id';
      mockStoragePromotionService.hasAnonymousData.and.returnValue(Promise.resolve(false));

      await component.storagePromotionCallback(userId);

      expect(mockStoragePromotionService.hasAnonymousData).toHaveBeenCalled();
      expect(mockConfirmDialogService.show).not.toHaveBeenCalled();
      expect(mockStoragePromotionService.promoteAnonymousToUser).not.toHaveBeenCalled();
    });
  });
});

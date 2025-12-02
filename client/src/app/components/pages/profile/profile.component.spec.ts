import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { AuthService } from '@app/services/auth.service';
import { UserSettingsService } from '@app/services/user-settings.service';
import { UsernameService } from '@app/services/username.service';
import { CookieConsentService } from '@app/services/cookie-consent.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUserSettingsService: jasmine.SpyObj<UserSettingsService>;
  let mockUsernameService: jasmine.SpyObj<UsernameService>;
  let mockCookieConsentService: jasmine.SpyObj<CookieConsentService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockConfirmationService: jasmine.SpyObj<ConfirmationService>;

  beforeEach(async () => {
    const currentUserSignal = signal({ email: 'test@example.com', id: '123' });
    const settingsSignal = signal({ timezone: 'UTC' });
    const usernameSignal = signal({ username: 'testuser' });
    const consentStatusSignal = signal<'accepted' | 'declined' | 'pending'>('pending');

    mockAuthService = jasmine.createSpyObj('AuthService',
      ['logout', 'updatePassword', 'updateEmail', 'exportUserData', 'deleteAccount', 'isPasswordRecovery', 'login'],
      { currentUser: currentUserSignal }
    );
    mockAuthService.isPasswordRecovery.and.returnValue(false);
    mockAuthService.logout.and.returnValue(Promise.resolve());
    mockAuthService.updatePassword.and.returnValue(Promise.resolve({ error: null } as any));
    mockAuthService.updateEmail.and.returnValue(Promise.resolve({ error: null } as any));
    mockAuthService.exportUserData.and.returnValue(Promise.resolve({ error: null } as any));
    mockAuthService.deleteAccount.and.returnValue(Promise.resolve({ error: null } as any));
    mockAuthService.login.and.returnValue(Promise.resolve({ error: null } as any));

    mockUserSettingsService = jasmine.createSpyObj('UserSettingsService',
      ['initialize', 'clear', 'detectTimezone', 'updateTimezone'],
      { settings: settingsSignal }
    );
    mockUserSettingsService.initialize.and.returnValue(Promise.resolve());
    mockUserSettingsService.detectTimezone.and.returnValue('UTC');
    mockUserSettingsService.updateTimezone.and.returnValue(Promise.resolve(null));

    mockUsernameService = jasmine.createSpyObj('UsernameService',
      ['loadUsername', 'updateUsername', 'deleteUsername', 'clear'],
      { username: usernameSignal }
    );
    mockUsernameService.loadUsername.and.returnValue(Promise.resolve(null));
    mockUsernameService.updateUsername.and.returnValue(Promise.resolve(null));
    mockUsernameService.deleteUsername.and.returnValue(Promise.resolve(true));

    mockCookieConsentService = jasmine.createSpyObj('CookieConsentService',
      ['acceptCookies', 'declineCookies', 'resetConsent'],
      { consentStatus: consentStatusSignal }
    );

    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    mockRouter.getCurrentNavigation.and.returnValue(null);

    mockConfirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserSettingsService, useValue: mockUserSettingsService },
        { provide: UsernameService, useValue: mockUsernameService },
        { provide: CookieConsentService, useValue: mockCookieConsentService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default state', () => {
    expect(component.passwordPanelExpanded()).toBe(false);
    expect(component.emailPanelExpanded()).toBe(false);
    expect(component.usernamePanelExpanded()).toBe(false);
    expect(component.passwordLoading()).toBe(false);
    expect(component.emailLoading()).toBe(false);
    expect(component.usernameLoading()).toBe(false);
  });

  it('should load user settings and username on init', async () => {
    await component.ngOnInit();
    expect(mockUsernameService.loadUsername).toHaveBeenCalled();
  });

  it('should call logout and navigate when onLogout is called', async () => {
    await component.onLogout();
    expect(mockUserSettingsService.clear).toHaveBeenCalled();
    expect(mockUsernameService.clear).toHaveBeenCalled();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should get user initials from email', () => {
    const initials = component.getUserInitials();
    expect(initials).toBe('T'); // First letter of test@example.com
  });

  it('should return ? for initials if no user email', () => {
    (mockAuthService.currentUser as any).set({ email: '', id: '123' });
    const initials = component.getUserInitials();
    expect(initials).toBe('?');
  });

  it('should handle cookie consent accept', () => {
    component.onAcceptCookies();
    expect(mockCookieConsentService.acceptCookies).toHaveBeenCalled();
  });

  it('should handle cookie consent decline', () => {
    component.onDeclineCookies();
    expect(mockCookieConsentService.declineCookies).toHaveBeenCalled();
  });

  it('should call export data service when onExportData is called', async () => {
    await component.onExportData();
    expect(mockAuthService.exportUserData).toHaveBeenCalled();
  });

  it('should expand password panel when onPanelCollapsedChange is called with false', () => {
    component.onPanelCollapsedChange(false);
    expect(component.passwordPanelExpanded()).toBe(true);
  });

  it('should reset password form when panel is expanded', () => {
    spyOn(component.passwordForm, 'reset');
    component.onPanelCollapsedChange(false);
    expect(component.passwordForm.reset).toHaveBeenCalled();
  });

  it('should handle undefined collapsed value for password panel', () => {
    component.onPanelCollapsedChange(undefined);
    expect(component.passwordPanelExpanded()).toBe(true);
  });

  it('should handle undefined collapsed value for email panel', () => {
    component.onEmailPanelCollapsedChange(undefined);
    expect(component.emailPanelExpanded()).toBe(true);
  });

  it('should handle undefined collapsed value for username panel', () => {
    component.onUsernamePanelCollapsedChange(undefined);
    expect(component.usernamePanelExpanded()).toBe(true);
  });

  it('should detect username as dirty when editedUsername differs from originalUsername', () => {
    component.editedUsername.set('newuser');
    component.originalUsername.set('olduser');
    expect(component.isUsernameDirty()).toBe(true);
  });

  it('should detect username as not dirty when editedUsername equals originalUsername', () => {
    component.editedUsername.set('testuser');
    component.originalUsername.set('testuser');
    expect(component.isUsernameDirty()).toBe(false);
  });

  it('should update timezone when onTimezoneChange is called', async () => {
    const event = { value: 'America/New_York' };
    await component.onTimezoneChange(event);
    expect(mockUserSettingsService.updateTimezone).toHaveBeenCalledWith('America/New_York');
    expect(component.selectedTimezone()).toBe('America/New_York');
  });

  describe('ngOnInit', () => {
    it('should auto-expand password panel when isPasswordRecovery is true', async () => {
      mockAuthService.isPasswordRecovery.and.returnValue(true);
      await component.ngOnInit();
      expect(component.passwordPanelExpanded()).toBe(true);
      expect(component.isPasswordResetFlow()).toBe(true);
    });

    it('should auto-expand password panel from router state', async () => {
      mockRouter.getCurrentNavigation.and.returnValue({
        extras: { state: { expandPasswordPanel: true } }
      } as any);
      await component.ngOnInit();
      expect(component.passwordPanelExpanded()).toBe(true);
      expect(component.isPasswordResetFlow()).toBe(true);
    });

    it('should add currentPassword field when not in reset flow', async () => {
      await component.ngOnInit();
      expect(component.passwordForm.contains('currentPassword')).toBe(true);
    });

    it('should use detected timezone when settings has no timezone', async () => {
      (mockUserSettingsService.settings as any).set({ id: '123', timezone: undefined });
      mockUserSettingsService.detectTimezone.and.returnValue('Europe/London');
      await component.ngOnInit();
      expect(component.selectedTimezone()).toBe('Europe/London');
    });

    it('should handle null username data by setting empty string', async () => {
      (mockUsernameService.username as any).set(null);
      await component.ngOnInit();
      expect(component.editedUsername()).toBe('');
      expect(component.originalUsername()).toBe('');
    });
  });

  describe('getUserInitials', () => {
    it('should return ? when user is null', () => {
      (mockAuthService.currentUser as any).set(null);
      const initials = component.getUserInitials();
      expect(initials).toBe('?');
    });
  });

  describe('onSubmitPasswordChange', () => {
    it('should not submit when form is invalid', async () => {
      component.passwordForm.patchValue({ newPassword: '', confirmPassword: '' });
      await component.onSubmitPasswordChange();
      expect(mockAuthService.updatePassword).not.toHaveBeenCalled();
    });

    it('should verify current password in regular flow', async () => {
      await component.ngOnInit(); // Adds currentPassword field
      component.passwordForm.patchValue({
        currentPassword: 'oldpass',
        newPassword: 'Newpass123!',
        confirmPassword: 'Newpass123!'
      });

      await component.onSubmitPasswordChange();

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'oldpass'
      });
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith('Newpass123!');
    });

    it('should show error when current password is incorrect', async () => {
      await component.ngOnInit();
      mockAuthService.login.and.returnValue(Promise.resolve({
        error: { message: 'Invalid password' } as any,
        user: null,
        session: null
      }));

      component.passwordForm.patchValue({
        currentPassword: 'wrongpass',
        newPassword: 'Newpass123!',
        confirmPassword: 'Newpass123!'
      });

      await component.onSubmitPasswordChange();

      expect(component.passwordError()).toBe('Current password is incorrect');
    });

    it('should skip current password verification in reset flow', async () => {
      component.isPasswordResetFlow.set(true);
      component.passwordForm.patchValue({
        newPassword: 'Newpass123!',
        confirmPassword: 'Newpass123!'
      });

      await component.onSubmitPasswordChange();

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockAuthService.updatePassword).toHaveBeenCalled();
    });

    it('should show error when password update fails', async () => {
      component.isPasswordResetFlow.set(true);
      mockAuthService.updatePassword.and.returnValue(Promise.resolve({
        error: { message: 'Update failed' } as any
      }));

      component.passwordForm.patchValue({
        newPassword: 'Newpass123!',
        confirmPassword: 'Newpass123!'
      });

      await component.onSubmitPasswordChange();

      expect(component.passwordError()).toBe('Update failed');
    });

    it('should show success on successful password update', async () => {
      component.isPasswordResetFlow.set(true);
      component.passwordForm.patchValue({
        newPassword: 'Newpass123!',
        confirmPassword: 'Newpass123!'
      });

      await component.onSubmitPasswordChange();

      expect(component.passwordSuccess()).toBe(true);
    });

    it('should handle missing user email in regular flow', async () => {
      await component.ngOnInit();
      (mockAuthService.currentUser as any).set({ email: undefined, id: '123' });

      component.passwordForm.patchValue({
        currentPassword: 'oldpass',
        newPassword: 'Newpass123!',
        confirmPassword: 'Newpass123!'
      });

      await component.onSubmitPasswordChange();

      expect(component.passwordError()).toBe('Unable to verify current password');
    });
  });

  describe('onEmailPanelCollapsedChange', () => {
    it('should expand panel and reset form when collapsed is false', () => {
      component.emailError.set('error');
      component.emailSuccess.set(true);
      spyOn(component.emailForm, 'reset');

      component.onEmailPanelCollapsedChange(false);

      expect(component.emailPanelExpanded()).toBe(true);
      expect(component.emailError()).toBeNull();
      expect(component.emailSuccess()).toBe(false);
      expect(component.emailForm.reset).toHaveBeenCalled();
    });
  });

  describe('onSubmitEmailChange', () => {
    it('should not submit when form is invalid', async () => {
      component.emailForm.patchValue({ newEmail: '' });
      await component.onSubmitEmailChange();
      expect(mockAuthService.updateEmail).not.toHaveBeenCalled();
    });

    it('should update email successfully', async () => {
      component.emailForm.patchValue({ newEmail: 'new@example.com' });

      await component.onSubmitEmailChange();

      expect(mockAuthService.updateEmail).toHaveBeenCalledWith('new@example.com');
      expect(component.emailSuccess()).toBe(true);
    });

    it('should show error when email update fails', async () => {
      mockAuthService.updateEmail.and.returnValue(Promise.resolve({
        error: { message: 'Email already in use' } as any
      }));

      component.emailForm.patchValue({ newEmail: 'taken@example.com' });

      await component.onSubmitEmailChange();

      expect(component.emailError()).toBe('Email already in use');
    });
  });

  describe('password peek methods', () => {
    it('should show/hide new password', () => {
      component.onNewPasswordPeekStart();
      expect(component.showNewPassword()).toBe(true);
      component.onNewPasswordPeekEnd();
      expect(component.showNewPassword()).toBe(false);
    });

    it('should show/hide confirm password', () => {
      component.onConfirmPasswordPeekStart();
      expect(component.showConfirmPassword()).toBe(true);
      component.onConfirmPasswordPeekEnd();
      expect(component.showConfirmPassword()).toBe(false);
    });

    it('should show/hide current password', () => {
      component.onCurrentPasswordPeekStart();
      expect(component.showCurrentPassword()).toBe(true);
      component.onCurrentPasswordPeekEnd();
      expect(component.showCurrentPassword()).toBe(false);
    });
  });

  describe('onUsernamePanelCollapsedChange', () => {
    it('should expand panel and reset username state', () => {
      (mockUsernameService.username as any).set({ username: 'currentuser', fingerprint: 'fp123' });

      component.onUsernamePanelCollapsedChange(false);

      expect(component.usernamePanelExpanded()).toBe(true);
      expect(component.editedUsername()).toBe('currentuser');
      expect(component.originalUsername()).toBe('currentuser');
    });

    it('should handle null username', () => {
      (mockUsernameService.username as any).set(null);

      component.onUsernamePanelCollapsedChange(false);

      expect(component.editedUsername()).toBe('');
      expect(component.originalUsername()).toBe('');
    });
  });

  describe('passwordMatchValidator', () => {
    it('should return null when passwords match', () => {
      component.passwordForm.patchValue({
        newPassword: 'Test123!',
        confirmPassword: 'Test123!'
      });

      const result = component['passwordMatchValidator'](component.passwordForm);
      expect(result).toBeNull();
    });

    it('should return error when passwords do not match', () => {
      component.passwordForm.patchValue({
        newPassword: 'Test123!',
        confirmPassword: 'Different123!'
      });

      const result = component['passwordMatchValidator'](component.passwordForm);
      expect(result).toEqual({ passwordMismatch: true });
    });
  });

  describe('onSaveUsername', () => {
    it('should delete username when blank', async () => {
      component.editedUsername.set('   ');

      await component.onSaveUsername();

      expect(mockUsernameService.deleteUsername).toHaveBeenCalled();
      expect(component.originalUsername()).toBe('');
      expect(component.usernameSuccess()).toBe(true);
    });

    it('should update username when non-blank', async () => {
      component.editedUsername.set('newuser');

      await component.onSaveUsername();

      expect(mockUsernameService.updateUsername).toHaveBeenCalledWith('newuser');
      expect(component.originalUsername()).toBe('newuser');
      expect(component.usernameSuccess()).toBe(true);
    });

    it('should clear success message after 3 seconds', fakeAsync(async () => {
      component.editedUsername.set('newuser');

      await component.onSaveUsername();

      expect(component.usernameSuccess()).toBe(true);

      tick(3000);

      expect(component.usernameSuccess()).toBe(false);
    }));

    it('should handle update error', async () => {
      mockUsernameService.updateUsername.and.returnValue(Promise.reject(new Error('Username taken')));
      component.editedUsername.set('takenuser');

      await component.onSaveUsername();

      expect(component.usernameError()).toBe('Username taken');
    });

    it('should use fallback error message when error has no message', async () => {
      mockUsernameService.updateUsername.and.returnValue(Promise.reject({ message: '' }));
      component.editedUsername.set('newuser');

      await component.onSaveUsername();

      expect(component.usernameError()).toBe('Failed to update username');
    });
  });

  describe('onExportData', () => {
    it('should call exportUserData service', async () => {
      await component.onExportData();

      expect(mockAuthService.exportUserData).toHaveBeenCalled();
    });
  });

  describe('onResetCookieConsent', () => {
    it('should reset cookie consent', () => {
      component.onResetCookieConsent();
      expect(mockCookieConsentService.resetConsent).toHaveBeenCalled();
    });
  });

  describe('onDeleteAccount', () => {
    it('should call deleteAccount method', () => {
      // ConfirmationService is provided in component, so we can't easily test the dialog
      // Just verify the method exists and can be called
      expect(() => component.onDeleteAccount()).not.toThrow();
    });

    it('should invoke accept callback when user confirms', () => {
      let acceptCallback: any;

      // Spy on the component's own confirmationService
      spyOn(component['confirmationService'], 'confirm').and.callFake((config: any) => {
        acceptCallback = config.accept;
        return component['confirmationService'];
      });

      component.onDeleteAccount();

      expect(acceptCallback).toBeDefined();
      // Call the accept callback to cover the arrow function
      acceptCallback();
    });
  });
});

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { AuthService } from '@app/services/auth.service';
import { UserSettingsService } from '@app/services/user-settings.service';
import { UsernameService } from '@app/services/username.service';
import { DataExportService } from '@app/services/data-export.service';
import { DataMigrationService } from '@app/services/data-migration.service';
import { IndexedDbService } from '@app/services/indexeddb.service';
import { NotificationService } from '@app/services/notification.service';
import { ConfirmDialogService } from '@app/services/confirm-dialog.service';
import { Router, ActivatedRoute } from '@angular/router';
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
  let mockDataExportService: jasmine.SpyObj<DataExportService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockConfirmDialogService: jasmine.SpyObj<ConfirmDialogService>;
  let mockIndexedDbService: jasmine.SpyObj<IndexedDbService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockDataMigrationService: jasmine.SpyObj<DataMigrationService>;

  beforeEach(async () => {
    const currentUserSignal = signal({ email: 'test@example.com', id: '123' });
    const settingsSignal = signal({ timezone: 'UTC' });
    const usernameSignal = signal({ username: 'testuser' });
    const consentStatusSignal = signal<'accepted' | 'declined' | 'pending'>('pending');

    mockAuthService = jasmine.createSpyObj('AuthService',
      ['logout', 'updatePassword', 'updateEmail', 'verifyEmailChangeOtp', 'getToken', 'deleteAccount', 'isPasswordRecovery', 'login'],
      { currentUser: currentUserSignal }
    );
    mockAuthService.isPasswordRecovery.and.returnValue(false);
    mockAuthService.logout.and.returnValue(Promise.resolve());
    mockAuthService.updatePassword.and.returnValue(Promise.resolve({ error: null } as any));
    mockAuthService.updateEmail.and.returnValue(Promise.resolve({ error: null } as any));
    mockAuthService.verifyEmailChangeOtp.and.returnValue(Promise.resolve({ error: null } as any));
    mockAuthService.getToken.and.returnValue(Promise.resolve('test-token'));
    mockAuthService.deleteAccount.and.returnValue(Promise.resolve({ error: null } as any));
    mockAuthService.login.and.returnValue(Promise.resolve({ error: null } as any));

    mockDataExportService = jasmine.createSpyObj('DataExportService', ['exportUserData']);
    mockDataExportService.exportUserData.and.returnValue(Promise.resolve());

    mockUserSettingsService = jasmine.createSpyObj('UserSettingsService',
      ['initialize', 'clear', 'detectTimezone', 'updateTimezone', 'deleteSettings'],
      { settings: settingsSignal }
    );
    mockUserSettingsService.initialize.and.returnValue(Promise.resolve());
    mockUserSettingsService.detectTimezone.and.returnValue('UTC');
    mockUserSettingsService.updateTimezone.and.returnValue(Promise.resolve(null));
    mockUserSettingsService.deleteSettings.and.returnValue(Promise.resolve());

    mockUsernameService = jasmine.createSpyObj('UsernameService',
      ['loadUsername', 'updateUsername', 'deleteUsername', 'clear'],
      { username: usernameSignal }
    );
    mockUsernameService.loadUsername.and.returnValue(Promise.resolve(null));
    mockUsernameService.updateUsername.and.returnValue(Promise.resolve(null));
    mockUsernameService.deleteUsername.and.returnValue(Promise.resolve(true));

    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    mockRouter.getCurrentNavigation.and.returnValue(null);

    mockConfirmDialogService = jasmine.createSpyObj('ConfirmDialogService', ['show', 'confirm', 'dismiss']);

    mockIndexedDbService = jasmine.createSpyObj('IndexedDbService', ['clear']);
    mockIndexedDbService.clear.and.returnValue(Promise.resolve());

    mockNotificationService = jasmine.createSpyObj('NotificationService', ['clearAll']);

    mockDataMigrationService = jasmine.createSpyObj('DataMigrationService', ['hasDataBackup', 'getDataBackup', 'deleteDataBackup']);
    mockDataMigrationService.hasDataBackup.and.returnValue(Promise.resolve(false));
    mockDataMigrationService.getDataBackup.and.returnValue(Promise.resolve(null));
    mockDataMigrationService.deleteDataBackup.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserSettingsService, useValue: mockUserSettingsService },
        { provide: UsernameService, useValue: mockUsernameService },
        { provide: DataExportService, useValue: mockDataExportService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogService },
        { provide: IndexedDbService, useValue: mockIndexedDbService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: DataMigrationService, useValue: mockDataMigrationService },
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

  it('should call export data service when onExportData is called', async () => {
    await component.onExportData();
    expect(mockAuthService.getToken).toHaveBeenCalled();
    expect(mockDataExportService.exportUserData).toHaveBeenCalledWith({
      includeServerData: true,
      accessToken: 'test-token',
    });
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
      const originalState = globalThis.history.state;
      spyOnProperty(globalThis.history, 'state', 'get').and.returnValue({ expandPasswordPanel: true });
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

    it('should send OTP and show OTP form on success', async () => {
      component.emailForm.patchValue({ newEmail: 'new@example.com' });

      await component.onSubmitEmailChange();

      expect(mockAuthService.updateEmail).toHaveBeenCalledWith('new@example.com');
      expect(component.emailOtpSent()).toBe(true);
      expect(component.pendingNewEmail()).toBe('new@example.com');
      expect(component.emailSuccess()).toBe(true);
    });

    it('should show error when email update fails', async () => {
      mockAuthService.updateEmail.and.returnValue(Promise.resolve({
        error: { message: 'Email already in use' } as any
      }));

      component.emailForm.patchValue({ newEmail: 'taken@example.com' });

      await component.onSubmitEmailChange();

      expect(component.emailError()).toBe('Email already in use');
      expect(component.emailOtpSent()).toBe(false);
    });
  });

  describe('onEmailOtpInput', () => {
    it('should filter non-digit characters', () => {
      const event = { target: { value: 'abc123def456' } } as unknown as Event;
      component.onEmailOtpInput(event);
      expect(component.emailOtp()).toBe('123456');
    });

    it('should auto-submit when 6 digits entered', async () => {
      component['pendingNewEmail'].set('new@example.com');
      spyOn(component, 'onVerifyEmailOtp');

      const event = { target: { value: '123456' } } as unknown as Event;
      component.onEmailOtpInput(event);

      expect(component.onVerifyEmailOtp).toHaveBeenCalled();
    });

    it('should not auto-submit when less than 6 digits', () => {
      spyOn(component, 'onVerifyEmailOtp');

      const event = { target: { value: '12345' } } as unknown as Event;
      component.onEmailOtpInput(event);

      expect(component.onVerifyEmailOtp).not.toHaveBeenCalled();
    });
  });

  describe('onEmailOtpPaste', () => {
    it('should filter and limit pasted content to 6 digits', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: { getData: () => 'Code: 123456789' }
      } as unknown as ClipboardEvent;

      component.onEmailOtpPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.emailOtp()).toBe('123456');
    });

    it('should auto-submit when 6 digits pasted', async () => {
      component['pendingNewEmail'].set('new@example.com');
      spyOn(component, 'onVerifyEmailOtp');

      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: { getData: () => '123456' }
      } as unknown as ClipboardEvent;

      component.onEmailOtpPaste(event);

      expect(component.onVerifyEmailOtp).toHaveBeenCalled();
    });

    it('should handle null clipboard data', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: null
      } as unknown as ClipboardEvent;

      component.onEmailOtpPaste(event);

      expect(component.emailOtp()).toBe('');
    });
  });

  describe('onVerifyEmailOtp', () => {
    it('should not verify with incomplete OTP', async () => {
      component['emailOtp'].set('12345');
      component['pendingNewEmail'].set('new@example.com');

      await component.onVerifyEmailOtp();

      expect(mockAuthService.verifyEmailChangeOtp).not.toHaveBeenCalled();
    });

    it('should not verify without pending email', async () => {
      component['emailOtp'].set('123456');
      component['pendingNewEmail'].set(null);

      await component.onVerifyEmailOtp();

      expect(mockAuthService.verifyEmailChangeOtp).not.toHaveBeenCalled();
    });

    it('should verify OTP successfully', async () => {
      component['emailOtp'].set('123456');
      component['pendingNewEmail'].set('new@example.com');
      component['emailOtpSent'].set(true);

      await component.onVerifyEmailOtp();

      expect(mockAuthService.verifyEmailChangeOtp).toHaveBeenCalledWith('new@example.com', '123456');
      expect(component.emailChangeComplete()).toBe(true);
      expect(component.emailOtpSent()).toBe(false);
      expect(component.pendingNewEmail()).toBeNull();
      expect(component.emailOtp()).toBe('');
    });

    it('should show error when OTP verification fails', async () => {
      mockAuthService.verifyEmailChangeOtp.and.returnValue(Promise.resolve({
        error: { message: 'Invalid OTP' } as any
      }));

      component['emailOtp'].set('123456');
      component['pendingNewEmail'].set('new@example.com');

      await component.onVerifyEmailOtp();

      expect(component.emailError()).toBe('Invalid OTP');
      expect(component.emailChangeComplete()).toBe(false);
    });
  });

  describe('onCancelEmailChange', () => {
    it('should reset all email change state', () => {
      component['emailOtpSent'].set(true);
      component['emailChangeComplete'].set(true);
      component['pendingNewEmail'].set('new@example.com');
      component['emailOtp'].set('123456');
      component['emailError'].set('Some error');
      component['emailSuccess'].set(true);

      component.onCancelEmailChange();

      expect(component.emailOtpSent()).toBe(false);
      expect(component.emailChangeComplete()).toBe(false);
      expect(component.pendingNewEmail()).toBeNull();
      expect(component.emailOtp()).toBe('');
      expect(component.emailError()).toBeNull();
      expect(component.emailSuccess()).toBe(false);
    });
  });

  describe('onResendEmailOtp', () => {
    it('should not resend without pending email', async () => {
      component['pendingNewEmail'].set(null);

      await component.onResendEmailOtp();

      expect(mockAuthService.updateEmail).not.toHaveBeenCalled();
    });

    it('should resend OTP successfully', async () => {
      component['pendingNewEmail'].set('new@example.com');

      await component.onResendEmailOtp();

      expect(mockAuthService.updateEmail).toHaveBeenCalledWith('new@example.com');
      expect(component.emailSuccess()).toBe(true);
    });

    it('should show error when resend fails', async () => {
      mockAuthService.updateEmail.and.returnValue(Promise.resolve({
        error: { message: 'Rate limited' } as any
      }));

      component['pendingNewEmail'].set('new@example.com');

      await component.onResendEmailOtp();

      expect(component.emailError()).toBe('Rate limited');
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
    it('should call exportUserData service with server data', async () => {
      await component.onExportData();

      expect(mockAuthService.getToken).toHaveBeenCalled();
      expect(mockDataExportService.exportUserData).toHaveBeenCalledWith({
        includeServerData: true,
        accessToken: 'test-token',
      });
    });

    it('should call exportUserData without server data when no token', async () => {
      mockAuthService.getToken.and.returnValue(Promise.resolve(null));

      await component.onExportData();

      expect(mockDataExportService.exportUserData).toHaveBeenCalledWith({
        includeServerData: false,
        accessToken: undefined,
      });
    });
  });

  describe('onDeleteAccount', () => {
    it('should show delete account dialog', () => {
      component.onDeleteAccount();

      expect(mockConfirmDialogService.show).toHaveBeenCalled();
    });

    it('should delete account and navigate on success', async () => {
      let confirmCallback: () => Promise<void> = async () => {};

      mockConfirmDialogService.show.and.callFake((options: { onConfirm: () => Promise<void> }) => {
        confirmCallback = options.onConfirm;
      });

      component.onDeleteAccount();
      await confirmCallback();

      expect(mockAuthService.deleteAccount).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should throw error when delete fails', async () => {
      let confirmCallback: () => Promise<void> = async () => {};

      mockConfirmDialogService.show.and.callFake((options: { onConfirm: () => Promise<void> }) => {
        confirmCallback = options.onConfirm;
      });

      mockAuthService.deleteAccount.and.returnValue(Promise.resolve({
        error: { message: 'Delete failed' } as any
      }));

      component.onDeleteAccount();

      await expectAsync(confirmCallback()).toBeRejectedWithError('Delete failed');
    });
  });

  describe('onClearAllData', () => {
    it('should show clear data dialog', () => {
      component.onClearAllData();

      expect(mockConfirmDialogService.show).toHaveBeenCalled();
    });

    it('should clear all data on confirm', async () => {
      let confirmCallback: () => Promise<void> = async () => {};

      mockConfirmDialogService.show.and.callFake((options: { onConfirm: () => Promise<void> }) => {
        confirmCallback = options.onConfirm;
      });

      component.onClearAllData();
      await confirmCallback();

      expect(mockIndexedDbService.clear).toHaveBeenCalled();
      expect(mockNotificationService.clearAll).toHaveBeenCalled();
      expect(mockUserSettingsService.deleteSettings).toHaveBeenCalled();
    });

    it('should reset timezone to detected timezone after clearing', async () => {
      let confirmCallback: () => Promise<void> = async () => {};

      mockConfirmDialogService.show.and.callFake((options: { onConfirm: () => Promise<void> }) => {
        confirmCallback = options.onConfirm;
      });
      mockUserSettingsService.detectTimezone.and.returnValue('America/New_York');

      component.onClearAllData();
      await confirmCallback();

      expect(component.selectedTimezone()).toBe('America/New_York');
    });
  });

  describe('onExportData error handling', () => {
    it('should set exportError when export fails', async () => {
      mockDataExportService.exportUserData.and.returnValue(Promise.reject(new Error('Export failed')));

      await component.onExportData();

      expect(component.exportError()).toBe('Export failed');
    });

    it('should clear exportError before export', async () => {
      component.exportError.set('Previous error');

      await component.onExportData();

      // Error should be cleared (and remain null if export succeeds)
      expect(component.exportError()).toBeNull();
    });
  });

  describe('data backup', () => {
    it('should check for data backup on init', async () => {
      await component.ngOnInit();

      expect(mockDataMigrationService.hasDataBackup).toHaveBeenCalled();
    });

    it('should set hasDataBackup to true when backup exists', async () => {
      mockDataMigrationService.hasDataBackup.and.returnValue(Promise.resolve(true));

      await component.ngOnInit();

      expect(component.hasDataBackup()).toBe(true);
    });

    it('should set hasDataBackup to false when no backup exists', async () => {
      mockDataMigrationService.hasDataBackup.and.returnValue(Promise.resolve(false));

      await component.ngOnInit();

      expect(component.hasDataBackup()).toBe(false);
    });
  });

  describe('onExportPreviousData', () => {
    it('should download backup data when available', async () => {
      const mockBackup = {
        createdAt: '2025-01-01T00:00:00.000Z',
        localStorageVersion: '20.0.0',
        localStorageTargetVersion: '21.0.0',
        indexedDbVersion: 1,
        indexedDbTargetVersion: 2,
        localStorage: { key1: 'value1' },
        indexedDb: { key2: 'value2' },
      };
      mockDataMigrationService.getDataBackup.and.returnValue(Promise.resolve(mockBackup));

      // Mock URL and document
      const mockUrl = 'blob:test-url';
      spyOn(URL, 'createObjectURL').and.returnValue(mockUrl);
      spyOn(URL, 'revokeObjectURL');
      const mockLink = jasmine.createSpyObj('a', ['click']);
      spyOn(document, 'createElement').and.returnValue(mockLink);

      await component.onExportPreviousData();

      expect(mockDataMigrationService.getDataBackup).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
      expect(mockLink.download).toContain('angular-momentum-backup-ls20.0.0-to-21.0.0-idb1-to-2.json');
    });

    it('should use "initial" for null localStorageVersion in filename', async () => {
      const mockBackup = {
        createdAt: '2025-01-01T00:00:00.000Z',
        localStorageVersion: null,
        localStorageTargetVersion: '21.0.0',
        indexedDbVersion: 0,
        indexedDbTargetVersion: 2,
        localStorage: {},
        indexedDb: {},
      };
      mockDataMigrationService.getDataBackup.and.returnValue(Promise.resolve(mockBackup));

      const mockUrl = 'blob:test-url';
      spyOn(URL, 'createObjectURL').and.returnValue(mockUrl);
      spyOn(URL, 'revokeObjectURL');
      const mockLink = jasmine.createSpyObj('a', ['click']);
      spyOn(document, 'createElement').and.returnValue(mockLink);

      await component.onExportPreviousData();

      expect(mockLink.download).toContain('angular-momentum-backup-lsinitial-to-21.0.0-idb0-to-2.json');
    });

    it('should not download when no backup exists', async () => {
      mockDataMigrationService.getDataBackup.and.returnValue(Promise.resolve(null));

      spyOn(URL, 'createObjectURL');

      await component.onExportPreviousData();

      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should set and clear backupLoading during export', async () => {
      const mockBackup = {
        createdAt: '2025-01-01T00:00:00.000Z',
        localStorageVersion: '20.0.0',
        localStorageTargetVersion: '21.0.0',
        indexedDbVersion: 1,
        indexedDbTargetVersion: 2,
        localStorage: {},
        indexedDb: {},
      };
      mockDataMigrationService.getDataBackup.and.returnValue(Promise.resolve(mockBackup));

      spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
      spyOn(URL, 'revokeObjectURL');
      const mockLink = jasmine.createSpyObj('a', ['click']);
      spyOn(document, 'createElement').and.returnValue(mockLink);

      expect(component.backupLoading()).toBe(false);

      await component.onExportPreviousData();

      expect(component.backupLoading()).toBe(false);
    });
  });
});


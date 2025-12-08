import { ChangeDetectionStrategy, Component, signal, computed, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators, type ValidatorFn } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { AuthService } from '@app/services/auth.service';
import { UserSettingsService } from '@app/services/user-settings.service';
import { UsernameService } from '@app/services/username.service';
import { CookieConsentService } from '@app/services/cookie-consent.service';
import { DatePipe } from '@angular/common';
import { passwordComplexityValidator, PASSWORD_REQUIREMENT_KEYS, USERNAME_REQUIREMENT_KEYS } from '@app/helpers/validation';
import { getUserInitials } from '@app/helpers/user.helper';
import { TOOLTIP_CONFIG } from '@app/constants/ui.constants';

/**
 * User profile component displaying authenticated user information.
 *
 * Features:
 * - Display user email and metadata
 * - Logout functionality
 * - Profile management (future)
 *
 * Protected by AuthGuard to require authentication.
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    ButtonModule,
    AvatarModule,
    DividerModule,
    PanelModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    TooltipModule,
    SelectModule,
    ConfirmDialogModule,
    DatePipe,
  ],
  providers: [ConfirmationService],
})
export class ProfileComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly userSettingsService = inject(UserSettingsService);
  protected readonly usernameService = inject(UsernameService);
  protected readonly cookieConsentService = inject(CookieConsentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translocoService = inject(TranslocoService);
  private readonly confirmationService = inject(ConfirmationService);

  // Password change panel state
  readonly passwordPanelExpanded = signal(false);
  readonly passwordLoading = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly showCurrentPassword = signal(false);
  readonly isPasswordResetFlow = signal(false); // True when coming from password reset email

  // Timezone state
  readonly timezoneLoading = signal(false);
  readonly selectedTimezone = signal<string>('UTC');

  // Username state
  readonly usernamePanelExpanded = signal(false);
  readonly usernameLoading = signal(false);
  readonly usernameError = signal<string | null>(null);
  readonly usernameSuccess = signal(false);
  readonly editedUsername = signal<string>('');
  readonly originalUsername = signal<string>(''); // Track original username to detect changes
  readonly isUsernameDirty = computed(() => this.editedUsername() !== this.originalUsername());

  // Email change state
  readonly emailPanelExpanded = signal(false);
  readonly emailLoading = signal(false);
  readonly emailError = signal<string | null>(null);
  readonly emailSuccess = signal(false);

  // Common timezones for the dropdown
  readonly commonTimezones = [
    { label: 'UTC', value: 'UTC' },
    { label: 'America/New_York (Eastern)', value: 'America/New_York' },
    { label: 'America/Chicago (Central)', value: 'America/Chicago' },
    { label: 'America/Denver (Mountain)', value: 'America/Denver' },
    { label: 'America/Los_Angeles (Pacific)', value: 'America/Los_Angeles' },
    { label: 'America/Anchorage (Alaska)', value: 'America/Anchorage' },
    { label: 'Pacific/Honolulu (Hawaii)', value: 'Pacific/Honolulu' },
    { label: 'Europe/London', value: 'Europe/London' },
    { label: 'Europe/Paris', value: 'Europe/Paris' },
    { label: 'Europe/Berlin', value: 'Europe/Berlin' },
    { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
    { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
    { label: 'Asia/Singapore', value: 'Asia/Singapore' },
    { label: 'Asia/Dubai', value: 'Asia/Dubai' },
    { label: 'Australia/Sydney', value: 'Australia/Sydney' },
    { label: 'Australia/Melbourne', value: 'Australia/Melbourne' },
    { label: 'Pacific/Auckland', value: 'Pacific/Auckland' },
  ];

  // Tooltip content for form fields (translated)
  passwordTooltip = '';
  usernameTooltip = '';
  tooltipShowDelay = TOOLTIP_CONFIG.SHOW_DELAY;
  tooltipHideDelay = TOOLTIP_CONFIG.HIDE_DELAY;

  passwordForm: FormGroup;
  emailForm: FormGroup;

  constructor() {
    // Initialize form without current password (will be added conditionally)
    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, passwordComplexityValidator()]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: this.passwordMatchValidator as ValidatorFn
    });

    // Initialize email change form
    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
    });

    // Load translated tooltips
    this.loadTooltips();
  }

  /**
   * Load translated tooltip content.
   */
  private loadTooltips(): void {
    this.passwordTooltip = PASSWORD_REQUIREMENT_KEYS
      .map(key => this.translocoService.translate(key))
      .join('\n');

    this.usernameTooltip = USERNAME_REQUIREMENT_KEYS
      .map(key => this.translocoService.translate(key))
      .join('\n');
  }

  /**
   * Check if we should auto-expand password panel (e.g., coming from password reset email)
   * and load user settings.
   */
  ngOnInit(): void {
    // Check for password reset flow via AuthService OR router state
    // The auth service tracks PASSWORD_RECOVERY events from Supabase (email link flow)
    const isResetFlow = this.authService.isPasswordRecovery();

    // Check for router state from OTP password reset flow
    const routerState = globalThis.history.state;
    const expandPasswordPanel = routerState?.['expandPasswordPanel'];

    if (isResetFlow || expandPasswordPanel) {
      this.isPasswordResetFlow.set(true);
      this.passwordPanelExpanded.set(true);
    } else {
      // Regular password change - add current password field
      this.passwordForm.addControl('currentPassword',
        this.fb.control('', [Validators.required])
      );
    }

    // Load user settings (timezone)
    const settings = this.userSettingsService.settings();
    if (settings?.timezone) {
      this.selectedTimezone.set(settings.timezone);
    } else {
      // Use detected timezone as fallback
      this.selectedTimezone.set(this.userSettingsService.detectTimezone());
    }

    // Load username asynchronously
    this.loadUsernameAsync();
  }

  /**
   * Load username data asynchronously.
   * Called from ngOnInit without blocking.
   */
  private async loadUsernameAsync(): Promise<void> {
    await this.usernameService.loadUsername();
    const usernameData = this.usernameService.username();
    const username = usernameData?.username ?? '';
    this.editedUsername.set(username);
    this.originalUsername.set(username);
  }

  /**
   * Handle logout button click.
   * Always redirects to home since profile page is auth-guarded.
   */
  async onLogout(): Promise<void> {
    // Clear user data
    this.userSettingsService.clear();
    this.usernameService.clear();

    // Logout and navigate to home (required since /profile is auth-guarded)
    await this.authService.logout();
    await this.router.navigate(['/']);
  }

  /**
   * Get user initials for avatar.
   */
  getUserInitials(): string {
    return getUserInitials(this.authService.currentUser());
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(group: FormGroup): Record<string, boolean> | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Handle password change panel collapse/expand
   */
  onPanelCollapsedChange(collapsed: boolean | undefined): void {
    this.passwordPanelExpanded.set(!(collapsed ?? false));

    if (!collapsed) {
      // Expanding - reset form
      this.passwordError.set(null);
      this.passwordSuccess.set(false);
      this.passwordForm.reset();
    }
  }

  /**
   * Handle password change form submission
   */
  async onSubmitPasswordChange(): Promise<void> {
    if (this.passwordForm.invalid) {
      return;
    }

    this.passwordLoading.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);

    const { currentPassword, newPassword } = this.passwordForm.value;

    // If not in reset flow, verify current password first
    if (!this.isPasswordResetFlow() && currentPassword) {
      const email = this.authService.currentUser()?.email;
      if (!email) {
        this.passwordError.set('Unable to verify current password');
        this.passwordLoading.set(false);
        return;
      }

      const { error: verifyError } = await this.authService.login({
        email,
        password: currentPassword
      });
      if (verifyError) {
        this.passwordError.set(this.translocoService.translate('error.Current password is incorrect'));
        this.passwordLoading.set(false);
        return;
      }
    }

    // Update password
    const { error } = await this.authService.updatePassword(newPassword);

    this.passwordLoading.set(false);

    if (error) {
      this.passwordError.set(error.message);
      return;
    }

    // Success!
    this.passwordSuccess.set(true);
    this.passwordForm.reset();
  }

  /**
   * Handle email change panel collapse/expand
   */
  onEmailPanelCollapsedChange(collapsed: boolean | undefined): void {
    this.emailPanelExpanded.set(!(collapsed ?? false));

    if (!collapsed) {
      // Expanding - reset form
      this.emailError.set(null);
      this.emailSuccess.set(false);
      this.emailForm.reset();
    }
  }

  /**
   * Handle email change form submission
   */
  async onSubmitEmailChange(): Promise<void> {
    if (this.emailForm.invalid) {
      return;
    }

    this.emailLoading.set(true);
    this.emailError.set(null);
    this.emailSuccess.set(false);

    const { newEmail } = this.emailForm.value;

    // Update email (sends verification to new email)
    const { error } = await this.authService.updateEmail(newEmail);

    this.emailLoading.set(false);

    if (error) {
      this.emailError.set(error.message);
      return;
    }

    // Success! User needs to verify new email
    this.emailSuccess.set(true);
    this.emailForm.reset();
  }

  /**
   * Show new password while mouse/touch is held down
   */
  onNewPasswordPeekStart(): void {
    this.showNewPassword.set(true);
  }

  /**
   * Hide new password when mouse/touch is released
   */
  onNewPasswordPeekEnd(): void {
    this.showNewPassword.set(false);
  }

  /**
   * Show confirm password while mouse/touch is held down
   */
  onConfirmPasswordPeekStart(): void {
    this.showConfirmPassword.set(true);
  }

  /**
   * Hide confirm password when mouse/touch is released
   */
  onConfirmPasswordPeekEnd(): void {
    this.showConfirmPassword.set(false);
  }

  /**
   * Show current password while mouse/touch is held down
   */
  onCurrentPasswordPeekStart(): void {
    this.showCurrentPassword.set(true);
  }

  /**
   * Hide current password when mouse/touch is released
   */
  onCurrentPasswordPeekEnd(): void {
    this.showCurrentPassword.set(false);
  }

  /**
   * Handle timezone change
   */
  async onTimezoneChange(event: { value: string }): Promise<void> {
    const newTimezone = event.value;
    this.timezoneLoading.set(true);

    await this.userSettingsService.updateTimezone(newTimezone);
    this.selectedTimezone.set(newTimezone);

    this.timezoneLoading.set(false);
  }

  /**
   * Handle username panel collapse/expand
   */
  onUsernamePanelCollapsedChange(collapsed: boolean | undefined): void {
    this.usernamePanelExpanded.set(!(collapsed ?? false));

    if (!collapsed) {
      // Expanding - reset form
      this.usernameError.set(null);
      this.usernameSuccess.set(false);
      // Initialize with current username or empty string
      const currentUsername = this.usernameService.username()?.username ?? '';
      this.editedUsername.set(currentUsername);
      this.originalUsername.set(currentUsername);
    }
  }

  /**
   * Save username changes or delete if blank
   */
  async onSaveUsername(): Promise<void> {
    const newUsername = this.editedUsername().trim();

    this.usernameLoading.set(true);
    this.usernameError.set(null);
    this.usernameSuccess.set(false);

    try {
      if (newUsername) {
        // Update username
        await this.usernameService.updateUsername(newUsername);
        this.originalUsername.set(newUsername);
      } else {
        // Blank username = delete
        await this.usernameService.deleteUsername();
        this.originalUsername.set('');
      }

      // Success!
      this.usernameSuccess.set(true);

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.usernameSuccess.set(false);
      }, 3000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'error.Failed to update username';
      this.usernameError.set(this.translocoService.translate(message));
    } finally {
      this.usernameLoading.set(false);
    }
  }

  /**
   * Export all user data (GDPR data portability)
   */
  async onExportData(): Promise<void> {
    const { error } = await this.authService.exportUserData();

    // istanbul ignore next
    if (error) {
      this.confirmationService.confirm({
        header: this.translocoService.translate('Error'),
        message: error.message,
        acceptLabel: this.translocoService.translate('OK'),
        rejectVisible: false,
      });
    }
  }

  /**
   * Handle cookie consent accept
   */
  onAcceptCookies(): void {
    this.cookieConsentService.acceptCookies();
  }

  /**
   * Handle cookie consent decline
   */
  onDeclineCookies(): void {
    this.cookieConsentService.declineCookies();
  }

  /**
   * Reset cookie consent (for testing or changing preference)
   */
  onResetCookieConsent(): void {
    this.cookieConsentService.resetConsent();
  }

  /**
   * Delete account with confirmation
   */
  onDeleteAccount(): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('profile.Delete Account'),
      message: this.translocoService.translate('profile.Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('Delete'),
      rejectLabel: this.translocoService.translate('Cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.handleDeleteAccountConfirm(),
    });
  }

  /**
   * Handle confirmed account deletion.
   * Deletes the account and navigates to home on success.
   */
  // istanbul ignore next
  private async handleDeleteAccountConfirm(): Promise<void> {
    const { error } = await this.authService.deleteAccount();

    if (error) {
      this.confirmationService.confirm({
        header: this.translocoService.translate('Error'),
        message: error.message,
        acceptLabel: this.translocoService.translate('OK'),
        rejectVisible: false,
      });
    } else {
      // Navigate to home page after successful deletion
      await this.router.navigate(['/']);
    }
  }
}

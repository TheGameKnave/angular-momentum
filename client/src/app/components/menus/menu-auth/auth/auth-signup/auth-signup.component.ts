import { ChangeDetectionStrategy, Component, output, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { NgxTurnstileModule, NgxTurnstileComponent } from 'ngx-turnstile';
import { AuthService } from '@app/services/auth.service';
import { ENVIRONMENT } from 'src/environments/environment';
import {
  usernameValidator,
  emailValidator,
  emailTypoValidator,
  passwordMatchValidator,
  passwordComplexityValidator,
  USERNAME_REQUIREMENT_KEYS,
  PASSWORD_REQUIREMENT_KEYS,
  EMAIL_REQUIREMENT_KEYS
} from '@app/helpers/validation';

/**
 * Signup form component for new user registration.
 *
 * Features:
 * - Email, username (optional), password, and confirm password inputs
 * - Password visibility toggles (peek on hold)
 * - Tooltips for validation requirements
 * - Link to switch to login
 */
@Component({
  selector: 'app-auth-signup',
  templateUrl: './auth-signup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    TooltipModule,
    CheckboxModule,
    NgxTurnstileModule,
  ],
})
export class AuthSignupComponent {
  // Outputs for parent component
  readonly switchToLogin = output<void>();
  readonly signupSuccess = output<{ email: string; username?: string }>(); // Emits email and username for OTP verification

  // Form state
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showRetry = signal(false); // Show retry button when CAPTCHA fails

  // Turnstile CAPTCHA
  @ViewChild(NgxTurnstileComponent) turnstileComponent?: NgxTurnstileComponent;
  readonly turnstileSiteKey = ENVIRONMENT.turnstile_site_key;
  readonly turnstileToken = signal<string | null>(null);
  private turnstileInitialized = false; // Track if Turnstile has completed first load

  // Tooltip content for form fields (translated)
  usernameTooltip = '';
  passwordTooltip = '';
  emailTooltip = '';

  signupForm: FormGroup;

  constructor(
    private readonly authService: AuthService,
    private readonly fb: FormBuilder,
    private readonly translocoService: TranslocoService,
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, emailValidator(), emailTypoValidator()]],
      username: ['', [usernameValidator()]],
      password: ['', [Validators.required, passwordComplexityValidator()]],
      confirmPassword: ['', [Validators.required]],
      ageVerification: [false, [Validators.requiredTrue]],
      privacyPolicy: [false, [Validators.requiredTrue]],
      turnstile: ['', [Validators.required]], // CAPTCHA token
    }, { validators: passwordMatchValidator() });

    // Load translated tooltips
    this.loadTooltips();
  }

  /**
   * Load translated tooltip content.
   */
  private loadTooltips(): void {
    this.usernameTooltip = USERNAME_REQUIREMENT_KEYS
      .map(key => this.translocoService.translate(key))
      .join('\n');

    this.passwordTooltip = PASSWORD_REQUIREMENT_KEYS
      .map(key => this.translocoService.translate(key))
      .join('\n');

    this.emailTooltip = EMAIL_REQUIREMENT_KEYS
      .map(key => this.translocoService.translate(key))
      .join('\n');
  }

  /**
   * Handle Turnstile token received
   */
  onTurnstileResolved(token: string | null): void {
    if (!token) {
      this.onTurnstileError();
      return;
    }
    this.turnstileInitialized = true; // Mark as initialized on first successful resolution
    this.turnstileToken.set(token);
    this.signupForm.patchValue({ turnstile: token });
    this.errorMessage.set(null);
    this.showRetry.set(false);
  }

  /**
   * Handle Turnstile error
   */
  onTurnstileError(): void {
    // Only show error if Turnstile has been initialized (prevents flashing during initial load)
    if (!this.turnstileInitialized) {
      return;
    }

    this.turnstileToken.set(null);
    this.signupForm.patchValue({ turnstile: '' });
    this.errorMessage.set(
      this.translocoService.translate('auth.Bot check failed. This may be due to network issues or security restrictions. Please reload the page…')
        .replaceAll('>a','<a').replaceAll('>/a','</a')
    );
    this.showRetry.set(true);
  }

  /**
   * Retry CAPTCHA verification
   */
  retryCaptcha(): void {
    this.errorMessage.set(null);
    this.showRetry.set(false);
    this.turnstileInitialized = false; // Reset initialization flag for retry
    this.turnstileComponent?.reset();
  }

  /**
   * Handle signup form submission
   */
  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, username, password } = this.signupForm.value;
    const turnstileToken = this.turnstileToken();

    // Pass turnstile token to signup
    const result = await this.authService.signUp(email, password, username, turnstileToken);

    this.loading.set(false);

    if (result.error) {
      this.errorMessage.set(this.translocoService.translate(result.error.message));
      return;
    }

    // Success - emit email and username to parent for OTP verification
    // Username will be created after OTP verification completes
    this.signupSuccess.emit({ email, username: username || undefined });
  }

  /**
   * Show password while mouse/touch is held down
   */
  onPasswordPeekStart(): void {
    this.showPassword.set(true);
  }

  /**
   * Hide password when mouse/touch is released
   */
  onPasswordPeekEnd(): void {
    this.showPassword.set(false);
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
   * Handle switch to login click
   */
  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }
}

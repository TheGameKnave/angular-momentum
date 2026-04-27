import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, output, signal, ViewChild, inject } from '@angular/core';
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
  passwordComplexityValidator,
  USERNAME_REQUIREMENT_KEYS,
  PASSWORD_REQUIREMENT_KEYS,
  EMAIL_REQUIREMENT_KEYS
} from '@app/helpers/validation';
import { parseSupabaseError } from '@app/helpers/supabase-error.helper';
import { TOOLTIP_CONFIG } from '@app/constants/ui.constants';

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
export class AuthSignupComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly translocoService = inject(TranslocoService);

  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  // Outputs for parent component
  readonly switchToLogin = output<void>();
  readonly signupSuccess = output<{ email: string; username?: string }>(); // Emits email and username for OTP verification

  // Form state
  readonly showPassword = signal(false);
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
  tooltipShowDelay = TOOLTIP_CONFIG.SHOW_DELAY;
  tooltipHideDelay = TOOLTIP_CONFIG.HIDE_DELAY;

  signupForm: FormGroup;

  constructor() {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, emailValidator(), emailTypoValidator()]],
      username: ['', [usernameValidator()]],
      password: ['', [Validators.required, passwordComplexityValidator()]],
      ageVerification: [false, [Validators.requiredTrue]],
      privacyPolicy: [false, [Validators.requiredTrue]],
      turnstile: ['', [Validators.required]], // CAPTCHA token
    });

    // Load translated tooltips
    this.loadTooltips();
  }

  /** True once the view is mounted and the email field is available. */
  private viewReady = false;
  /** True once Turnstile has resolved and will no longer grab focus. */
  private turnstileSettled = false;

  /**
   * Mark the view as ready and focus the email field if Turnstile has already settled.
   * @returns void
   */
  ngAfterViewInit(): void {
    this.viewReady = true;
    this.focusEmailIfReady();
  }

  /**
   * Focus the email input. Called on mount and whenever the parent menu
   * reopens. On first mount this waits for Turnstile; on reopen Turnstile
   * has already settled, so focus lands immediately.
   */
  focusFirstField(): void {
    this.focusEmailIfReady();
  }

  /**
   * Focus the email input once both the view is mounted and Turnstile has
   * resolved. Whichever lands second triggers the focus. Skips if the user
   * has already focused a different form control on purpose.
   */
  private focusEmailIfReady(): void {
    if (!this.viewReady || !this.turnstileSettled) return;
    const el = this.emailInput?.nativeElement;
    if (!el) return;
    const active = document.activeElement;
    const activeIsFormField = active instanceof HTMLInputElement
      || active instanceof HTMLTextAreaElement
      || active instanceof HTMLSelectElement;
    if (activeIsFormField && active !== el) return;
    el.focus();
  }

  /**
   * When the email loses focus, pre-fill the username from its prefix — but
   * only if the user hasn't touched the username field yet. Sanitized to the
   * characters the username validator accepts; bails out if nothing remains.
   */
  onEmailBlur(): void {
    const usernameCtrl = this.signupForm.get('username');
    // Bail only if the user actually typed something — a touched-but-empty
    // field shouldn't block the prefill, since the user may have tabbed
    // through without a value in mind yet.
    if (!usernameCtrl || usernameCtrl.value) {
      return;
    }
    const email: string = this.signupForm.get('email')?.value ?? '';
    const at = email.indexOf('@');
    if (at <= 0) return;
    const prefix = email.slice(0, at).replaceAll(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
    if (!prefix) return;
    usernameCtrl.setValue(prefix);
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
    this.turnstileSettled = true;
    this.focusEmailIfReady();
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
    this.errorMessage.set('auth.Bot check failed. This may be due to network issues or security restrictions. Please reload the page…');
    this.showRetry.set(true);
    this.turnstileSettled = true;
    this.focusEmailIfReady();
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
      const parsed = parseSupabaseError(result.error);
      this.errorMessage.set(parsed.key);
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
   * Handle switch to login click
   */
  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }
}

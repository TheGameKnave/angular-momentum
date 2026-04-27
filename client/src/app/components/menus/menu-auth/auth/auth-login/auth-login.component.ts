import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, output, signal, inject, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@app/services/auth.service';
import { passwordComplexityValidator } from '@app/helpers/validation';
import { parseApiError } from '@app/helpers/api-error.helper';

/**
 * Login form component for authentication.
 *
 * Features:
 * - Email or username and password inputs
 * - Password visibility toggle (peek on hold)
 * - Link to switch to password reset
 * - Link to switch to signup
 */
@Component({
  selector: 'app-auth-login',
  templateUrl: './auth-login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
  ],
})
export class AuthLoginComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  // Input for pre-session callback (e.g., storage promotion)
  readonly beforeSession = input<((userId: string) => Promise<void>) | undefined>();

  // Outputs for parent component
  readonly switchToReset = output<string>(); // Emit email/username for prefill
  readonly switchToSignup = output<void>();
  readonly loginSuccess = output<void>();

  // Form state
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]], // Accept email or username
      password: ['', [Validators.required, passwordComplexityValidator()]],
    });
  }

  /** Focus the identifier field on initial mount. */
  ngAfterViewInit(): void {
    this.focusFirstField();
  }

  /**
   * Focus the email/username input. Called on mount and whenever the parent
   * menu reopens. Synchronous — the `@ViewChild` ref has already resolved
   * by the time `ngAfterViewInit` fires, and the parent defers the reopen
   * case into its own microtask boundary.
   */
  focusFirstField(): void {
    this.emailInput?.nativeElement.focus();
  }

  /**
   * Handle login form submission
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    const result = await this.authService.login({ email, password }, this.beforeSession());

    this.loading.set(false);

    if (result.error) {
      const parsed = parseApiError(result.error.message);
      this.errorMessage.set(parsed.key);
      return;
    }

    // Success - emit event to parent to close menu
    this.loginSuccess.emit();
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
   * Handle forgot password click - pass email/username to reset form
   */
  onForgotPassword(): void {
    const email = this.loginForm.get('email')?.value || '';
    this.switchToReset.emit(email);
  }

  /**
   * Handle switch to signup click
   */
  onSwitchToSignup(): void {
    this.switchToSignup.emit();
  }
}

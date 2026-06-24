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
import { AuthService } from '@app/services/auth.service';
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
 * Signup form component — email/username/password/checkboxes, emits signupSuccess on completion.
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
  ],
})
export class AuthSignupComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly translocoService = inject(TranslocoService);

  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  // Outputs for parent component
  readonly switchToLogin = output<void>();
  readonly signupSuccess = output<{ email: string; username?: string }>();

  // Form state
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
    });

    this.loadTooltips();
  }

  /**
   * Focus the email input on mount.
   */
  ngAfterViewInit(): void {
    this.emailInput?.nativeElement.focus();
  }

  /**
   * Focus the email input. Called on mount and whenever the parent menu reopens.
   */
  focusFirstField(): void {
    this.emailInput?.nativeElement.focus();
  }

  /**
   * When the email loses focus, pre-fill the username from its prefix — but
   * only if the user hasn't touched the username field yet.
   */
  onEmailBlur(): void {
    const usernameCtrl = this.signupForm.get('username');
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
   * Builds tooltip strings from translated requirement keys.
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
   * Validates the form and calls authService.signUp; emits signupSuccess or sets errorMessage.
   */
  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, username, password } = this.signupForm.value;

    const result = await this.authService.signUp(email, password, username);

    this.loading.set(false);

    if (result.error) {
      const parsed = parseSupabaseError(result.error);
      this.errorMessage.set(parsed.key);
      return;
    }

    this.signupSuccess.emit({ email, username: username || undefined });
  }

  /**
   * Shows password in plaintext while the peek button is held.
   */
  onPasswordPeekStart(): void {
    this.showPassword.set(true);
  }

  /**
   * Restores password masking when the peek button is released.
   */
  onPasswordPeekEnd(): void {
    this.showPassword.set(false);
  }

  /**
   * Emits switchToLogin so the parent can swap to the login form.
   */
  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }
}

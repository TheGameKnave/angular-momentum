import { ChangeDetectionStrategy, Component, input, OnInit, output, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@app/services/auth.service';
import { emailValidator, emailTypoValidator } from '@app/helpers/validation';
import { parseSupabaseError } from '@app/helpers/supabase-error.helper';
import { AuthError } from '@supabase/supabase-js';

/**
 * Password reset form component with OTP verification.
 *
 * Features:
 * - Email input for password reset
 * - Send OTP code via "Send Reset Code" button
 * - OTP input field (shown after code is sent)
 * - Verify OTP code
 * - Navigate to profile page to set new password
 * - Pre-fill email if provided
 */
@Component({
  selector: 'app-auth-reset',
  templateUrl: './auth-reset.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
})
export class AuthResetComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translocoService = inject(TranslocoService);

  // Input for pre-filling email from login form
  readonly prefillEmail = input<string>('');

  // Outputs for parent component
  readonly switchToLogin = output<void>();
  readonly resetSuccess = output<void>();

  // Form state
  readonly loading = signal(false);
  readonly resending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly codeSent = signal(false); // Track if OTP has been sent
  readonly resendSuccess = signal(false); // Track if resend was successful

  resetForm: FormGroup;

  constructor() {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, emailValidator(), emailTypoValidator()]],
      otpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });
  }

  /**
   * Initialize component with pre-filled email if provided.
   */
  ngOnInit(): void {
    // Pre-fill email if provided
    const email = this.prefillEmail();
    if (email) {
      this.resetForm.patchValue({ email });
    }
  }

  /**
   * Request OTP code to be sent to email
   */
  async requestCode(): Promise<void> {
    const emailControl = this.resetForm.get('email');
    if (!emailControl?.valid) {
      emailControl?.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const email = emailControl.value;
    const { error } = await this.authService.requestPasswordReset(email);

    this.loading.set(false);

    if (error) {
      this.errorMessage.set(this.translateError(error));
      return;
    }

    this.codeSent.set(true);
  }

  /**
   * Resend OTP code to email
   */
  async resendCode(): Promise<void> {
    const emailControl = this.resetForm.get('email');
    if (!emailControl?.valid) {
      return;
    }

    this.resending.set(true);
    this.errorMessage.set(null);
    this.resendSuccess.set(false);

    const email = emailControl.value;
    const { error } = await this.authService.requestPasswordReset(email);

    this.resending.set(false);

    if (error) {
      this.errorMessage.set(this.translateError(error));
      return;
    }

    this.resendSuccess.set(true);
    // Clear success message after 5 seconds
    setTimeout(() => this.resendSuccess.set(false), 5000);
  }

  /**
   * Filter OTP input to only allow digits (0-9).
   * Prevents typing non-numeric characters.
   * Auto-submits when 6 digits are entered.
   */
  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const filtered = input.value.replaceAll(/\D/g, '');
    if (input.value !== filtered) {
      input.value = filtered;
      this.resetForm.get('otpCode')?.setValue(filtered);
    }

    // Auto-submit when 6 digits are entered
    if (filtered.length === 6) {
      this.onVerifyOtp();
    }
  }

  /**
   * Filter pasted content to only allow digits (0-9).
   * Handles cases where users paste OTP codes with spaces or other characters.
   * Auto-submits when 6 digits are pasted.
   */
  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') ?? '';
    const filtered = pastedText.replaceAll(/\D/g, '').slice(0, 6); // Only take first 6 digits
    this.resetForm.get('otpCode')?.setValue(filtered);

    // Auto-submit when 6 digits are pasted
    if (filtered.length === 6) {
      this.onVerifyOtp();
    }
  }

  /**
   * Handle OTP verification form submission
   */
  async onVerifyOtp(): Promise<void> {
    if (this.resetForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, otpCode } = this.resetForm.value;
    const result = await this.authService.verifyPasswordResetOtp(email, otpCode);

    this.loading.set(false);

    if (result.error) {
      this.errorMessage.set(this.translateError(result.error));
      return;
    }

    // Success - navigate to profile page with password panel expanded
    this.resetSuccess.emit();
    await this.router.navigate(['/profile'], {
      state: { expandPasswordPanel: true }
    });
  }

  /**
   * Handle switch to login click
   */
  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }

  /**
   * Translate a Supabase error using the error helper.
   * Handles dynamic values and maps unfriendly messages to user-friendly ones.
   */
  private translateError(error: AuthError): string {
    const parsed = parseSupabaseError(error);
    return this.translocoService.translate(parsed.key, parsed.params);
  }
}

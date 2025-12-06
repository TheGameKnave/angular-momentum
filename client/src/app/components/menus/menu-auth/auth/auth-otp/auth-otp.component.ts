import { ChangeDetectionStrategy, Component, input, output, signal, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@app/services/auth.service';
import { OTP_CONFIG } from '@app/constants/auth.constants';
import { parseApiError } from '@app/helpers/api-error.helper';

/**
 * OTP verification form component.
 *
 * Features:
 * - 6-digit OTP input with numeric filtering
 * - Paste handling to extract digits
 * - Resend OTP functionality
 * - Auto-focus input on component load
 * - Auto-submit when 6 digits entered
 */
@Component({
  selector: 'app-auth-otp',
  templateUrl: './auth-otp.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
})
export class AuthOtpComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('otpInput') otpInput?: ElementRef<HTMLInputElement>;

  // Input for email that needs verification
  readonly email = input.required<string>();

  // Outputs for parent component
  readonly backToSignup = output<void>();
  readonly switchToLogin = output<void>();
  readonly verifySuccess = output<void>();

  // Form state
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  otpForm: FormGroup;

  constructor() {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(OTP_CONFIG.PATTERN)]],
    });
  }

  /**
   * Auto-focus the OTP input field after component loads
   */
  ngAfterViewInit(): void {
    // Focus the input field after a small delay to ensure it's rendered
    setTimeout(() => {
      this.otpInput?.nativeElement?.focus();
    }, OTP_CONFIG.FOCUS_DELAY_MS);
  }

  /**
   * Filter OTP input to only allow digits (0-9).
   * Prevents typing non-numeric characters.
   * Auto-submits when 6 digits are entered.
   */
  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const filtered = input.value.replace(OTP_CONFIG.NON_DIGIT_FILTER, '');
    if (input.value !== filtered) {
      input.value = filtered;
      this.otpForm.get('otp')?.setValue(filtered);
    }

    // Auto-submit when full OTP is entered
    if (filtered.length === OTP_CONFIG.LENGTH) {
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
    const filtered = pastedText.replace(OTP_CONFIG.NON_DIGIT_FILTER, '').slice(0, OTP_CONFIG.LENGTH);
    this.otpForm.get('otp')?.setValue(filtered);

    // Auto-submit when full OTP is pasted
    if (filtered.length === OTP_CONFIG.LENGTH) {
      this.onVerifyOtp();
    }
  }

  /**
   * Handle OTP verification form submission
   */
  async onVerifyOtp(): Promise<void> {
    if (this.otpForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { otp } = this.otpForm.value;
    const email = this.email();

    const result = await this.authService.verifyOtp(email, otp);

    this.loading.set(false);

    if (result.error) {
      const parsed = parseApiError(result.error.message);
      this.errorMessage.set(parsed.key);
      return;
    }

    // Success - emit event to parent to close menu
    this.verifySuccess.emit();
  }

  /**
   * Resend OTP code
   */
  async onResendOtp(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.email();
    const { error } = await this.authService.resendOtp(email);

    this.loading.set(false);

    if (error) {
      const parsed = parseApiError(error.message);
      this.errorMessage.set(parsed.key);
      return;
    }

    this.successMessage.set('auth.New verification code sent!');
  }

  /**
   * Handle back to signup click
   */
  onBackToSignup(): void {
    this.backToSignup.emit();
  }

  /**
   * Handle switch to login click
   */
  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }
}

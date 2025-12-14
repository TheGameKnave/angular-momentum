import { Injectable, signal } from '@angular/core';

/**
 * Auth mode type for the authentication UI
 */
export type AuthMode = 'login' | 'signup' | 'reset';

/**
 * Service for managing authentication UI state.
 *
 * Centralizes state management for auth flows including:
 * - Current auth mode (login/signup/reset)
 * - OTP verification state
 * - Pending user data during signup
 * - Form prefill data
 *
 * This service can be shared across multiple components and persists
 * across component recreations until explicitly reset.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthUiStateService {
  // Mode state
  readonly mode = signal<AuthMode>('signup');
  readonly awaitingOtpVerification = signal(false);
  readonly pendingEmail = signal<string | null>(null);
  readonly pendingUsername = signal<string | null>(null);
  readonly loginFormEmail = signal<string>('');

  /**
   * Reset all auth UI state to default values.
   * Should be called on logout or when starting fresh auth flow.
   */
  reset(): void {
    this.mode.set('signup');
    this.awaitingOtpVerification.set(false);
    this.pendingEmail.set(null);
    this.pendingUsername.set(null);
    this.loginFormEmail.set('');
  }

  /**
   * Set the auth mode and clear dependent state.
   *
   * @param newMode - The new auth mode to set
   */
  setMode(newMode: AuthMode): void {
    if (this.mode() !== newMode) {
      this.mode.set(newMode);
      this.awaitingOtpVerification.set(false);
      this.pendingEmail.set(null);
      this.pendingUsername.set(null);
    }
  }

  /**
   * Start OTP verification flow.
   *
   * @param email - User's email address
   * @param username - Optional username to create after verification
   */
  startOtpVerification(email: string, username?: string): void {
    this.awaitingOtpVerification.set(true);
    this.pendingEmail.set(email);
    this.pendingUsername.set(username || null); // NOSONAR - intentional: empty string should be treated as "no username"
  }

  /**
   * Clear OTP verification state while keeping current mode.
   */
  clearOtpVerification(): void {
    this.awaitingOtpVerification.set(false);
    this.pendingEmail.set(null);
    this.pendingUsername.set(null);
  }

  /**
   * Set email for prefilling reset password form.
   *
   * @param email - Email to prefill
   */
  setLoginFormEmail(email: string): void {
    this.loginFormEmail.set(email);
  }
}

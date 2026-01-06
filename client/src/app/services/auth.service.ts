import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';
import { TranslocoService } from '@jsverse/transloco';
import { PlatformService } from './platform.service';
import { LogService } from './log.service';
import { ConnectivityService } from './connectivity.service';
import { ENVIRONMENT } from 'src/environments/environment';
import { AUTH_TIMING } from '@app/constants/service.constants';

/**
 * Authentication result returned from login/signup operations.
 */
export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * User credentials for login.
 */
export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

/**
 * Service for managing authentication with Supabase.
 *
 * Features:
 * - Platform-aware token storage (cookies for web, localStorage for Tauri)
 * - Email/password authentication
 * - JWT-based session management
 * - Signal-based reactive auth state
 * - SSR-compatible (no crashes on server)
 * - Homoglyph attack protection for usernames
 *
 * Storage Strategy:
 * - Web: Supabase default (httpOnly cookies for SSR compatibility)
 * - Tauri: localStorage with manual token management
 * - SSR: No storage (read-only from request context)
 *
 * @example
 * ```typescript
 * // Login
 * const result = await authService.login({ email: 'user@example.com', password: 'pass' });
 *
 * // Check auth state
 * if (authService.isAuthenticated()) {
 *   const user = authService.currentUser();
 * }
 *
 * // Logout
 * await authService.logout();
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly platformService = inject(PlatformService);
  private readonly logService = inject(LogService);
  private readonly router = inject(Router);
  private readonly translocoService = inject(TranslocoService);
  private readonly connectivityService = inject(ConnectivityService);

  private supabase: SupabaseClient | null = null;

  /**
   * Current authenticated user (null if not authenticated).
   */
  readonly currentUser = signal<User | null>(null);

  /**
   * Current session (null if not authenticated).
   */
  readonly currentSession = signal<Session | null>(null);

  /**
   * Loading state for async operations.
   */
  readonly loading = signal<boolean>(true);

  /**
   * Computed signal for authentication status.
   */
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /**
   * Signal indicating if user is in password recovery flow.
   * Set to true when auth state is PASSWORD_RECOVERY.
   */
  readonly isPasswordRecovery = signal<boolean>(false);

  /**
   * URL to redirect to after successful authentication.
   * Set by auth guard when redirecting unauthenticated users.
   */
  private returnUrl: string | null = null;

  /**
   * When true, the main onAuthStateChange listener skips updating signals.
   * Used by verifyOtpWithCallback to manually control when auth state applies.
   */
  private deferAuthStateUpdates = false;

  constructor() {
    this.initializeSupabase();
    this.setupConnectivityHandling();
  }

  /**
   * Set up connectivity-aware token refresh handling.
   * Stops auto-refresh when offline to prevent error spam.
   * Resumes auto-refresh when connectivity is restored.
   */
  private setupConnectivityHandling(): void {
    // Don't set up connectivity handling on SSR
    if (this.platformService.isSSR()) {
      return;
    }

    // Use effect to react to connectivity changes
    effect(() => {
      const isOnline = this.connectivityService.isOnline();

      if (!this.supabase) {
        return;
      }

      if (isOnline) {
        // Resume auto-refresh when online
        this.supabase.auth.startAutoRefresh();
        this.logService.log('Auth: Auto-refresh resumed (online)');
      } else {
        // Stop auto-refresh when offline to prevent error spam
        this.supabase.auth.stopAutoRefresh();
        this.logService.log('Auth: Auto-refresh paused (offline)');
      }
    });

    // Refresh session when app returns from background (iOS Safari suspends JS timers)
    // Safari is aggressive about suspending tabs and may not fire auto-refresh timers
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.supabase) {
        this.refreshSessionOnResume('visibilitychange');
      }
    });

    // Also handle focus event - sometimes fires when visibility doesn't
    window.addEventListener('focus', () => {
      if (this.supabase) {
        this.refreshSessionOnResume('focus');
      }
    });

    // Handle pageshow for Safari's bfcache (back-forward cache)
    // When user navigates back to cached page, session may be stale
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && this.supabase) {
        this.refreshSessionOnResume('pageshow-bfcache');
      }
    });
  }

  /**
   * Refresh session when app resumes from background.
   * Always attempts refresh for authenticated sessions to validate the
   * refresh token is still valid (e.g., not invalidated by password change
   * on another device). Uses Supabase's built-in token validation.
   *
   * @param trigger - What triggered the refresh (for logging)
   */
  private async refreshSessionOnResume(trigger: string): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data } = await this.supabase.auth.getSession();
      if (!data.session) return;

      const expiresAt = data.session.expires_at;
      const expiresIn = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : 0;

      // Always attempt refresh on visibility change to validate refresh token
      // This catches cases where password was changed on another device
      this.logService.log(`Session refresh on ${trigger}`, {
        expiresIn,
        expired: expiresIn <= 0
      });
      const { error } = await this.supabase.auth.refreshSession();
      if (error) {
        this.logService.log(`Session refresh failed on ${trigger}`, error.message);
        // Refresh failed - token may be invalid (password changed elsewhere)
        // Log out to clear invalid session
        this.logService.log('Refresh token invalid, logging out');
        await this.logout();
      }
    } catch (error) {
      this.logService.log(`Error refreshing session on ${trigger}`, error);
    }
  }

  /**
   * Set the URL to redirect to after successful authentication.
   * @param url - URL to redirect to
   */
  setReturnUrl(url: string): void {
    this.returnUrl = url;
  }

  /**
   * Get the stored return URL and clear it.
   * @returns The stored return URL, or null if none
   */
  getAndClearReturnUrl(): string | null {
    const url = this.returnUrl;
    this.returnUrl = null;
    return url;
  }

  /**
   * Check if a return URL is set.
   * @returns True if a return URL is stored
   */
  hasReturnUrl(): boolean {
    return this.returnUrl !== null;
  }

  /**
   * Initialize Supabase client with platform-aware configuration.
   */
  private initializeSupabase(): void {
    // Don't initialize on SSR
    if (this.platformService.isSSR()) {
      this.loading.set(false);
      return;
    }

    const supabaseUrl = ENVIRONMENT.supabase?.url;
    const supabaseKey = ENVIRONMENT.supabase?.publicKey;

    if (!supabaseUrl || !supabaseKey) {
      this.logService.log('Supabase not configured');
      this.loading.set(false);
      return;
    }

    try {
      // Configure storage based on platform
      const storage = this.getStorageAdapter();

      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: this.platformService.isWeb(), // Only for web
        }
      });

      // Set up auth state listener
      // istanbul ignore next - Auth state callback registered in constructor; testing requires mocking Supabase SDK's internal event emitter
      this.supabase.auth.onAuthStateChange((event, session) => {
        this.logService.log(`Auth state changed: ${event}`, session?.user?.email);

        // Skip updating signals when deferred (verifyOtpWithCallback manages this manually)
        if (this.deferAuthStateUpdates) {
          this.logService.log('Auth state updates deferred, skipping signal update');
          return;
        }

        this.currentSession.set(session);
        this.currentUser.set(session?.user ?? null);

        // Track password recovery flow
        if (event === 'PASSWORD_RECOVERY') {
          this.isPasswordRecovery.set(true);
          // Auto-navigate to profile page for password reset
          setTimeout(() => {
            this.router.navigate(['/profile']);
          }, AUTH_TIMING.STATE_CHANGE_DELAY_MS);
        } else if (event === 'SIGNED_IN' && this.isPasswordRecovery()) {
          // Keep recovery flag true during sign-in that follows recovery
          // It will be cleared when user updates password or navigates away
        } else if (event === 'SIGNED_OUT') {
          this.isPasswordRecovery.set(false);
          // Redirect away from protected routes when signed out
          // This handles cases where session expires or refresh fails
          if (this.currentRouteRequiresAuth()) {
            this.logService.log('User logged out, resetting to anonymous settings');
            this.router.navigate(['/']);
          }
        }
      });

      // Initialize session
      this.initializeSession();
    } catch (error) {
      // istanbul ignore next - Error during Supabase initialization is difficult to test without mocking SDK internals
      this.logService.log('Error initializing Supabase', error);
      // istanbul ignore next - Part of constructor error handling, not reachable in unit tests
      this.loading.set(false);
    }
  }

  /**
   * Get platform-appropriate storage adapter.
   * - Web: Use default (cookies via Supabase)
   * - Tauri: Use localStorage
   * - SSR: No storage
   */
  // istanbul ignore next - Private method called only in constructor; testing requires complex localStorage mocking across platforms
  private getStorageAdapter() {
    if (this.platformService.isTauri()) {
      // For Tauri, use localStorage explicitly
      return {
        getItem: (key: string) => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            // Silently fail
          }
        },
        removeItem: (key: string) => {
          try {
            localStorage.removeItem(key);
          } catch {
            // Silently fail
          }
        },
      };
    }

    // For web, use default Supabase storage (handles cookies)
    return undefined;
  }

  /**
   * Initialize session on service startup.
   * Attempts to refresh expired sessions before clearing them.
   */
  async initializeSession(): Promise<void> {
    if (!this.supabase) {
      this.loading.set(false);
      return;
    }

    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        this.logService.log('Error getting session', error);
      } else if (data.session) {
        // Check if the session has expired
        const expiresAt = data.session.expires_at;
        const now = Math.floor(Date.now() / 1000);

        if (expiresAt && expiresAt <= now) {
          // Session is expired - attempt to refresh it
          this.logService.log('Session expired on init, attempting refresh', {
            expiresAt,
            now,
            expiredAgo: now - expiresAt
          });

          const { data: refreshed, error: refreshError } = await this.supabase.auth.refreshSession();

          if (refreshError || !refreshed.session) {
            // Refresh failed - clear the stale session
            this.logService.log('Session refresh failed, clearing stale session', refreshError);
            await this.supabase.auth.signOut();
            // User stays null, so anonymous preferences will be used
          } else {
            // Refresh succeeded - use the new session
            this.logService.log('Session refreshed successfully');
            this.currentSession.set(refreshed.session);
            this.currentUser.set(refreshed.session.user);
          }
        } else {
          // Session is valid
          this.currentSession.set(data.session);
          this.currentUser.set(data.session.user);
        }
      }
    } catch (error) {
      this.logService.log('Error initializing session', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Basic client-side username validation.
   * Server handles comprehensive validation including homoglyph normalization and profanity filtering.
   *
   * Rules:
   * - Length: 3–30 characters
   * - No control characters
   *
   * @param username - Username to validate
   * @returns true if basic validation passes
   */
  validateUsername(username: string): boolean {
    // Basic length check
    if (username.length < 3 || username.length > 30) {
      return false;
    }

    // Check for control characters (0x00-0x1F, 0x7F-0x9F)
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001F\u007F-\u009F]/.test(username)) {
      return false;
    }

    return true;
  }

  /**
   * Login with email or username and password.
   *
   * Strategy:
   * 1. Send identifier (email OR username) + password to server
   * 2. Server handles username → email lookup securely (not exposed to client)
   * 3. Server authenticates with Supabase
   * 4. Run optional beforeSession callback (e.g., storage promotion)
   * 5. Client receives session and sets it in Supabase client
   *
   * @param credentials - Login credentials (email or username + password)
   * @param beforeSession - Optional callback that runs after auth succeeds but before session is set.
   *                        Use this for storage promotion so data is ready before auth signals update.
   * @returns Authentication result
   */
  async login(credentials: LoginCredentials, beforeSession?: (userId: string) => Promise<void>): Promise<AuthResult> {
    if (!this.supabase) {
      return {
        user: null,
        session: null,
        error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError
      };
    }

    try {
      const identifier = credentials.email ?? credentials.username!;

      this.logService.log('Attempting login', identifier.includes('@') ? 'email' : 'username');

      // Use server-side login endpoint (handles username→email lookup securely)
      const response = await fetch(`${ENVIRONMENT.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          password: credentials.password
        })
      });

      const result = await response.json();

      if (!result.success || !result.session) {
        this.logService.log('Login failed', result.error);
        return {
          user: null,
          session: null,
          error: { message: result.error || 'error.Invalid credentials', status: response.status } as AuthError
        };
      }

      // Run pre-session callback (e.g., storage promotion) before auth signals update
      if (beforeSession && result.user?.id) {
        await beforeSession(result.user.id);
      }

      // Set session in Supabase client (this triggers onAuthStateChange)
      await this.supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token
      });

      this.logService.log('Login successful', result.user?.email);
      return {
        user: result.user,
        session: result.session,
        error: null
      };
    } catch (error) {
      this.logService.log('Login exception', error);
      return {
        user: null,
        session: null,
        error: { message: 'error.Login failed', status: 500 } as AuthError
      };
    }
  }

  /**
   * Sign up with email and password using email OTP verification.
   *
   * NOTE: Username is NOT stored during signup. After OTP verification,
   * the username must be created separately via UsernameService.updateUsername().
   *
   * @param email - User email
   * @param password - User password
   * @param username - Optional username (validated but not stored here)
   * @param turnstileToken - Optional Cloudflare Turnstile CAPTCHA token
   * @returns Authentication result (user will need to verify OTP)
   */
  async signUp(email: string, password: string, username?: string, turnstileToken?: string | null): Promise<AuthResult> {
    if (!this.supabase) {
      return {
        user: null,
        session: null,
        error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError
      };
    }

    try {
      // Validate username if provided
      if (username && !this.validateUsername(username)) {
        return {
          user: null,
          session: null,
          error: { message: 'error.Invalid username format', status: 400 } as AuthError
        };
      }

      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username ?? null,
            turnstile_token: turnstileToken ?? null,
            language: this.translocoService.getActiveLang(),
          }
        }
      });

      if (error) {
        this.logService.log('Sign up error', error);
        return { user: null, session: null, error };
      }

      this.logService.log('Sign up successful - awaiting OTP verification', {
        email: data.user?.email,
        userId: data.user?.id,
        hasUser: !!data.user,
        hasSession: !!data.session,
        userConfirmedAt: data.user?.email_confirmed_at,
        fullData: data
      });
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      this.logService.log('Sign up exception', error);
      return {
        user: null,
        session: null,
        error: { message: 'error.Sign up failed', status: 500 } as AuthError
      };
    }
  }

  /**
   * Verify email OTP code after signup.
   *
   * NOTE: Unlike login(), we cannot easily run a beforeSession callback here because
   * Supabase's verifyOtp automatically sets the session. For signup flows that need
   * to run code before auth signals update, use verifyOtpWithCallback() instead.
   *
   * @param email - User email
   * @param token - 6-digit OTP code from email
   * @returns Authentication result with session if successful
   */
  async verifyOtp(email: string, token: string): Promise<AuthResult> {
    if (!this.supabase) {
      return {
        user: null,
        session: null,
        error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError
      };
    }

    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });

      if (error) {
        this.logService.log('OTP verification error', error);
        return { user: null, session: null, error };
      }

      this.logService.log('OTP verification successful', data.user?.email);
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      this.logService.log('OTP verification exception', error);
      return {
        user: null,
        session: null,
        error: { message: 'error.Verification failed', status: 500 } as AuthError
      };
    }
  }

  /**
   * Verify email OTP with a callback that runs before auth signals update.
   *
   * This defers the auth state signal updates until after the callback completes.
   * Use this for signup flows that need storage promotion before components react.
   *
   * @param email - User email
   * @param token - 6-digit OTP code from email
   * @param beforeAuthUpdate - Callback that runs after OTP succeeds but before signals update
   * @returns Authentication result with session if successful
   */
  async verifyOtpWithCallback(
    email: string,
    token: string,
    beforeAuthUpdate: (userId: string) => Promise<void>
  ): Promise<AuthResult> {
    if (!this.supabase) {
      return {
        user: null,
        session: null,
        error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError
      };
    }

    // Defer auth state updates during this flow
    this.deferAuthStateUpdates = true;

    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });

      if (error) {
        this.deferAuthStateUpdates = false;
        this.logService.log('OTP verification error', error);
        return { user: null, session: null, error };
      }

      // Run the callback before applying auth state
      if (data.user?.id) {
        this.logService.log('Running pre-auth callback for user', data.user.id);
        await beforeAuthUpdate(data.user.id);
      }

      // Now apply the auth state
      this.deferAuthStateUpdates = false;
      this.logService.log('Applying deferred auth state');
      this.currentSession.set(data.session);
      this.currentUser.set(data.user);

      this.logService.log('OTP verification successful', data.user?.email);
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      this.deferAuthStateUpdates = false;
      this.logService.log('OTP verification exception', error);
      return {
        user: null,
        session: null,
        error: { message: 'error.Verification failed', status: 500 } as AuthError
      };
    }
  }

  /**
   * Resend OTP code to user's email.
   *
   * @param email - User email
   * @returns Success/error status
   */
  async resendOtp(email: string): Promise<{ error: AuthError | null }> {
    if (!this.supabase) {
      return { error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError };
    }

    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        this.logService.log('Resend OTP error', error);
        return { error };
      }

      this.logService.log('OTP resent successfully');
      return { error: null };
    } catch (error) {
      this.logService.log('Resend OTP exception', error);
      return { error: { message: 'error.Failed to resend verification code', status: 500 } as AuthError };
    }
  }

  /**
   * Logout and clear session.
   * Platform-aware: clears cookies (web) or localStorage (Tauri).
   * Only redirects to homepage if the current route requires authentication.
   */
  async logout(): Promise<void> {
    if (!this.supabase) {
      return;
    }

    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        this.logService.log('Logout error', error);
      }

      // Clear local state
      this.currentUser.set(null);
      this.currentSession.set(null);

      this.logService.log('Logout successful');

      // Only redirect if current route requires authentication
      if (this.currentRouteRequiresAuth()) {
        this.router.navigate(['/']);
      }
      // Otherwise, stay on current page (user can remain on public pages after logout)
    } catch (error) {
      this.logService.log('Logout exception', error);
    }
  }

  /**
   * Check if the current route requires authentication.
   * Uses the route path to determine if it's a protected route.
   * @returns True if the current route requires authentication
   */
  private currentRouteRequiresAuth(): boolean {
    // Get the current URL path (without query params)
    const currentUrl = this.router.url.split('?')[0];

    // List of paths that require authentication
    // Must be kept in sync with routes that use AuthGuard
    const protectedPaths = ['/profile'];

    return protectedPaths.some(path => currentUrl === path || currentUrl.startsWith(path + '/'));
  }

  /**
   * Validate the current session with Supabase.
   * Used by AuthGuard to verify session is still valid before allowing access.
   * This catches invalidated sessions (e.g., password changed on another device).
   *
   * @returns True if session is valid, false otherwise
   */
  async validateSession(): Promise<boolean> {
    if (!this.supabase || this.platformService.isSSR()) {
      return false;
    }

    try {
      // First check if we have a local session
      const { data } = await this.supabase.auth.getSession();
      if (!data.session) {
        return false;
      }

      // Attempt to refresh the session to validate the refresh token
      // This will fail if the session has been invalidated (e.g., password changed)
      const { error } = await this.supabase.auth.refreshSession();
      if (error) {
        this.logService.log('Session validation failed', error.message);
        // Clear the invalid session
        await this.logout();
        return false;
      }

      return true;
    } catch (error) {
      this.logService.log('Error validating session', error);
      return false;
    }
  }

  /**
   * Get current access token for API requests.
   * Platform-aware: works with both cookie and localStorage storage.
   *
   * Proactively refreshes if token expires within 60 seconds to prevent
   * 401 errors when devices wake from sleep/background.
   *
   * @returns Access token or null if not authenticated
   */
  async getToken(): Promise<string | null> {
    if (!this.supabase || this.platformService.isSSR()) {
      return null;
    }

    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error || !data.session) {
        return null;
      }

      // Check if token expires within 60 seconds and proactively refresh
      // This prevents 401 errors when devices wake from sleep/background
      const expiresAt = data.session.expires_at;
      if (expiresAt) {
        const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
        if (expiresIn < 60) {
          this.logService.log('Token expiring soon, refreshing...', { expiresIn });
          const { data: refreshed, error: refreshError } = await this.supabase.auth.refreshSession();
          if (!refreshError && refreshed.session) {
            return refreshed.session.access_token;
          }
          // If refresh fails and token is already expired, session is invalid
          if (expiresIn <= 0) {
            this.logService.log('Session expired and refresh failed, logging out', refreshError);
            await this.logout();
            return null;
          }
          // If refresh fails but token not yet expired, return existing token
          this.logService.log('Token refresh failed, using existing', refreshError);
        }
      }

      return data.session.access_token;
    } catch (error) {
      this.logService.log('Error getting token', error);
      return null;
    }
  }

  /**
   * Request password reset OTP email.
   * Sends a 6-digit code to the user's email for password reset.
   *
   * @param email - User email
   * @returns Success/error status
   */
  async requestPasswordReset(email: string): Promise<{ error: AuthError | null }> {
    if (!this.supabase) {
      return { error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError };
    }

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${globalThis.location.origin}/profile`,
      });

      if (error) {
        this.logService.log('Password reset OTP error', error);
        return { error };
      }

      this.logService.log('Password reset OTP email sent');
      return { error: null };
    } catch (error) {
      this.logService.log('Password reset OTP exception', error);
      return { error: { message: 'error.Password reset failed', status: 500 } as AuthError };
    }
  }

  /**
   * Verify password reset OTP code.
   *
   * @param email - User email
   * @param token - 6-digit OTP code
   * @returns Success/error status
   */
  async verifyPasswordResetOtp(email: string, token: string): Promise<{ error: AuthError | null }> {
    if (!this.supabase) {
      return { error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError };
    }

    try {
      const { error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery'
      });

      if (error) {
        this.logService.log('Password reset OTP verification error', error);
        return { error };
      }

      this.logService.log('Password reset OTP verified successfully');
      return { error: null };
    } catch (error) {
      this.logService.log('Password reset OTP verification exception', error);
      return { error: { message: 'error.Verification failed', status: 500 } as AuthError };
    }
  }

  /**
   * Update user password.
   *
   * @param newPassword - New password
   * @returns Success/error status
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    if (!this.supabase) {
      return { error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError };
    }

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        this.logService.log('Password update error', error);
        return { error };
      }

      this.logService.log('Password updated successfully');

      // Clear password recovery flag after successful update
      this.isPasswordRecovery.set(false);

      return { error: null };
    } catch (error) {
      this.logService.log('Password update exception', error);
      return { error: { message: 'error.Password update failed', status: 500 } as AuthError };
    }
  }

  /**
   * Update user email address.
   * Sends verification email to new address.
   * User must enter OTP code from email to confirm change.
   */
  async updateEmail(newEmail: string): Promise<{ error: AuthError | null }> {
    if (!this.supabase) {
      return { error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError };
    }

    try {
      const { error } = await this.supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        this.logService.log('Email update error', error);
        return { error };
      }

      this.logService.log('Email update initiated, verification sent');
      return { error: null };
    } catch (error) {
      this.logService.log('Email update exception', error);
      return { error: { message: 'error.Email update failed', status: 500 } as AuthError };
    }
  }

  /**
   * Verify email change with OTP code.
   * Completes the email address update after user enters the 6-digit code.
   *
   * @param newEmail - The new email address to verify
   * @param token - 6-digit OTP code from email
   * @returns Success/error status
   */
  async verifyEmailChangeOtp(newEmail: string, token: string): Promise<{ error: AuthError | null }> {
    if (!this.supabase) {
      return { error: { message: 'error.Authentication service not initialized', status: 500 } as AuthError };
    }

    try {
      const { error } = await this.supabase.auth.verifyOtp({
        email: newEmail,
        token,
        type: 'email_change'
      });

      if (error) {
        this.logService.log('Email change OTP verification error', error);
        return { error };
      }

      this.logService.log('Email change verified successfully');
      return { error: null };
    } catch (error) {
      this.logService.log('Email change OTP verification exception', error);
      return { error: { message: 'error.Verification failed', status: 500 } as AuthError };
    }
  }

  /**
   * Export all user data in JSON format (GDPR data portability).
   *
   * Downloads a JSON file containing all user data from the database.
   *
   * @returns Success/error status
   */
  async exportUserData(): Promise<{ error: Error | null }> {
    if (!this.supabase) {
      return { error: new Error('Supabase not initialized') };
    }

    try {
      const session = await this.supabase.auth.getSession();
      if (!session.data.session) {
        return { error: new Error('Not authenticated') };
      }

      const token = session.data.session.access_token;
      const response = await fetch(`${ENVIRONMENT.baseUrl}/api/auth/export-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.error || 'Failed to export data') };
      }

      // Download the JSON file
      const blob = await response.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();

      this.logService.log('User data exported successfully');
      return { error: null };
    } catch (error) {
      this.logService.log('Data export exception', error);
      return { error: error as Error };
    }
  }

  /**
   * Delete user account and all associated data.
   *
   * WARNING: This action is irreversible!
   * Deletes:
   * - User account
   * - All user data (usernames, settings, etc.)
   * - All sessions
   *
   * @returns Success/error status
   */
  async deleteAccount(): Promise<{ error: Error | null }> {
    if (!this.supabase) {
      return { error: new Error('Supabase not initialized') };
    }

    try {
      const session = await this.supabase.auth.getSession();
      if (!session.data.session) {
        return { error: new Error('Not authenticated') };
      }

      const token = session.data.session.access_token;
      const response = await fetch(`${ENVIRONMENT.baseUrl}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: new Error(errorData.error || 'Failed to delete account') };
      }

      this.logService.log('Account deleted successfully');

      // Clear local auth state
      this.currentUser.set(null);
      this.currentSession.set(null);

      return { error: null };
    } catch (error) {
      this.logService.log('Account deletion exception', error);
      return { error: error as Error };
    }
  }
}

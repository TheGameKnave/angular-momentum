import { ChangeDetectionStrategy, Component, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '@app/services/auth.service';
import { AuthUiStateService } from '@app/services/auth-ui-state.service';
import { UserSettingsService } from '@app/services/user-settings.service';
import { UsernameService } from '@app/services/username.service';
import { AuthGuard } from '@app/guards/auth.guard';
import { AnchorMenuComponent } from '@app/components/menus/anchor-menu/anchor-menu.component';
import { AuthLoginComponent } from './auth/auth-login/auth-login.component';
import { AuthSignupComponent } from './auth/auth-signup/auth-signup.component';
import { AuthResetComponent } from './auth/auth-reset/auth-reset.component';
import { AuthOtpComponent } from './auth/auth-otp/auth-otp.component';
import { AuthProfileComponent } from './auth/auth-profile/auth-profile.component';
import { AUTO_CLOSE_TIMERS } from '@app/constants/auth.constants';

import type { AuthMode } from '@app/services/auth-ui-state.service';
import { LogService } from '@app/services/log.service';

/**
 * Auth menu component that coordinates authentication flows.
 *
 * Parent component that:
 * - Manages mode switching between login/signup/reset/otp
 * - Provides anchor menu wrapper
 * - Handles navigation between child auth components
 * - Displays profile when authenticated
 * - Auto-opens with login mode when user tries to access protected routes
 * - Keeps user on current page after successful login (no navigation)
 */
@Component({
  selector: 'app-menu-auth',
  templateUrl: './menu-auth.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    AnchorMenuComponent,
    AuthLoginComponent,
    AuthSignupComponent,
    AuthResetComponent,
    AuthOtpComponent,
    AuthProfileComponent,
  ],
})
export class MenuAuthComponent implements AfterViewInit {
  @ViewChild(AnchorMenuComponent) anchorMenu!: AnchorMenuComponent;

  /** Auto-close timer in seconds (0 = no timer) */
  readonly autoCloseTimer = signal<number>(AUTO_CLOSE_TIMERS.NONE);

  /** Current route URL as a signal */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ),
    { initialValue: new NavigationEnd(0, this.router.url, this.router.url) }
  );

  /** Check if current route is profile page */
  readonly isProfileRoute = computed(() =>
    this.currentUrl()?.urlAfterRedirects === '/profile'
  );

  constructor(
    protected readonly authService: AuthService,
    protected readonly authUiState: AuthUiStateService,
    private readonly userSettingsService: UserSettingsService,
    private readonly usernameService: UsernameService,
    private readonly router: Router,
    private readonly logService: LogService,
  ) {}

  /**
   * After view init, check for returnUrl in auth service and auto-open menu
   */
  ngAfterViewInit(): void {
    // Check if auth service has a returnUrl (set by auth guard)
    if (this.authService.hasReturnUrl() && !this.authService.isAuthenticated()) {
      this.authUiState.setMode('login'); // Switch to login mode for protected routes
      setTimeout(() => this.anchorMenu.open(), 0); // Open menu after view init
    }
  }

  /**
   * Set the auth mode (login, signup, or reset)
   */
  setMode(newMode: AuthMode): void {
    this.authUiState.setMode(newMode);
  }

  /**
   * Handle login success - initialize user settings and close menu
   * User stays on current page (no navigation)
   */
  async onLoginSuccess(): Promise<void> {
    // Initialize user settings (load or create with detected timezone)
    await this.userSettingsService.initialize();

    // Load username
    await this.usernameService.loadUsername();

    // Show timer and delay before closing
    this.autoCloseTimer.set(AUTO_CLOSE_TIMERS.LOGIN);
    setTimeout(() => {
      this.autoCloseTimer.set(AUTO_CLOSE_TIMERS.NONE);
      this.anchorMenu.close();
    }, AUTO_CLOSE_TIMERS.LOGIN * 1000);
  }

  /**
   * Handle signup success - show OTP verification
   */
  onSignupSuccess(data: { email: string; username?: string }): void {
    this.authUiState.startOtpVerification(data.email, data.username);
  }

  /**
   * Handle OTP verification success - initialize user settings, create username, and close menu
   */
  async onVerifySuccess(): Promise<void> {
    this.logService.log('OTP verification success - starting initialization');

    // Initialize user settings (load or create with detected timezone)
    await this.userSettingsService.initialize();
    this.logService.log('User settings initialized');

    // Create username in database if one was provided during signup
    const username = this.authUiState.pendingUsername();
    if (username) {
      try {
        await this.usernameService.updateUsername(username, true); // isSignupFlow = true
        this.logService.log('Username created');
      } catch (error) {
        console.error('[MenuAuth] Failed to create username after signup:', error);
        // Don't block login flow if username creation fails
        // User can set username later in profile page
      }
    }

    // Load username (either the one just created or null if none)
    await this.usernameService.loadUsername();
    this.logService.log('Username loaded');

    // Clear pending data
    this.authUiState.clearOtpVerification();

    // Show timer and delay before closing (to read any warnings)
    this.logService.log(`Setting timer and auto-close in ${AUTO_CLOSE_TIMERS.OTP_VERIFICATION} seconds`);
    this.autoCloseTimer.set(AUTO_CLOSE_TIMERS.OTP_VERIFICATION);
    setTimeout(() => {
      this.logService.log('Timeout fired - closing menu now');
      this.autoCloseTimer.set(AUTO_CLOSE_TIMERS.NONE);
      this.anchorMenu.close();
    }, AUTO_CLOSE_TIMERS.OTP_VERIFICATION * 1000);
  }

  /**
   * Handle back to signup from OTP
   */
  onBackToSignup(): void {
    this.authUiState.clearOtpVerification();
  }

  /**
   * Handle password reset success - user is already authenticated, close menu
   */
  async onResetSuccess(): Promise<void> {
    // User is already authenticated from OTP verification
    // Initialize user settings (load or create with detected timezone)
    await this.userSettingsService.initialize();

    // Load username
    await this.usernameService.loadUsername();

    // Close menu immediately (user is being navigated to profile)
    this.anchorMenu.close();
  }

  /**
   * Handle switch to reset - prefill email from login form
   */
  onSwitchToReset(email: string): void {
    this.authUiState.setLoginFormEmail(email);
    this.authUiState.setMode('reset');
  }

  /**
   * Handle view profile - close menu and navigate to profile page
   */
  onViewProfile(): void {
    this.anchorMenu.close();
    this.router.navigate(['/profile']);
  }

  /**
   * Handle logout - close menu, clear user settings and username, and logout
   * Only redirects to home if currently on an auth-guarded route
   */
  async onLogout(): Promise<void> {
    this.anchorMenu.close();
    this.userSettingsService.clear();
    this.usernameService.clear();
    this.authUiState.reset();

    // Check if current route has AuthGuard
    const requiresAuth = this.isCurrentRouteAuthGuarded();

    await this.authService.logout();

    // Only redirect if on an auth-guarded route
    if (requiresAuth) {
      await this.router.navigate(['/']);
    }
  }

  /**
   * Check if the current route requires authentication by inspecting its guards.
   * Returns true if the current route has AuthGuard in its canActivate array.
   */
  private isCurrentRouteAuthGuarded(): boolean {
    const currentRoute = this.router.routerState.root;
    let route = currentRoute;

    // Traverse down to the deepest activated route
    while (route.firstChild) {
      route = route.firstChild;
    }

    // Check if the route has canActivate guards
    const guards = route.routeConfig?.canActivate;
    if (!guards || guards.length === 0) {
      return false;
    }

    // Check if AuthGuard is in the guards array (direct reference comparison)
    return guards.includes(AuthGuard);
  }
}

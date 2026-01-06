import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that protects authenticated routes.
 *
 * Validates the session with Supabase before allowing access.
 * This ensures that even if a cached session exists, it's still valid
 * (e.g., hasn't been invalidated by a password change on another device).
 *
 * Redirects to login page with return URL for post-login redirect.
 *
 * @example
 * ```typescript
 * // In routing configuration
 * {
 *   path: 'profile',
 *   component: ProfileComponent,
 *   canActivate: [AuthGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);


  /**
   * Determines if a route can be activated based on authentication status.
   * Validates the session with Supabase to ensure it's still valid.
   * During SSR, redirects to home since auth state isn't available server-side.
   *
   * @param route - Activated route snapshot
   * @param state - Router state snapshot
   * @returns Promise resolving to true if authenticated, UrlTree for redirect if not
   */
  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    // During SSR, redirect to home - we can't verify auth server-side
    // Client will handle proper auth after hydration
    // istanbul ignore next - SSR guard, not testable in browser
    if (!isPlatformBrowser(this.platformId)) {
      return this.router.createUrlTree(['/']);
    }

    // Validate session with Supabase before allowing access
    // This catches invalidated sessions (e.g., password changed on another device)
    const isValid = await this.authService.validateSession();
    if (isValid) {
      return true;
    }

    // Not authenticated or session invalid - store return URL and redirect to homepage
    // Auth menu will automatically open when returnUrl is set in service
    this.authService.setReturnUrl(state.url);
    return this.router.createUrlTree(['/']);
  }
}

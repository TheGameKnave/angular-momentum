import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that protects authenticated routes.
 *
 * Prevents unauthorized users from accessing protected routes.
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
   * During SSR, allows access since auth state isn't available server-side.
   *
   * @param route - Activated route snapshot
   * @param state - Router state snapshot
   * @returns True if authenticated or during SSR, UrlTree for redirect if not
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    // During SSR, allow access - client will re-check after hydration
    // istanbul ignore next - SSR guard, not testable in browser
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    // Check if user is authenticated
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Not authenticated - store return URL and redirect to homepage
    // Auth menu will automatically open when returnUrl is set in service
    this.authService.setReturnUrl(state.url);
    return this.router.createUrlTree(['/']);
  }
}

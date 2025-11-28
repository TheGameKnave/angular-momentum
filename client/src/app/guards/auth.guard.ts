import { Injectable } from '@angular/core';
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
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  /**
   * Determines if a route can be activated based on authentication status.
   *
   * @param route - Activated route snapshot
   * @param state - Router state snapshot
   * @returns True if authenticated, UrlTree for redirect if not
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
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

import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard for public-only routes (e.g., login, signup).
 *
 * Prevents authenticated users from accessing auth pages.
 * Redirects to profile or home page if already logged in.
 *
 * @example
 * ```typescript
 * // In routing configuration
 * {
 *   path: 'login',
 *   component: LoginComponent,
 *   canActivate: [PublicGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class PublicGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);


  /**
   * Determines if a public route can be activated.
   * Redirects authenticated users away from public-only pages.
   *
   * @param route - Activated route snapshot
   * @param state - Router state snapshot
   * @returns True if not authenticated, UrlTree for redirect if authenticated
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean | UrlTree {
    // Check if user is authenticated
    if (this.authService.isAuthenticated()) {
      // Already logged in - redirect to profile or return URL
      const returnUrl = route.queryParams['returnUrl'] || '/profile';
      return this.router.createUrlTree([returnUrl]);
    }

    // Not authenticated - allow access to public page
    return true;
  }
}

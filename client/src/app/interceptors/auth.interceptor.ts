import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, switchMap, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PlatformService } from '../services/platform.service';

/**
 * HTTP interceptor for adding authentication tokens to requests.
 *
 * Platform-aware behavior:
 * - Web: Adds Bearer token to Authorization header for custom API routes
 * - Tauri: Adds Bearer token to Authorization header
 * - SSR: No-op (server handles auth separately)
 *
 * Also handles 401 responses by logging out the user when the session is invalid.
 * This catches cases where the token appeared valid locally but was rejected by the server.
 * Always redirects to home on 401 since the user was attempting authenticated content.
 *
 * @example
 * ```typescript
 * // In main.config.ts
 * provideHttpClient(
 *   withInterceptors([authInterceptor])
 * )
 * ```
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const platformService = inject(PlatformService);
  const router = inject(Router);

  // Skip auth for SSR
  if (platformService.isSSR()) {
    return next(req);
  }

  // For both web and Tauri, add Bearer token to Authorization header
  // This is needed for custom API routes (e.g., /api/user-settings)
  return from(authService.getToken()).pipe(
    switchMap(token => {
      if (token) {
        // Clone request and add Authorization header
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(authReq).pipe(
          tap({
            error: (error: unknown) => {
              // If we sent a token but got 401, the session is invalid - log out and redirect
              // Always redirect to home since user was attempting authenticated content
              // Navigate FIRST to prevent brief flash of logged-out state on auth-protected pages
              if (error instanceof HttpErrorResponse && error.status === 401 && authService.isAuthenticated()) {
                router.navigate(['/']);
                authService.logout();
              }
            }
          })
        );
      }
      return next(req);
    })
  );
};

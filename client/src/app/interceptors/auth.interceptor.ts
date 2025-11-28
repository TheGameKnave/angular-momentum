import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
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
 * Note: Does not redirect on 401 errors to avoid interrupting user flows.
 * Auth guards handle access control, not the interceptor.
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
        return next(authReq);
      }
      return next(req);
    })
  );
};

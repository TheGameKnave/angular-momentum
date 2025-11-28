import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { HelpersService } from '@app/services/helpers.service';

/**
 * Route guard that protects routes based on feature flag configuration.
 *
 * This guard checks if a route corresponds to an enabled component by comparing
 * the route path against the list of enabled components from the feature flag service.
 * If the route is not enabled, the user is redirected to the home page.
 *
 * @example
 * // In routing configuration
 * {
 *   path: 'some-feature',
 *   component: SomeComponent,
 *   canActivate: [FeatureFlagGuard]
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class FeatureFlagGuard implements CanActivate {

  constructor(
    private readonly router: Router,
    private readonly helpersService: HelpersService,
    private readonly slugPipe: SlugPipe,
  ){}

  /**
   * Determines if a route can be activated based on feature flag configuration.
   * Compares the requested route path against the list of enabled component routes.
   * Enabled routes are derived from the feature flag service and transformed into
   * URL-friendly slugs. If the route is not enabled, redirects to the home page.
   * @param route - The activated route snapshot containing the route information
   * @returns True if the route is enabled and can be activated, false otherwise
   */
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const routePath = route.url.join('');
    const enabledRoutes = this.helpersService.enabledComponents().map(component => this.slugPipe.transform(component.name));
    if (!enabledRoutes.includes(routePath)) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}
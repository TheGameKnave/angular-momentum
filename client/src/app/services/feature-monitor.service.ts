import { effect, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HelpersService } from '@app/services/helpers.service';
import { SlugPipe } from '@app/pipes/slug.pipe';

/**
 * Service for monitoring and enforcing feature flag-based routing.
 *
 * Automatically redirects users away from disabled features by monitoring
 * the current route and comparing it against enabled components.
 *
 * Features:
 * - Reactive routing enforcement using Angular effects
 * - Automatic redirect to home when accessing disabled features
 * - URL slug matching against enabled component list
 *
 * Side effects:
 * - Runs an effect that monitors router URL and enabled components
 * - Navigates to '/' when current route is not in allowed list
 */
@Injectable({ providedIn: 'root' })
export class  FeatureMonitorService {
  private readonly router = inject(Router);
  private readonly helpersService = inject(HelpersService);
  private readonly slugPipe = inject(SlugPipe);

  // Static routes that are not feature-flagged
  private readonly staticRoutes = ['', 'profile', 'privacy'];

  constructor() {
    effect(() => {
      // Read enabledComponents signal to establish reactive dependency
      const allowed = this.helpersService.enabledComponents().map(c =>
        this.slugPipe.transform(c.name)
      );

      // Get current route (not reactive, but effect re-runs when enabledComponents changes)
      const url = this.router.url;
      const currentSegment = url.split('/').filter(Boolean)[0] ?? '';

      // Skip check for static routes (home, profile, privacy)
      if (this.staticRoutes.includes(currentSegment)) {
        return;
      }

      if (currentSegment && !allowed.includes(currentSegment)) {
        this.router.navigate(['/']);
      }
    });
  }
}

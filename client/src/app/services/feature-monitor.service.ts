import { effect, Injectable } from '@angular/core';
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
  constructor(
    private readonly router: Router,
    private readonly helpersService: HelpersService,
    private readonly slugPipe: SlugPipe,
  ) {
    effect(() => {
      const url = this.router.url;
      const currentSegment = url.split('/').filter(Boolean)[0] ?? '';
      const allowed = this.helpersService.enabledComponents().map(c =>
        this.slugPipe.transform(c.name)
      );

      if (currentSegment && !allowed.includes(currentSegment)) {
        this.router.navigate(['/']);
      }
    });
  }
}

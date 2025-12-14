import { computed, Injectable, inject } from '@angular/core';
import { ENVIRONMENT } from 'src/environments/environment';
import { FeatureFlagService } from './feature-flag.service';
import { COMPONENT_LIST } from '@app/helpers/component-list';

/**
 * Service providing helper utilities.
 *
 * Features:
 * - Computed signal for enabled components based on feature flags
 * - Development mode debugging (exposes service on window object)
 * - Reactive updates when feature flags change
 */
@Injectable({
  providedIn: 'root',
})
export class HelpersService {
  private readonly featureFlagService = inject(FeatureFlagService);

  constructor() {
    // istanbul ignore next - dev tool exposure, ENVIRONMENT.env is 'test' in unit tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (globalThis.window && ENVIRONMENT.env !== 'production') (globalThis.window as any).helpersService = this;
  }

  /**
   * Computed signal providing list of components that are enabled.
   * - Components with `featureFlagged: true` are controlled by feature flags (fail-closed)
   * - Components without `featureFlagged` or with `featureFlagged: false` are always enabled
   * Automatically updates when feature flags change.
   * @returns Array of enabled components
   */
  enabledComponents = computed(() =>
    COMPONENT_LIST.filter((component) => {
      // Components not governed by feature flags are always enabled
      if (!('featureFlagged' in component) || !component.featureFlagged) {
        return true;
      }
      // Feature-flagged components use fail-closed logic
      return this.featureFlagService.getFeature(component.name);
    })
  );
}

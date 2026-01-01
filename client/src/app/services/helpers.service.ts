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
   * - Components without `featureFlagged` or with `featureFlagged: false` are always enabled
   * - Components with `featureFlagged: true` use fail-closed logic: only shown when explicitly enabled
   * Automatically updates when feature flags change.
   * @returns Array of enabled components
   */
  enabledComponents = computed(() => {
    // Read signals directly to establish reactive dependencies
    const loaded = this.featureFlagService.loaded();
    const features = this.featureFlagService.features();

    return COMPONENT_LIST.filter((component) => {
      // Components not governed by feature flags are always enabled
      if (!('featureFlagged' in component) || !component.featureFlagged) {
        return true;
      }
      // Feature-flagged components use fail-closed logic:
      // - Hidden until flags have loaded
      // - Only shown when explicitly set to true
      if (!loaded) {
        return false;
      }
      return features[component.name] === true;
    });
  });
}

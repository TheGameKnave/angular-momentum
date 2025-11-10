import { computed, Injectable } from '@angular/core';
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
  constructor(
    private readonly featureFlagService: FeatureFlagService,
  ) {
    // istanbul ignore next
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (ENVIRONMENT.env !== 'production') (window as any).helpersService = this;
  }

  /**
   * Computed signal providing list of components that are enabled via feature flags.
   * Filters the application's component list based on feature flags,
   * providing a reactive list of enabled components.
   * Automatically updates when feature flags change.
   * @returns Array of components where their corresponding feature flag is not false
   */
  enabledComponents = computed(() =>
    COMPONENT_LIST.filter(
      (component) => this.featureFlagService.getFeature(component.name) !== false
    )
  );
}

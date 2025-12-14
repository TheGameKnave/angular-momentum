import { inject, provideAppInitializer } from "@angular/core";
import { Observable } from "rxjs";
import { FeatureFlagService } from "@app/services/feature-flag.service";
import { FeatureFlagResponse } from "@app/models/data.model";

/**
 * Initializes the feature flag service during application startup.
 *
 * Creates and returns a function that fetches feature flags from the server.
 * This function is executed during the application initialization phase to
 * ensure feature flags are loaded before the application fully starts.
 *
 * @returns A function that returns an Observable of FeatureFlagResponse
 *
 * @internal
 */
function initializeFeatureFlag(): () => Observable<FeatureFlagResponse> {
  const featureFlagService = inject(FeatureFlagService);
  return () => featureFlagService.getFeatureFlags();
}

/**
 * Provides application initialization for feature flags.
 *
 * This provider ensures that feature flags are loaded during the application
 * bootstrap process, before any components are rendered. It uses Angular's
 * APP_INITIALIZER token to fetch and cache feature flag configuration from
 * the server, making them available throughout the application lifecycle.
 *
 * @returns An Angular provider that initializes feature flags at app startup
 *
 * @example
 * // In app.config.ts or main.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideFeatureFlag(),
 *     // ... other providers
 *   ]
 * };
 */
export const provideFeatureFlag = () => (provideAppInitializer(() => {
        const initializerFn = (initializeFeatureFlag)();
        return initializerFn();
      }))
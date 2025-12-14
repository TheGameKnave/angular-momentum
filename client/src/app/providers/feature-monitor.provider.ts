import { inject, provideAppInitializer } from "@angular/core";
import { FeatureMonitorService } from "@app/services/feature-monitor.service";

/**
 * Initializes the feature monitor service during application startup.
 *
 * Creates and instantiates the FeatureMonitorService, which runs an effect
 * that monitors the router URL and redirects users away from disabled features.
 * This ensures the service is active from app startup without needing to inject
 * it into individual components.
 *
 * @returns A function that instantiates the FeatureMonitorService
 *
 * @internal
 */
function initializeFeatureMonitor(): () => void {
  inject(FeatureMonitorService);
  // Service instantiation is sufficient - the effect in its constructor
  // will handle monitoring and redirecting
  return () => {
    // No-op: service is already instantiated and running
  };
}

/**
 * Provides application initialization for feature monitoring.
 *
 * This provider ensures that feature-based routing enforcement is active
 * from application startup. It instantiates the FeatureMonitorService during
 * the bootstrap process, which runs an effect to monitor the router and
 * redirect users away from disabled features.
 *
 * This eliminates the need to inject FeatureMonitorService into individual
 * feature components just to instantiate it.
 *
 * @returns An Angular provider that initializes feature monitoring at app startup
 *
 * @example
 * // In app.config.ts or main.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideFeatureMonitor(),
 *     // ... other providers
 *   ]
 * };
 */
export const provideFeatureMonitor = () => provideAppInitializer(() => {
  const initializerFn = initializeFeatureMonitor();
  return initializerFn();
});

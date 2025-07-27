import { inject, provideAppInitializer } from "@angular/core";
import { Observable } from "rxjs";
import { FeatureFlagService } from "@app/services/feature-flag.service";

function initializeFeatureFlag(): () => Observable<any> {
  const featureFlagService = inject(FeatureFlagService);
  return () => featureFlagService.getFeatureFlags();
}

export const provideFeatureFlag = () => (provideAppInitializer(() => {
        const initializerFn = (initializeFeatureFlag)();
        return initializerFn();
      }))
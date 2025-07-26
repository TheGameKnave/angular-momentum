import { inject, provideAppInitializer } from "@angular/core";
import { Observable } from "rxjs";
import { FeatureFlagService } from "@app/services/feature-flag.service";
import { FeatureFlagResponse } from "@app/models/data.model";

function initializeFeatureFlag(): () => Observable<FeatureFlagResponse> {
  const featureFlagService = inject(FeatureFlagService);
  return () => featureFlagService.getFeatureFlags();
}

export const provideFeatureFlag = () => (provideAppInitializer(() => {
        const initializerFn = (initializeFeatureFlag)();
        return initializerFn();
      }))
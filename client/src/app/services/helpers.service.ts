import { computed, Injectable } from '@angular/core';
import { ENVIRONMENT } from 'src/environments/environment';
import { FeatureFlagService } from './feature-flag.service';
import { COMPONENT_LIST } from '@app/helpers/component-list';

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

  enabledComponents = computed(() =>
    COMPONENT_LIST.filter(
      (component) => this.featureFlagService.getFeature(component.name) !== false
    )
  );
}

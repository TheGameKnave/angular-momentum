import { computed, Injectable } from '@angular/core';
import { ENVIRONMENT } from 'src/environments/environment';
import { FeatureFlagService } from './feature-flag.service';
import { ComponentListService } from './component-list.service';

@Injectable({
  providedIn: 'root',
})
export class HelpersService {
  constructor(
    private featureFlagService: FeatureFlagService,
    private componentListService: ComponentListService,
  ) {
    // istanbul ignore next
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (ENVIRONMENT.env !== 'production') (window as any).helpersService = this;
  }

  enabledComponents = computed(() =>
    this.componentListService.getComponentList().filter(
      (component) => this.featureFlagService.getFeature(component.name) !== false
    )
  );
}

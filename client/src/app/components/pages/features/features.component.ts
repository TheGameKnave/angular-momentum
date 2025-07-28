import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { TranslocoDirective} from '@jsverse/transloco';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { Subscription } from 'rxjs';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
    selector: 'app-features',
    imports: [
        TranslocoDirective,
        ReactiveFormsModule,
        CheckboxModule,
    ],
    templateUrl: './features.component.html',
})
export class FeaturesComponent implements OnInit, OnDestroy {
  featureControls: { [key: string]: FormControl } = {};
  featureSubs: Subscription[] = [];
  features$ = toObservable(this.featureFlagService.features);
  Object = Object;
  constructor(
    protected featureFlagService: FeatureFlagService,
  ){}
  ngOnInit() {
    Object.keys(this.featureFlagService.features()).forEach((feature) => {
      this.featureControls[feature] = new FormControl(this.featureFlagService.getFeature(feature));
      const controlSubscription = this.featureControls[feature].valueChanges.subscribe((value) => {
        this.featureFlagService.setFeature(feature, value);
      });
      this.featureSubs.push(controlSubscription);
    });
  
    this.features$.subscribe(features => {
      Object.keys(features).forEach((feature) => {
        if (this.featureControls.hasOwnProperty(feature) && this.featureControls[feature].value !== features[feature]) {
          this.featureControls[feature].setValue(features[feature]);
        }
      });
    });
  }

  featureControl(feature: string): FormControl {
    return this.featureControls[feature];
  }

  ngOnDestroy(): void {
    this.featureSubs?.forEach((sub) => sub.unsubscribe());
  }
}

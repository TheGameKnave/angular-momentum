import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslocoDirective} from '@jsverse/transloco';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-features',
    imports: [
        TranslocoDirective,
        ReactiveFormsModule,
    ],
    templateUrl: './features.component.html',
})
export class FeaturesComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  protected featureFlagService = inject(FeatureFlagService);

  featureControls: Record<string, FormControl> = {};
  featureSubs: Subscription[] = [];
  features$ = toObservable(this.featureFlagService.features);
  Object = Object;
  ngOnInit() {
    Object.keys(this.featureFlagService.features()).forEach((feature) => {
      this.featureControls[feature] = new FormControl(this.featureFlagService.getFeature(feature));
      const controlSubscription = this.featureControls[feature].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
        this.featureFlagService.setFeature(feature, value);
      });
      this.featureSubs.push(controlSubscription);
    });
  
    // TODO make into a signal receptor
    this.features$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(features => {
      Object.keys(features).forEach((feature) => {
        if (feature in this.featureControls.hasOwnProperty && this.featureControls[feature].value !== features[feature]) {
          this.featureControls[feature].setValue(features[feature]);
        }
      });
    });
  }

  featureControl(feature: string): FormControl {
    return this.featureControls[feature];
  }

  ngOnDestroy(): void {
    this.featureSubs.forEach((sub) => sub.unsubscribe());
  }
}

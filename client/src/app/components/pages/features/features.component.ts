import { ChangeDetectionStrategy, Component, DestroyRef, effect, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective} from '@jsverse/transloco';
import { FeatureFlagService, FeatureFlagKeys } from '@app/services/feature-flag.service';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CardModule } from 'primeng/card';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { ConnectivityService } from '@app/services/connectivity.service';

@Component({
  selector: 'app-features',
  templateUrl: './features.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    CheckboxModule,
    ToggleSwitchModule,
    CardModule,
  ],
})
export class FeaturesComponent implements OnInit {
  Object = Object;
  featureForm = new FormGroup<Record<string, FormControl>>({});

  constructor(
    protected featureFlagService: FeatureFlagService,
    readonly destroyRef: DestroyRef,
    private readonly featureMonitorService: FeatureMonitorService,
    protected readonly connectivity: ConnectivityService,
  ){
    // Keep form in sync with signal changes
    effect(() => {
      const features = this.featureFlagService.features();
      this.featureForm.patchValue(features, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.connectivity.start();

    // Build form controls based on current feature flags
    const features = this.featureFlagService.features();
    Object.keys(features).forEach(key => {
      this.featureForm.addControl(key, new FormControl(features[key as FeatureFlagKeys]));
    });

    // Watch form changes
    this.featureForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((formValues) => {
        Object.keys(formValues).forEach(key => {
          this.featureFlagService.setFeature(key as FeatureFlagKeys, formValues[key]);
        });
      });
  }

  featureControl(name: string): FormControl {
    return this.featureForm.get(name) as FormControl;
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, effect, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective} from '@jsverse/transloco';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-features',
  templateUrl: './features.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    CheckboxModule,
  ],
})
export class FeaturesComponent implements OnInit {
  Object = Object;
  featureForm = new FormGroup<Record<string, FormControl>>({});

  constructor(
    protected featureFlagService: FeatureFlagService,
    readonly destroyRef: DestroyRef,
  ) {
    // Keep form in sync with signal changes
    effect(() => {
      const features = this.featureFlagService.features();
      this.featureForm.patchValue(features, { emitEvent: false });
    });
  }

  ngOnInit(): void {

    // Build form controls based on current feature flags
    const features = this.featureFlagService.features();
    for (const key in features) {
      this.featureForm.addControl(key, new FormControl(features[key]));
    }

    // Watch form changes
    this.featureForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((formValues) => {
        for (const key in formValues) {
          this.featureFlagService.setFeature(key, formValues[key]);
        }
      });
  }

  featureControl(name: string): FormControl {
    return this.featureForm.get(name) as FormControl;
  }
}

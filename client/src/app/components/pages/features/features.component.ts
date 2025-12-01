import { ChangeDetectionStrategy, Component, DestroyRef, effect, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective} from '@jsverse/transloco';
import { FeatureFlagService, FeatureFlagKeys } from '@app/services/feature-flag.service';
import { getFeatureTranslationKey } from '@app/constants/translations.constants';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ConnectivityService } from '@app/services/connectivity.service';
import { AuthService } from '@app/services/auth.service';

/**
 * Features component that provides a UI for managing application feature flags.
 *
 * This component displays a form with toggle controls for each feature flag,
 * allowing users to enable or disable features in real-time. Changes are
 * persisted and synchronized across the application using signals,
 * as well as up to the server, to update distributed clients.
 */
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
    MessageModule,
  ],
})
export class FeaturesComponent implements OnInit {
  Object = Object;
  featureForm = new FormGroup<Record<string, FormControl>>({});
  featureKey = getFeatureTranslationKey;

  constructor(
    protected featureFlagService: FeatureFlagService,
    readonly destroyRef: DestroyRef,
    protected readonly connectivity: ConnectivityService,
    protected readonly authService: AuthService,
  ){
    // Keep form in sync with signal changes
    effect(() => {
      const features = this.featureFlagService.features();
      this.featureForm.patchValue(features, { emitEvent: false });
    });

    // Enable/disable form controls based on authentication
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();
      Object.keys(this.featureForm.controls).forEach(key => {
        const control = this.featureForm.get(key);
        if (isAuthenticated) {
          control?.enable({ emitEvent: false });
        } else {
          control?.disable({ emitEvent: false });
        }
      });
    });
  }

  /**
   * Angular lifecycle hook called after component initialization.
   * Starts the connectivity service, builds form controls for all feature flags,
   * and subscribes to form value changes to update feature flag settings in real-time.
   */
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

  /**
   * Retrieves a specific form control for a feature flag by name.
   * @param name - The name of the feature flag
   * @returns The FormControl for the specified feature
   */
  featureControl(name: string): FormControl {
    return this.featureForm.get(name) as FormControl;
  }
}

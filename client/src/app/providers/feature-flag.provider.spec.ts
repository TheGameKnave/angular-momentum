import { TestBed } from '@angular/core/testing';
import { provideFeatureFlag } from '@app/providers/feature-flag.provider';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { APP_INITIALIZER } from '@angular/core';

describe('provideFeatureFlag', () => {
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;

  beforeEach(() => {
    featureFlagService = jasmine.createSpyObj('FeatureFlagService', ['getFeatureFlags']);
    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureFlagService, useValue: featureFlagService },
        provideFeatureFlag(),
      ],
    });
  });

  it('should call getFeatureFlags when the useFactory function is called', () => {
    TestBed.inject(APP_INITIALIZER);
    expect(featureFlagService.getFeatureFlags).toHaveBeenCalledTimes(1);
  });
});
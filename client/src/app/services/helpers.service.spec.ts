import { TestBed } from '@angular/core/testing';
import { HelpersService } from '@app/services/helpers.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { COMPONENT_LIST } from '@app/helpers/component-list';
import { ENVIRONMENT } from 'src/environments/environment';

describe('HelpersService', () => {
  let service: HelpersService;
  let featureFlagServiceSpy: jasmine.SpyObj<FeatureFlagService>;

  beforeEach(() => {
    featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);

    TestBed.configureTestingModule({
      providers: [
        HelpersService,
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: ENVIRONMENT, useValue: { env: 'testing' } },
      ],
    });

    service = TestBed.inject(HelpersService);
  });

  afterEach(() => {
    delete (window as any).helpersService;
  });

  // Derive expected counts from COMPONENT_LIST structure
  const nonFlaggedComponents = COMPONENT_LIST.filter(c => !('featureFlagged' in c) || !c.featureFlagged);
  const flaggedComponents = COMPONENT_LIST.filter(c => 'featureFlagged' in c && c.featureFlagged);

  it('should always include non-feature-flagged components', () => {
    featureFlagServiceSpy.getFeature.and.returnValue(false);

    const allowed = service.enabledComponents();

    // Non-feature-flagged components should always be included
    nonFlaggedComponents.forEach(c => {
      expect(allowed.some(a => a.name === c.name)).toBeTrue();
    });
    expect(allowed.length).toBe(nonFlaggedComponents.length);
  });

  it('should filter feature-flagged components when flags are false', () => {
    featureFlagServiceSpy.getFeature.and.returnValue(false);

    const allowed = service.enabledComponents();

    // Feature-flagged components should be excluded when flags are false
    flaggedComponents.forEach(c => {
      expect(allowed.some(a => a.name === c.name)).toBeFalse();
    });
  });

  it('should include all components when feature flags are enabled', () => {
    featureFlagServiceSpy.getFeature.and.returnValue(true);

    const allowed = service.enabledComponents();

    // All components should be included when flags are true
    COMPONENT_LIST.forEach(c => {
      expect(allowed.some(a => a.name === c.name)).toBeTrue();
    });
    expect(allowed.length).toBe(COMPONENT_LIST.length);
  });
});

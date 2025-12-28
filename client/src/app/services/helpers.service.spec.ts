import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HelpersService } from '@app/services/helpers.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { COMPONENT_LIST } from '@app/helpers/component-list';
import { ENVIRONMENT } from 'src/environments/environment';

describe('HelpersService', () => {
  let service: HelpersService;
  let featureFlagServiceSpy: jasmine.SpyObj<FeatureFlagService>;
  let loadedSignal: ReturnType<typeof signal<boolean>>;
  let featuresSignal: ReturnType<typeof signal<Record<string, boolean>>>;

  beforeEach(() => {
    loadedSignal = signal(true);
    featuresSignal = signal({});
    featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['getFeature'], {
      loaded: loadedSignal,
      features: featuresSignal,
    });

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

  it('should always include non-feature-flagged components even when flags not loaded', () => {
    // Flags not loaded yet
    loadedSignal.set(false);
    featuresSignal.set({});

    const allowed = service.enabledComponents();

    // Non-feature-flagged components should always be included
    nonFlaggedComponents.forEach(c => {
      expect(allowed.some(a => a.name === c.name)).toBeTrue();
    });
    // Feature-flagged components should be hidden (fail-closed)
    expect(allowed.length).toBe(nonFlaggedComponents.length);
  });

  it('should exclude feature-flagged components when flags not loaded (fail-closed)', () => {
    // Flags not loaded - feature-flagged components should be hidden
    loadedSignal.set(false);
    featuresSignal.set({});

    const allowed = service.enabledComponents();

    flaggedComponents.forEach(c => {
      expect(allowed.some(a => a.name === c.name)).toBeFalse();
    });
  });

  it('should exclude feature-flagged components when not explicitly enabled (fail-closed)', () => {
    // Flags loaded but empty - feature-flagged components should be hidden
    loadedSignal.set(true);
    featuresSignal.set({});

    const allowed = service.enabledComponents();

    // Feature-flagged components should be excluded when not explicitly true
    flaggedComponents.forEach(c => {
      expect(allowed.some(a => a.name === c.name)).toBeFalse();
    });
    expect(allowed.length).toBe(nonFlaggedComponents.length);
  });

  it('should include all components when feature flags are explicitly enabled', () => {
    // All feature flags explicitly set to true
    loadedSignal.set(true);
    const allTrue = flaggedComponents.reduce((acc, c) => ({ ...acc, [c.name]: true }), {});
    featuresSignal.set(allTrue);

    const allowed = service.enabledComponents();

    // All components should be included when flags are true
    COMPONENT_LIST.forEach(c => {
      expect(allowed.some(a => a.name === c.name)).toBeTrue();
    });
    expect(allowed.length).toBe(COMPONENT_LIST.length);
  });
});

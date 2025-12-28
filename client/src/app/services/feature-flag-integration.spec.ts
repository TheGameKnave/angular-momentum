import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Socket } from 'ngx-socket-io';
import { HelpersService } from '@app/services/helpers.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { COMPONENT_LIST } from '@app/helpers/component-list';

/**
 * Integration tests for feature flag system.
 * Tests the full chain: FeatureFlagService → HelpersService → enabledComponents
 *
 * These tests use real services (not mocks) to ensure signal dependencies
 * are properly established and fail-closed behavior works correctly.
 */
describe('Feature Flag Integration', () => {
  let featureFlagService: FeatureFlagService;
  let helpersService: HelpersService;
  let httpMock: HttpTestingController;

  const nonFlaggedComponents = COMPONENT_LIST.filter(c => !('featureFlagged' in c) || !c.featureFlagged);
  const flaggedComponents = COMPONENT_LIST.filter(c => 'featureFlagged' in c && c.featureFlagged);

  beforeEach(() => {
    const socketSpy = jasmine.createSpyObj('Socket', ['on']);

    TestBed.configureTestingModule({
      providers: [
        FeatureFlagService,
        HelpersService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Socket, useValue: socketSpy },
      ],
    });

    featureFlagService = TestBed.inject(FeatureFlagService);
    helpersService = TestBed.inject(HelpersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Fail-closed behavior', () => {
    it('should only show non-feature-flagged components before flags load', () => {
      // Initially, loaded() is false and features() is empty
      expect(featureFlagService.loaded()).toBe(false);

      const enabled = helpersService.enabledComponents();

      // Only non-feature-flagged components should be visible
      expect(enabled.length).toBe(nonFlaggedComponents.length);
      nonFlaggedComponents.forEach(c => {
        expect(enabled.some(e => e.name === c.name)).toBeTrue();
      });
      flaggedComponents.forEach(c => {
        expect(enabled.some(e => e.name === c.name)).toBeFalse();
      });
    });

    it('should show feature-flagged components only after flags load with explicit true', () => {
      // Simulate API response with all features enabled
      const apiResponse = flaggedComponents.map(c => ({ key: c.name, value: true }));

      featureFlagService.getFeatureFlags().subscribe();
      httpMock.expectOne(req => req.url.endsWith('/api/feature-flags')).flush(apiResponse);

      // Now loaded() should be true
      expect(featureFlagService.loaded()).toBe(true);

      const enabled = helpersService.enabledComponents();

      // All components should now be visible
      expect(enabled.length).toBe(COMPONENT_LIST.length);
    });

    it('should hide feature-flagged components when flags load as false', () => {
      // Simulate API response with all features disabled
      const apiResponse = flaggedComponents.map(c => ({ key: c.name, value: false }));

      featureFlagService.getFeatureFlags().subscribe();
      httpMock.expectOne(req => req.url.endsWith('/api/feature-flags')).flush(apiResponse);

      expect(featureFlagService.loaded()).toBe(true);

      const enabled = helpersService.enabledComponents();

      // Only non-feature-flagged components should be visible
      expect(enabled.length).toBe(nonFlaggedComponents.length);
      flaggedComponents.forEach(c => {
        expect(enabled.some(e => e.name === c.name)).toBeFalse();
      });
    });

    it('should hide feature-flagged components when flags load but component not in response', () => {
      // Simulate API response with empty array (no flags set)
      featureFlagService.getFeatureFlags().subscribe();
      httpMock.expectOne(req => req.url.endsWith('/api/feature-flags')).flush([]);

      expect(featureFlagService.loaded()).toBe(true);

      const enabled = helpersService.enabledComponents();

      // Only non-feature-flagged components should be visible (fail-closed)
      expect(enabled.length).toBe(nonFlaggedComponents.length);
      flaggedComponents.forEach(c => {
        expect(enabled.some(e => e.name === c.name)).toBeFalse();
      });
    });
  });

  describe('Reactive updates', () => {
    it('should update enabledComponents when features signal changes', () => {
      // First, load flags with all disabled
      const apiResponse = flaggedComponents.map(c => ({ key: c.name, value: false }));
      featureFlagService.getFeatureFlags().subscribe();
      httpMock.expectOne(req => req.url.endsWith('/api/feature-flags')).flush(apiResponse);

      expect(helpersService.enabledComponents().length).toBe(nonFlaggedComponents.length);

      // Now enable a feature directly via setFeature
      if (flaggedComponents.length > 0) {
        const testFeature = flaggedComponents[0].name;
        featureFlagService.setFeature(testFeature, true);

        // Flush the PUT request
        httpMock.expectOne(req => req.url.includes('/api/feature-flags/')).flush({ success: true });

        // enabledComponents should now include the enabled feature
        const enabled = helpersService.enabledComponents();
        expect(enabled.some(e => e.name === testFeature)).toBeTrue();
      }
    });
  });

  describe('Non-feature-flagged components', () => {
    it('Features component should always be visible regardless of flag state', () => {
      // Before flags load
      expect(helpersService.enabledComponents().some(e => e.name === 'Features')).toBeTrue();

      // After flags load with empty response
      featureFlagService.getFeatureFlags().subscribe();
      httpMock.expectOne(req => req.url.endsWith('/api/feature-flags')).flush([]);

      expect(helpersService.enabledComponents().some(e => e.name === 'Features')).toBeTrue();
    });
  });
});

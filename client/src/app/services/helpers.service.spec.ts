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

  it('should return filtered enabledComponents based on feature flags', () => {
    featureFlagServiceSpy.getFeature.and.callFake((name: string) => name !== 'GraphQL API');

    const allowed = service.enabledComponents();

    expect(allowed.length).toBe(COMPONENT_LIST.length - 1);
    expect(allowed.some(c => c.name === 'Features')).toBeTrue();
    expect(allowed.some(c => c.name === 'IndexedDB')).toBeTrue();
    expect(allowed.some(c => c.name === 'GraphQL API')).toBeFalse();
  });
});

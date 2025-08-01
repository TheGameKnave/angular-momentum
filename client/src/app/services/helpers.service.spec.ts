import { TestBed } from '@angular/core/testing';
import { HelpersService } from '@app/services/helpers.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { ComponentListService } from '@app/services/component-list.service';
import { ENVIRONMENT } from 'src/environments/environment';

describe('HelpersService', () => {
  let service: HelpersService;
  let featureFlagServiceSpy: jasmine.SpyObj<FeatureFlagService>;
  let componentListServiceSpy: jasmine.SpyObj<ComponentListService>;

  const mockComponents = [
    { name: 'FeatureA', component: class {}, icon: 'iconA' },
    { name: 'FeatureB', component: class {}, icon: 'iconB' },
    { name: 'FeatureC', component: class {}, icon: 'iconC' },
  ];

  beforeEach(() => {
    featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);
    componentListServiceSpy = jasmine.createSpyObj('ComponentListService', ['getComponentList']);

    TestBed.configureTestingModule({
      providers: [
        HelpersService,
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: ComponentListService, useValue: componentListServiceSpy },
        { provide: ENVIRONMENT, useValue: { env: 'testing' } },
      ],
    });

    service = TestBed.inject(HelpersService);
  });

  afterEach(() => {
    delete (window as any).helpersService;
  });

  it('should return filtered enabledComponents based on feature flags', () => {
    componentListServiceSpy.getComponentList.and.returnValue(mockComponents);
    featureFlagServiceSpy.getFeature.and.callFake(name => name !== 'FeatureB'); // Disable FeatureB

    const allowed = service.enabledComponents();

    expect(allowed.length).toBe(2);
    expect(allowed.some(c => c.name === 'FeatureA')).toBeTrue();
    expect(allowed.some(c => c.name === 'FeatureC')).toBeTrue();
    expect(allowed.some(c => c.name === 'FeatureB')).toBeFalse();
  });
});

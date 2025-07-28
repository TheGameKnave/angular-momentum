import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuFeatureComponent } from './menu-feature.component';
import { ComponentListService } from '@app/services/component-list.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('MenuFeatureComponent', () => {
  let component: MenuFeatureComponent;
  let fixture: ComponentFixture<MenuFeatureComponent>;
  let componentListService: jasmine.SpyObj<ComponentListService>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;

  beforeEach(async () => {
    const componentListServiceSpy = jasmine.createSpyObj('ComponentListService', ['getComponentList']);
    const featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);

    await TestBed.configureTestingModule({
      imports: [
        MenuFeatureComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: ComponentListService, useValue: componentListServiceSpy },
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuFeatureComponent);
    component = fixture.componentInstance;
    componentListService = TestBed.inject(ComponentListService) as jasmine.SpyObj<ComponentListService>;
    featureFlagService = TestBed.inject(FeatureFlagService) as jasmine.SpyObj<FeatureFlagService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component list and count on ngOnInit', () => {
    const mockList = [
      { name: 'FeatureA', component: {}, icon: 'iconA' },
      { name: 'FeatureB', component: {}, icon: 'iconB' },
      { name: 'FeatureC', component: {}, icon: 'iconC' }
    ];
    componentListService.getComponentList.and.returnValue(mockList);
    featureFlagService.getFeature.and.callFake(name => name !== 'FeatureB');
  
    component.ngOnInit();
    fixture.detectChanges();
  
    expect(component.componentList).toEqual(mockList);
    expect(component.componentCount()).toBe(2);
  });

  it('should handle ngOnDestroy without errors', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

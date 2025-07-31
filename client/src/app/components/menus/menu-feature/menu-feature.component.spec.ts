import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuFeatureComponent } from './menu-feature.component';
import { ComponentListService } from '@app/services/component-list.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { HelpersService } from '@app/services/helpers.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { Component, signal } from '@angular/core';
import { ComponentInstance } from '@app/models/data.model';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

@Component({ selector: 'mock-comp-a', template: '' })
class MockComponentA {}

describe('MenuFeatureComponent', () => {
  let component: MenuFeatureComponent;
  let fixture: ComponentFixture<MenuFeatureComponent>;
  let helpersServiceSpy: jasmine.SpyObj<HelpersService>;

  const mockaEnabledComponents = signal<ComponentInstance[]>([
    { name: 'FeatureA', component: MockComponentA, icon: 'iconA' },
    { name: 'FeatureB', component: MockComponentA, icon: 'iconB' },
    { name: 'FeatureC', component: MockComponentA, icon: 'iconC' },
  ]);

  beforeEach(async () => {
    const componentListServiceSpy = jasmine.createSpyObj('ComponentListService', ['getComponentList']);
    const featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['getFeature']);
    
    helpersServiceSpy = jasmine.createSpyObj('HelpersService', [], {
      enabledComponents: mockaEnabledComponents
    });

    await TestBed.configureTestingModule({
      imports: [
        MenuFeatureComponent,
        getTranslocoModule()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ComponentListService, useValue: componentListServiceSpy },
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: HelpersService, useValue: helpersServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct component count', () => {
    expect(component.componentCount()).toBe(mockaEnabledComponents().length);
  });

  it('should return 0 when enabledComponents is empty', () => {
    mockaEnabledComponents.set([]);
    fixture.detectChanges();
    expect(component.componentCount()).toBe(0);
  });
});

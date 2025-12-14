import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FeaturesComponent } from './features.component';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import db from 'src/../../server/data/db.json';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { signal } from '@angular/core';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { ConnectivityService } from '@app/services/connectivity.service';
import { AuthService } from '@app/services/auth.service';

class MockConnectivityService {
  showOffline = signal(false);
  isOnline = signal(true);
  start(): Promise<void> {
    return Promise.resolve(); // no-op for tests
  }
}

describe('FeaturesComponent', () => {
  const features = {...db.featureFlags};
  let component: FeaturesComponent;
  let fixture: ComponentFixture<FeaturesComponent>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let featureFlagServiceSpy: jasmine.SpyObj<FeatureFlagService>;
  const mockFeaturesSignal = signal({...features});

  beforeEach(waitForAsync(() => {
    const mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
      currentUser: signal(null),
      currentSession: signal(null),
      loading: signal(false)
    });
    mockAuthService.isAuthenticated.and.returnValue(true); // Enable form controls

    featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['features', 'getFeature', 'setFeature']);
    featureFlagServiceSpy.features.and.returnValue({...features});
    featureFlagServiceSpy.getFeature.and.callFake((feature: any) => {
      const feats = featureFlagServiceSpy.features();
      return feats[feature as keyof typeof feats] ?? true;
    });
    featureFlagServiceSpy.features = jasmine.createSpyObj('features', ['set', 'get']);
    Object.defineProperty(featureFlagServiceSpy, 'features', {
      get: () => mockFeaturesSignal,
      set: (value) => {
        mockFeaturesSignal.set(value);
      },
    });

    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        FeaturesComponent,
        getTranslocoModule(),
      ],
      providers: [
        provideNoopAnimations(),
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: FeatureMonitorService, useValue: jasmine.createSpyObj('FeatureMonitorService', ['watchRouteFeatureAndRedirect']) },
        { provide: ConnectivityService, useClass: MockConnectivityService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeaturesComponent);
    component = fixture.componentInstance;
    featureFlagService = TestBed.inject(FeatureFlagService) as jasmine.SpyObj<FeatureFlagService>;
    fixture.detectChanges();
  }));

  afterEach(() => {
    mockFeaturesSignal.set({
      ...features,
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display checkboxes for each feature', () => {
    const currentFeatures = featureFlagServiceSpy.features();
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(Object.keys(currentFeatures).length);
  });

  it('should create FormControls for existing features', () => {
    const currentFeatures = featureFlagServiceSpy.features();
    const existingKeys = Object.keys(currentFeatures) as (keyof typeof currentFeatures)[];
    existingKeys.forEach((key) => {
      expect(fixture.componentInstance.featureForm.get(key)).toBeDefined();
      expect(fixture.componentInstance.featureForm.get(key)?.value).toBe(currentFeatures[key]);
    });
  });

  it('should update feature flag service when checkbox state changes', () => {
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    const feature0Checkbox = checkboxes[0];
    const feature0Name = 'GraphQL API' as keyof typeof features; // Hardcode the feature name

    feature0Checkbox.click();
    fixture.detectChanges();
    expect(featureFlagServiceSpy.setFeature).toHaveBeenCalledWith(feature0Name, !features[feature0Name]);
  });

  it('should only update from a signal when the target formControl value differs', () => {
    // Set the initial value of the signal
    mockFeaturesSignal.set({...features});
    fixture.detectChanges();

    // Get the form control for the 'Environment' feature
    const featureName = 'Environment' as keyof typeof features;
    const appVersionFormControl = fixture.componentInstance.featureForm.get(featureName) as FormControl;

    // Set the initial value of the form control to true
    appVersionFormControl.setValue(features[featureName]);

    // Update the signal's value to false
    mockFeaturesSignal.set({
      ...features,
      [featureName]: !features[featureName],
    });
    fixture.detectChanges();

    // Verify that the form control's value is updated to false
    expect(appVersionFormControl.value).toBe(!features[featureName]);
  });

  it('should disable form controls when user is not authenticated', waitForAsync(() => {
    const mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
      currentUser: signal(null),
      currentSession: signal(null),
      loading: signal(false)
    });
    mockAuthService.isAuthenticated.and.returnValue(false); // Not authenticated

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        FeaturesComponent,
        getTranslocoModule(),
      ],
      providers: [
        provideNoopAnimations(),
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: FeatureMonitorService, useValue: jasmine.createSpyObj('FeatureMonitorService', ['watchRouteFeatureAndRedirect']) },
        { provide: ConnectivityService, useClass: MockConnectivityService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    const testFixture = TestBed.createComponent(FeaturesComponent);
    testFixture.detectChanges();

    // All controls should be disabled
    Object.keys(testFixture.componentInstance.featureForm.controls).forEach(key => {
      const control = testFixture.componentInstance.featureForm.get(key);
      expect(control?.disabled).toBe(true);
    });
  }));

});

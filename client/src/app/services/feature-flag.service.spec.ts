import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FeatureFlagService } from './feature-flag.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Socket } from 'ngx-socket-io';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let httpMock: HttpTestingController;
  let socketSpy: jasmine.SpyObj<Socket>;

  beforeEach(() => {
    socketSpy = jasmine.createSpyObj('Socket', ['on']);
    socketSpy.ioSocket = { connected: true };

    TestBed.configureTestingModule({
      providers: [
        FeatureFlagService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Socket, useValue: socketSpy },
      ],
    });

    service = TestBed.inject(FeatureFlagService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get feature flags', () => {
    const graphqlResponse = {
      data: {
        featureFlags: [
          { key: 'App Version', value: true },
          { key: 'Environment', value: false },
        ],
      },
    };
  
    const expectedFlags = {
      'App Version': true,
      'Environment': false,
    };
  
    service.getFeatureFlags().subscribe((flags) => {
      expect(flags).toEqual(expectedFlags);
    });
  
    const req = httpMock.expectOne('/graphql');
    expect(req.request.method).toBe('POST');
    req.flush(graphqlResponse);
  });
  

  it('should update feature flags via GraphQL mutation', fakeAsync(() => {
    const feature = 'App Version';
    const value = false;
    const expectedMutation = `
    mutation UpdateFeatureFlag($key: String!, $value: Boolean!) {
      updateFeatureFlag(key: $key, value: $value) {
        key
        value
      }
    }`;

    service.setFeature(feature, value);
    tick();

    const req = httpMock.expectOne('/graphql');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('mutation UpdateFeatureFlag');
    expect(req.request.body.variables).toEqual({ key: feature, value });

    req.flush({ data: { updateFeatureFlag: { key: feature, value } } });
  }));

  it('should update features when WebSocket emits an update', () => {
    const updatePayload = { 'App Version': false, 'New Feature': true };
    const initialFeatures = { 'App Version': true };

    service.features.set(initialFeatures);

    const onCallback = socketSpy.on.calls.mostRecent().args[1];
    onCallback(updatePayload);

    expect(service.features()).toEqual({ 'App Version': false, 'New Feature': true });
  });

  it('should return false for unknown feature', () => {
    const features = { 'App Version': true, 'Environment': true };
    service.features.set(features);
    expect(service.getFeature('Unknown Feature')).toBe(false);
  });

  afterEach(() => {
    httpMock.verify();
  });
});

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FeatureFlagService } from './feature-flag.service';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Socket } from 'ngx-socket-io';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let httpMock: HttpTestingController;
  let socketSpy: jasmine.SpyObj<Socket>;

  beforeEach(() => {
    socketSpy = jasmine.createSpyObj('Socket', ['on'], {
      ioSocket: { connected: true }
    });

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
          { key: 'Environment', value: true },
          { key: 'GraphQL API', value: false },
        ],
      },
    };
  
    const expectedFlags = {
      'Environment': true,
      'GraphQL API': false,
    };
  
    service.getFeatureFlags().subscribe((flags) => {
      expect(flags).toEqual(expectedFlags);
    });
  
    const req = httpMock.expectOne('http://localhost:4200/api');
    expect(req.request.method).toBe('POST');
    req.flush(graphqlResponse);
  });
  

  it('should update feature flags via GraphQL mutation', fakeAsync(() => {
    const feature = 'Environment';
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

    const req = httpMock.expectOne('http://localhost:4200/api');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('mutation UpdateFeatureFlag');
    expect(req.request.body.variables).toEqual({ key: feature, value });

    req.flush({ data: { updateFeatureFlag: { key: feature, value } } });
  }));

  it('should update features when WebSocket emits an update', () => {
    const updatePayload = { 'GraphQL API': false, 'New Feature': true };
    const initialFeatures = { 'GraphQL API': true };

    service.features.set(initialFeatures);

    const onCallback = socketSpy.on.calls.mostRecent().args[1];
    onCallback(updatePayload);

    expect(service.features()).toEqual({ 'GraphQL API': false, 'New Feature': true });
  });

  it('should catch error and return empty feature flags object', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'Network error',
      status: 0,
      statusText: 'Unknown Error',
    });
  
    spyOn(console, 'error'); // Optional: spy on console.error to check logging
  
    service.getFeatureFlags().subscribe((flags) => {
      expect(flags).toEqual({});  // fallback empty object
    });
  
    const req = httpMock.expectOne('http://localhost:4200/api');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
  
    expect(console.error).toHaveBeenCalledWith('Error getting feature flags:', jasmine.any(HttpErrorResponse));
  });
  

  it('should return false for unknown feature', () => {
    const features = { 'GraphQL API': true, 'IndexedDB': true };
    service.features.set(features);
    expect(service.getFeature('Unknown Feature')).toBe(false);
  });

  afterEach(() => {
    httpMock.verify();
  });
});

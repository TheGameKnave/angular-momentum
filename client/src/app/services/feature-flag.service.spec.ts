import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { PLATFORM_ID, TransferState } from '@angular/core';
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
    const restResponse = [
      { key: 'Environment', value: true },
      { key: 'GraphQL API', value: false },
    ];

    const expectedFlags = {
      'Environment': true,
      'GraphQL API': false,
    };

    service.getFeatureFlags().subscribe((flags) => {
      expect(flags).toEqual(jasmine.objectContaining(expectedFlags));
    });

    const req = httpMock.expectOne((request) => request.url.endsWith('/api/feature-flags'));
    expect(req.request.method).toBe('GET');
    req.flush(restResponse);
  });
  

  it('should update feature flags via REST API', fakeAsync(() => {
    const feature = 'Environment';
    const value = false;

    service.setFeature(feature, value);
    tick();

    const req = httpMock.expectOne((request) => request.url.endsWith('/api/feature-flags/Environment'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ value });

    req.flush({ success: true });
  }));

  it('should update features when WebSocket emits an update', () => {
    const updatePayload = { 'GraphQL API': false, 'Environment': true };
    const initialFeatures = { 'GraphQL API': true };

    service.features.set(initialFeatures);

    const onCallback = socketSpy.on.calls.mostRecent().args[1];
    onCallback(updatePayload);

    expect(service.features()).toEqual({ 'GraphQL API': false, 'Environment': true });
  });

  it('should catch error and return empty feature flags object', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'Network error',
      status: 0,
      statusText: 'Unknown Error',
    });

    spyOn(console, 'error'); // Optional: spy on console.error to check logging

    service.getFeatureFlags().subscribe((flags) => {
      expect(Object.keys(flags).length).toBe(0);  // fallback empty object
    });

    const req = httpMock.expectOne((request) => request.url.endsWith('/api/feature-flags'));
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(console.error).toHaveBeenCalledWith('Error getting feature flags:', jasmine.any(HttpErrorResponse));
  });
  

  it('should return true for unknown feature (default behavior)', () => {
    const features = { 'GraphQL API': true, 'IndexedDB': true };
    service.features.set(features);
    // According to the service implementation, getFeature returns true if feature is not explicitly false
    // So an undefined feature will return true
    expect(service.getFeature('Environment')).toBe(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('TransferState SSR hydration', () => {
    it('should restore feature flags from TransferState on browser', () => {
      const transferState = TestBed.inject(TransferState);
      const mockFlags = { 'Environment': true, 'GraphQL API': false };

      // Set up TransferState before creating a new service instance
      TestBed.resetTestingModule();
      const mockTransferState = jasmine.createSpyObj('TransferState', ['hasKey', 'get', 'remove', 'set']);
      mockTransferState.hasKey.and.returnValue(true);
      mockTransferState.get.and.returnValue(mockFlags);

      TestBed.configureTestingModule({
        providers: [
          FeatureFlagService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Socket, useValue: socketSpy },
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: TransferState, useValue: mockTransferState },
        ],
      });

      const newService = TestBed.inject(FeatureFlagService);
      expect(mockTransferState.hasKey).toHaveBeenCalled();
      expect(mockTransferState.get).toHaveBeenCalled();
      expect(mockTransferState.remove).toHaveBeenCalled();
      expect(newService.features()).toEqual(mockFlags);
      expect(newService.loaded()).toBe(true);
    });

    it('should not restore from TransferState if key does not exist', () => {
      TestBed.resetTestingModule();
      const mockTransferState = jasmine.createSpyObj('TransferState', ['hasKey', 'get', 'remove', 'set']);
      mockTransferState.hasKey.and.returnValue(false);

      TestBed.configureTestingModule({
        providers: [
          FeatureFlagService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Socket, useValue: socketSpy },
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: TransferState, useValue: mockTransferState },
        ],
      });

      const newService = TestBed.inject(FeatureFlagService);
      expect(mockTransferState.hasKey).toHaveBeenCalled();
      expect(mockTransferState.get).not.toHaveBeenCalled();
      expect(newService.loaded()).toBe(false);
    });

    it('should store feature flags in TransferState on server', () => {
      TestBed.resetTestingModule();
      const mockTransferState = jasmine.createSpyObj('TransferState', ['hasKey', 'get', 'remove', 'set']);
      mockTransferState.hasKey.and.returnValue(false);

      TestBed.configureTestingModule({
        providers: [
          FeatureFlagService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Socket, useValue: socketSpy },
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: TransferState, useValue: mockTransferState },
        ],
      });

      const newService = TestBed.inject(FeatureFlagService);
      const newHttpMock = TestBed.inject(HttpTestingController);

      const restResponse = [
        { key: 'Environment', value: true },
        { key: 'GraphQL API', value: false },
      ];

      newService.getFeatureFlags().subscribe();

      const req = newHttpMock.expectOne((request) => request.url.endsWith('/api/feature-flags'));
      req.flush(restResponse);

      expect(mockTransferState.set).toHaveBeenCalled();
      expect(newService.loaded()).toBe(true);
    });

    it('should not register WebSocket listener on server platform', () => {
      TestBed.resetTestingModule();
      const serverSocketSpy = jasmine.createSpyObj('Socket', ['on']);

      TestBed.configureTestingModule({
        providers: [
          FeatureFlagService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Socket, useValue: serverSocketSpy },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });

      TestBed.inject(FeatureFlagService);
      expect(serverSocketSpy.on).not.toHaveBeenCalled();
    });
  });
});

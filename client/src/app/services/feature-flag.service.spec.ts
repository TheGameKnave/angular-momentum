import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { PLATFORM_ID, signal, TransferState } from '@angular/core';
import { FeatureFlagService } from './feature-flag.service';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Socket } from 'ngx-socket-io';
import { ConnectivityService } from './connectivity.service';

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
  

  it('should return false for unknown feature (fail-closed)', () => {
    service.loaded.set(true);
    service.features.set({ 'GraphQL API': true, 'IndexedDB': true });
    // Fail-closed: unknown features return false (not explicitly true)
    expect(service.getFeature('Environment')).toBe(false);
  });

  it('should return true only when loaded AND feature is explicitly true', () => {
    service.loaded.set(true);
    service.features.set({ 'GraphQL API': true, 'IndexedDB': false });
    expect(service.getFeature('GraphQL API')).toBe(true);
    expect(service.getFeature('IndexedDB')).toBe(false);
  });

  it('should return false when flags are not loaded (fail-closed)', () => {
    service.loaded.set(false);
    service.features.set({ 'GraphQL API': true, 'IndexedDB': true });
    // Even if feature is true, should return false when not loaded
    expect(service.getFeature('GraphQL API')).toBe(false);
    expect(service.getFeature('IndexedDB')).toBe(false);
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

  describe('Connectivity retry', () => {
    it('should retry getFeatureFlags when connectivity is restored after failure', fakeAsync(() => {
      TestBed.resetTestingModule();

      // Create a writable signal for testing
      const isOnlineSignal = signal(false);
      const mockConnectivityService = {
        isOnline: isOnlineSignal.asReadonly()
      };

      TestBed.configureTestingModule({
        providers: [
          FeatureFlagService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Socket, useValue: socketSpy },
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: ConnectivityService, useValue: mockConnectivityService },
        ],
      });

      const newService = TestBed.inject(FeatureFlagService);
      const newHttpMock = TestBed.inject(HttpTestingController);

      // First request fails (offline)
      newService.getFeatureFlags().subscribe();
      const req1 = newHttpMock.expectOne((request) => request.url.endsWith('/api/feature-flags'));
      req1.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });
      tick();

      expect(newService.loaded()).toBe(false);

      // Simulate connectivity restored
      isOnlineSignal.set(true);
      tick();

      // Should retry the request
      const req2 = newHttpMock.expectOne((request) => request.url.endsWith('/api/feature-flags'));
      req2.flush([{ key: 'Environment', value: true }]);
      tick();

      expect(newService.loaded()).toBe(true);
      expect(newService.features()).toEqual({ 'Environment': true });
    }));

    it('should not retry when load succeeded initially', fakeAsync(() => {
      TestBed.resetTestingModule();

      const isOnlineSignal = signal(true);
      const mockConnectivityService = {
        isOnline: isOnlineSignal.asReadonly()
      };

      TestBed.configureTestingModule({
        providers: [
          FeatureFlagService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Socket, useValue: socketSpy },
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: ConnectivityService, useValue: mockConnectivityService },
        ],
      });

      const newService = TestBed.inject(FeatureFlagService);
      const newHttpMock = TestBed.inject(HttpTestingController);

      // First request succeeds
      newService.getFeatureFlags().subscribe();
      const req1 = newHttpMock.expectOne((request) => request.url.endsWith('/api/feature-flags'));
      req1.flush([{ key: 'Environment', value: true }]);
      tick();

      expect(newService.loaded()).toBe(true);

      // Simulate going offline then online
      isOnlineSignal.set(false);
      tick();
      isOnlineSignal.set(true);
      tick();

      // Should NOT make another request since initial load succeeded
      newHttpMock.expectNone((request) => request.url.endsWith('/api/feature-flags'));
    }));
  });
});

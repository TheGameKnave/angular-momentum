import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ConnectivityService } from './connectivity.service';
import { LogService } from './log.service';

class MockLogService {
  log = jasmine.createSpy('log');
}

describe('ConnectivityService', () => {
  let service: ConnectivityService;
  let logService: MockLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConnectivityService,
        { provide: LogService, useClass: MockLogService },
      ],
    });

    service = TestBed.inject(ConnectivityService);
    logService = TestBed.inject(LogService) as unknown as MockLogService;

    spyOn(console, 'log').and.callFake(() => {}); // suppress console logs
  });

  afterEach(() => {
    service.stop(); // stop timers / in-flight fetches
  });

  it('start() should perform initial verification', async () => {
    const service = TestBed.inject(ConnectivityService);

    // Spy on the private verify method
    const verifySpy = spyOn<any>(service, 'verify').and.returnValue(Promise.resolve());

    // Call start
    await service.start();

    // Assert that verify was called
    expect(verifySpy).toHaveBeenCalled();
  });


  it('should initialize signals correctly', () => {
    expect(service.isOnline()).toBe(navigator.onLine); // starts with OS-reported status
    expect(service.osOnline()).toBe(navigator.onLine);
    expect(service.showOffline()).toBeFalse();
    expect(service.lastVerifiedOnline()).toBeUndefined();
  });

  it('should update osOnline on offline event', () => {
    window.dispatchEvent(new Event('offline'));
    expect(service.osOnline()).toBeFalse();
  });

  it('should update osOnline on online event', () => {
    window.dispatchEvent(new Event('online'));
    expect(service.osOnline()).toBeTrue();
  });

  it('should set isOnline to true on successful ping', fakeAsync(() => {
    spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(null, { status: 200 })));
    service['verify']();
    tick();
    expect(service.isOnline()).toBeTrue();
    expect(service.lastVerifiedOnline()).toBeDefined();
  }));

  it('should set isOnline to false on failed ping', fakeAsync(() => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject('fail'));
    service['verify']();
    tick();
    expect(service.isOnline()).toBeFalse();
  }));

  it('should show offline banner after grace period when offline', fakeAsync(() => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject('fail'));
    service['verify']();
    expect(service.showOffline()).toBeFalse();
    tick(service['gracePeriod']!);
    expect(service.showOffline()).toBeTrue();

    // verify log was called (ignore first argument)
    expect(logService.log).toHaveBeenCalledWith('📴 Offline banner shown');
  }));


  it('should hide offline banner immediately when online', fakeAsync(() => {
    const fetchSpy = spyOn(window, 'fetch');
    fetchSpy.and.returnValues(
      Promise.reject('fail'),
      Promise.resolve(new Response(null, { status: 200 }))
    );

    service['verify']();
    tick(service['gracePeriod']!);
    expect(service.showOffline()).toBeTrue();

    service['verify']();
    tick(); // banner cleared immediately
    expect(service.showOffline()).toBeFalse();
  }));

  it('should update lastVerifiedOnline only on successful ping', async () => {
    expect(service.lastVerifiedOnline()).toBeUndefined();

    const fetchSpy = spyOn(window, 'fetch');
    fetchSpy.and.returnValues(
      Promise.resolve(new Response(null, { status: 200 })),
      Promise.reject('fail')
    );

    await service['verify']();
    const last = service.lastVerifiedOnline();
    expect(last).toBeDefined();

    await service['verify']();
    expect(service.lastVerifiedOnline()).toEqual(last);
  });

  it('should not schedule next check when stopped', fakeAsync(() => {
    service.stop();
    spyOn(window, 'setTimeout').and.callThrough();

    service['scheduleNextCheck']();
    tick(10000);

    expect(window.setTimeout).not.toHaveBeenCalled();
  }));

  it('should handle ping failed response', fakeAsync(() => {
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response(null, { status: 500 }))
    );

    const scheduleOfflineSpy = spyOn<any>(service, 'scheduleOfflineBanner');
    service['verify']();
    tick();

    expect(service.isOnline()).toBeFalse();
    expect(scheduleOfflineSpy).toHaveBeenCalled();
  }));

  it('should clear offlineTimer in clearOfflineBanner', fakeAsync(() => {
    service['offlineTimer'] = setTimeout(() => {}, 1000);

    service['clearOfflineBanner']();
    tick();

    expect(service['offlineTimer']).toBeUndefined();
    expect(service.showOffline()).toBeFalse();
    expect(logService.log).not.toHaveBeenCalled(); // no banner was showing
  }));

  it('should call verify and reschedule in scheduleNextCheck', fakeAsync(() => {
    (service as any).currentInterval = 50;
    const verifySpy = spyOn<any>(service, 'verify').and.returnValue(Promise.resolve());

    (service as any).scheduleNextCheck();
    tick(50);
    expect(verifySpy).toHaveBeenCalled();

    tick(50); // recursive call
    expect(verifySpy).toHaveBeenCalledTimes(2);

    service.stop();
  }));
});

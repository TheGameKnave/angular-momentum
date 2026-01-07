import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import * as envModule from 'src/environments/environment';
import { UpdateService } from './update.service';
import { SwUpdate, VersionReadyEvent, VersionDetectedEvent } from '@angular/service-worker';
import { DestroyRef, signal } from '@angular/core';
import { LogService } from './log.service';
import { Update } from '@tauri-apps/plugin-updater';
import { UpdateDialogService } from './update-dialog.service';
import { ChangeLogService } from './change-log.service';

describe('UpdateService', () => {
  let service: UpdateService;
  let swUpdateMock: any;
  let swUpdateSpy: jasmine.SpyObj<SwUpdate>;
  let destroyRefMock: jasmine.SpyObj<DestroyRef>;
  let logMock: jasmine.SpyObj<LogService>;
  let updateDialogMock: jasmine.SpyObj<UpdateDialogService>;
  let changeLogMock: jasmine.SpyObj<ChangeLogService>;
  let versionUpdates$: Subject<VersionReadyEvent | VersionDetectedEvent>;

  beforeEach(() => {
    versionUpdates$ = new Subject<VersionReadyEvent | VersionDetectedEvent>();
    swUpdateSpy = jasmine.createSpyObj('SwUpdate', ['checkForUpdate', 'activateUpdate'], {
      versionUpdates: of()
    });
    swUpdateMock = {
      checkForUpdate: jasmine.createSpy('checkForUpdate').and.returnValue(Promise.resolve(true)),
      activateUpdate: jasmine.createSpy('activateUpdate').and.returnValue(Promise.resolve()),
      versionUpdates: versionUpdates$,
      isEnabled: true
    };

    destroyRefMock = jasmine.createSpyObj('DestroyRef', ['']);
    logMock = jasmine.createSpyObj('LogService', ['log']);
    updateDialogMock = jasmine.createSpyObj('UpdateDialogService', ['show', 'confirm', 'dismiss'], {
      visible: signal(false)
    });
    updateDialogMock.show.and.returnValue(Promise.resolve(true));
    changeLogMock = jasmine.createSpyObj('ChangeLogService', ['refresh', 'getCurrentVersion', 'capturePreviousVersion', 'clearPreviousVersion', 'previousVersion'], {
      appVersion: signal('1.0.0'),
      appDiff: signal({ impact: 'patch', major: 0, minor: 0, patch: 1 })
    });
    // Default: previousVersion returns '0.9.0' (different from current '1.0.0')
    changeLogMock.previousVersion.and.returnValue('0.9.0');
    changeLogMock.getCurrentVersion.and.returnValue('1.0.0');

    TestBed.configureTestingModule({
      providers: [
        UpdateService,
        { provide: SwUpdate, useValue: swUpdateMock },
        { provide: DestroyRef, useValue: destroyRefMock },
        { provide: LogService, useValue: logMock },
        { provide: UpdateDialogService, useValue: updateDialogMock },
        { provide: ChangeLogService, useValue: changeLogMock }
      ]
    });

    service = TestBed.inject(UpdateService);

    // --- Override confirm/reload/relaunch for spying ---
    spyOn(service as any, 'confirmUser').and.returnValue(Promise.resolve(true));
    spyOn(service as any, 'reloadPage').and.stub();
    spyOn(service as any, 'relaunchApp').and.stub();
  });
  afterEach(() => {
    Object.defineProperty(envModule.ENVIRONMENT, 'env', {
      value: 'development',
      configurable: true,
    });
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize when environment is production', () => {
    Object.defineProperty(envModule.ENVIRONMENT, 'env', {
      value: 'production',
      configurable: true,
    });

    const swSpy = spyOn(service as any, 'checkServiceWorkerUpdate').and.stub();
    const tauriSpy = spyOn(service as any, 'checkTauriUpdate').and.stub();

    (service as any).init();

    expect(swSpy).toHaveBeenCalled();
    expect(tauriSpy).toHaveBeenCalled();
  });
  it('should skip initialization if not production', () => {
    // Spy on the ENVIRONMENT.env property
    Object.defineProperty(envModule.ENVIRONMENT, 'env', {
      value: 'test',
      configurable: true, // allow restoring later
    });

    // Spy on methods that would run if init executed
    const swSpy = spyOn(service as any, 'checkServiceWorkerUpdate');
    const tauriSpy = spyOn(service as any, 'checkTauriUpdate');

    // Call private init
    (service as any).init();

    expect(swSpy).not.toHaveBeenCalled();
    expect(tauriSpy).not.toHaveBeenCalled();
    expect(logMock.log).not.toHaveBeenCalled();
  });
  it('should log an error if checkForUpdate throws', async () => {
    const consoleSpy = spyOn(console, 'error');

    // Force checkForUpdate to reject
    swUpdateMock.checkForUpdate.and.returnValue(Promise.reject(new Error('boom')));

    // Call the private method and wait for all inner promises
    await (service as any).checkServiceWorkerUpdate();

    // Wait a tick to ensure promise rejection propagates
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'SW: checkForUpdate() failed:',
      jasmine.any(Error)
    );
  });



  describe('Service Worker updates', () => {
    it('should check and activate SW update', fakeAsync(() => {
      (service as any).checkServiceWorkerUpdate();
      tick();
      expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
      expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
    }));

    it('should log if no SW update', fakeAsync(() => {
      swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(false));
      (service as any).checkServiceWorkerUpdate();
      tick();
      expect(logMock.log).toHaveBeenCalledWith('SW: No update available.');
    }));

    it('should handle VERSION_READY and reload if confirmed', fakeAsync(async () => {
      // Mark first check as complete (simulating subsequent update check)
      sessionStorage.setItem('sw_first_check_complete', 'true');
      updateDialogMock.show.and.returnValue(Promise.resolve(true));

      const versionReadyEvent: VersionReadyEvent = {
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' }
      };

      await (service as any).handleSwEvent(versionReadyEvent);
      tick();
      expect(changeLogMock.refresh).toHaveBeenCalled();
      expect(updateDialogMock.show).toHaveBeenCalled();
      expect((service as any).reloadPage).toHaveBeenCalled();
    }));

    it('should log VERSION_DETECTED', () => {
      const versionDetectedEvent: VersionDetectedEvent = {
        type: 'VERSION_DETECTED',
        version: { hash: 'v1.2.3' }
      };
      (service as any).handleSwEvent(versionDetectedEvent);
      expect(logMock.log).toHaveBeenCalledWith('SW: New version detected:', { hash: 'v1.2.3' });
    });

    it('should capture previous version before checking for update', fakeAsync(() => {
      (service as any).checkServiceWorkerUpdate();
      tick();
      expect(changeLogMock.capturePreviousVersion).toHaveBeenCalled();
      expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
      expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
    }));

    it('should reload immediately on fresh page load when update activates', fakeAsync(() => {
      // Fresh page load - first check NOT complete
      sessionStorage.removeItem('sw_first_check_complete');
      swUpdateMock.activateUpdate.and.returnValue(Promise.resolve(true));

      (service as any).checkServiceWorkerUpdate();
      tick();

      expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
      expect(logMock.log).toHaveBeenCalledWith('SW: Fresh page load, reloading to apply update');
      expect((service as any).reloadPage).toHaveBeenCalled();
    }));

    it('should wait for VERSION_READY when first check already complete', fakeAsync(() => {
      // First check already complete - not a fresh page load
      sessionStorage.setItem('sw_first_check_complete', 'true');
      swUpdateMock.activateUpdate.and.returnValue(Promise.resolve(true));

      (service as any).checkServiceWorkerUpdate();
      tick();

      expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
      expect(logMock.log).toHaveBeenCalledWith('SW: Update activated. Awaiting VERSION_READY...');
      expect((service as any).reloadPage).not.toHaveBeenCalled();
    }));

    it('should log error and set session key when activateUpdate fails', fakeAsync(() => {
      const consoleSpy = spyOn(console, 'error');
      sessionStorage.removeItem('sw_first_check_complete');
      swUpdateMock.activateUpdate.and.returnValue(Promise.reject(new Error('activation failed')));

      (service as any).checkServiceWorkerUpdate();
      tick();

      expect(consoleSpy).toHaveBeenCalledWith('SW: activateUpdate() failed:', jasmine.any(Error));
      expect(sessionStorage.getItem('sw_first_check_complete')).toBe('true');
    }));

    it('should clear previous version if no update available', fakeAsync(() => {
      swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(false));
      (service as any).checkServiceWorkerUpdate();
      tick();
      expect(changeLogMock.capturePreviousVersion).toHaveBeenCalled();
      expect(changeLogMock.clearPreviousVersion).toHaveBeenCalled();
    }));

    it('should skip check if one is already in progress', fakeAsync(() => {
      // First check - will hang (never resolves)
      swUpdateMock.checkForUpdate.and.returnValue(new Promise(() => {}));
      (service as any).checkServiceWorkerUpdate();

      // Second check - should skip
      (service as any).checkServiceWorkerUpdate();
      tick();

      // checkForUpdate should only be called once
      expect(swUpdateMock.checkForUpdate).toHaveBeenCalledTimes(1);

      // Clean up: advance past timeout to avoid pending timers
      tick(30000);
    }));

    it('should timeout and clear state if check hangs too long', fakeAsync(() => {
      const consoleSpy = spyOn(console, 'error');
      // Check that never resolves
      swUpdateMock.checkForUpdate.and.returnValue(new Promise(() => {}));
      (service as any).checkServiceWorkerUpdate();

      // Advance past timeout (30 seconds)
      tick(30000);

      expect(consoleSpy).toHaveBeenCalledWith('SW: checkForUpdate() failed:', jasmine.any(Error));
      expect(changeLogMock.clearPreviousVersion).toHaveBeenCalled();
      // checkInProgress should be reset
      expect((service as any).checkInProgress).toBe(false);
    }));

    it('should skip dialog if no previousVersion was captured', fakeAsync(async () => {
      // Mark first check as complete
      sessionStorage.setItem('sw_first_check_complete', 'true');
      changeLogMock.previousVersion.and.returnValue(null);

      const versionReadyEvent: VersionReadyEvent = {
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' }
      };

      await (service as any).handleSwEvent(versionReadyEvent);
      tick();
      expect(logMock.log).toHaveBeenCalledWith('SW: No previous version captured, skipping dialog');
      expect(updateDialogMock.show).not.toHaveBeenCalled();
    }));

    it('should skip dialog on fresh page load (first check not complete)', fakeAsync(async () => {
      // First check NOT complete (fresh page load)
      sessionStorage.removeItem('sw_first_check_complete');

      const versionReadyEvent: VersionReadyEvent = {
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' }
      };

      await (service as any).handleSwEvent(versionReadyEvent);
      tick();
      expect(logMock.log).toHaveBeenCalledWith('SW: Fresh page load, deferring to check flow');
      expect(updateDialogMock.show).not.toHaveBeenCalled();
    }));

    it('should log VERSION_INSTALLATION_FAILED events', fakeAsync(async () => {
      const consoleSpy = spyOn(console, 'error');

      const installFailedEvent = {
        type: 'VERSION_INSTALLATION_FAILED' as const,
        version: { hash: 'abc123' },
        error: 'Network error',
      };

      await (service as any).handleSwEvent(installFailedEvent);
      tick();

      expect(consoleSpy).toHaveBeenCalledWith('SW: VERSION_INSTALLATION_FAILED:', installFailedEvent);
    }));

    it('should clear caches when VERSION_INSTALLATION_FAILED with quota error', fakeAsync(async () => {
      spyOn(console, 'error');
      const clearCachesSpy = spyOn<any>(service, 'clearCachesAndPromptReload');

      const quotaExceededEvent = {
        type: 'VERSION_INSTALLATION_FAILED' as const,
        version: { hash: 'abc123' },
        error: 'Operation too large to store',
      };

      await (service as any).handleSwEvent(quotaExceededEvent);
      tick();

      expect(clearCachesSpy).toHaveBeenCalled();
    }));
  });

  describe('Tauri updates', () => {
    it('should prompt Tauri update and relaunch', fakeAsync(async () => {
      const fakeUpdate = {
        downloadAndInstall: jasmine.createSpy('downloadAndInstall').and.callFake(async (cb: any) => {
          cb({ event: 'Started', data: { contentLength: 100 } });
          cb({ event: 'Progress', data: { chunkLength: 50 } });
          cb({ event: 'Finished', data: {} });
        })
      } as unknown as Update;

      // spy on console error to prevent confusion
      const consoleSpy = spyOn(console, 'log');

      spyOn<any>(service, 'checkTauriUpdate').and.callFake(async () => {
        await (service as any).promptTauriUpdate(fakeUpdate);
      });

      await (service as any).checkTauriUpdate();
      tick();

      expect(fakeUpdate.downloadAndInstall).toHaveBeenCalled();
      expect((service as any).relaunchApp).toHaveBeenCalled();
    }));

    it('should not relaunch if update not confirmed', fakeAsync(async () => {
      (service as any).confirmUser.and.returnValue(Promise.resolve(false));
      const fakeUpdate = { downloadAndInstall: jasmine.createSpy('downloadAndInstall') } as unknown as Update;

      spyOn<any>(service, 'checkTauriUpdate').and.callFake(async () => {
        await (service as any).promptTauriUpdate(fakeUpdate);
      });

      await (service as any).checkTauriUpdate();
      tick();

      expect(fakeUpdate.downloadAndInstall).not.toHaveBeenCalled();
      expect((service as any).relaunchApp).not.toHaveBeenCalled();
    }));

    it('should use 0 if contentLength is missing in Started event', fakeAsync(async () => {
      const fakeUpdate = {
        downloadAndInstall: jasmine.createSpy('downloadAndInstall').and.callFake(async (cb: any) => {
          cb({ event: 'Started', data: {} }); // contentLength missing → triggers `|| 0`
          cb({ event: 'Finished', data: {} });
        })
      } as unknown as Update;

      spyOn<any>(service, 'checkTauriUpdate').and.callFake(async () => {
        await (service as any).promptTauriUpdate(fakeUpdate);
      });

      await (service as any).checkTauriUpdate();
      tick();

      expect(fakeUpdate.downloadAndInstall).toHaveBeenCalled();
      expect((service as any).relaunchApp).toHaveBeenCalled();
    }));

  });
});

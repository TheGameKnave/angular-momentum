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
      versionUpdates: versionUpdates$
    };

    destroyRefMock = jasmine.createSpyObj('DestroyRef', ['']);
    logMock = jasmine.createSpyObj('LogService', ['log']);
    updateDialogMock = jasmine.createSpyObj('UpdateDialogService', ['show', 'confirm', 'dismiss'], {
      visible: signal(false)
    });
    updateDialogMock.show.and.returnValue(Promise.resolve(true));
    changeLogMock = jasmine.createSpyObj('ChangeLogService', ['refresh', 'getCurrentVersion'], {
      appVersion: signal('1.0.0'),
      appDiff: signal({ impact: 'patch', major: 0, minor: 0, patch: 1 })
    });

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
      'SW: Failed to check for update:',
      jasmine.any(Error)
    );
  });



  describe('Service Worker updates', () => {
    it('should check and activate SW update', fakeAsync(() => {
      (service as any).checkServiceWorkerUpdate();
      tick();
      expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
      expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
      expect(logMock.log).toHaveBeenCalledWith('SW: Update available, activating...');
    }));

    it('should log if no SW update', fakeAsync(() => {
      swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(false));
      (service as any).checkServiceWorkerUpdate();
      tick();
      expect(logMock.log).toHaveBeenCalledWith('SW: No update available.');
    }));

    it('should handle VERSION_READY and reload if confirmed', fakeAsync(async () => {
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

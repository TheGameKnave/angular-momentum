import { TestBed, discardPeriodicTasks, fakeAsync, flush, tick } from '@angular/core/testing';
import { UpdateService } from '@app/services/update.service';
import { SwUpdate } from '@angular/service-worker';
import { Observable, of, Subject } from 'rxjs';
import { VersionEvent, UnrecoverableStateEvent } from '@angular/service-worker'; // Import the VersionEvent type
import { Injectable } from '@angular/core';

export class UnrecoverableStateEventMock implements UnrecoverableStateEvent {
  reason: string = '';
  type: "UNRECOVERABLE_STATE" = "UNRECOVERABLE_STATE";
  // Add any other properties required by UnrecoverableStateEvent
}

@Injectable()
export class SwUpdateMock extends SwUpdate {
  public $$availableSubj = new Subject<VersionEvent>();
  public $$activatedSubj = new Subject<VersionEvent>();
  public $$unrecoverableSubj = new Subject<UnrecoverableStateEventMock>();

  override versionUpdates: Observable<VersionEvent> = of({} as VersionEvent);
  public available: Observable<VersionEvent> = this.$$availableSubj.asObservable();
  public activated: Observable<VersionEvent> = this.$$activatedSubj.asObservable();
  override unrecoverable: Observable<UnrecoverableStateEventMock> = this.$$unrecoverableSubj.asObservable();
  constructor() {
    super({} as any);
  }

  override checkForUpdate(): Promise<boolean> {
    // Your mock implementation for checking for updates
    return Promise.resolve(true); // Resolve the Promise with a boolean value
  }

  override activateUpdate(): Promise<boolean> {
    // Your mock implementation for activating updates
    return Promise.resolve(true);
  }
}

describe('UpdateService', () => {
  let service: UpdateService;
  let swUpdate: SwUpdateMock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UpdateService,
        { provide: SwUpdate, useClass: SwUpdateMock }
      ]
    });
    service = TestBed.inject(UpdateService);
    swUpdate = TestBed.inject(SwUpdate) as SwUpdateMock;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });



  it('should check for updates if SwUpdate is enabled', fakeAsync(() => {
    spyOn(console, 'log'); // Spy on console.log to check if it's called
  
    // Create a mock SwUpdate that is enabled
    const enabledSwUpdateMock: SwUpdateMock = new SwUpdateMock();
    Object.defineProperty(enabledSwUpdateMock, 'isEnabled', { value: true });
  
    // Create a spy for the checkForUpdate method
    const checkForUpdateSpy = spyOn(enabledSwUpdateMock, 'checkForUpdate').and.returnValue(Promise.resolve(true));
    // Create UpdateService with the enabled SwUpdateMock
    const enabledUpdateService: UpdateService = new UpdateService(enabledSwUpdateMock);
  
    // Call checkForUpdates on the enabledUpdateService instance
    enabledUpdateService.checkForUpdates();
  
    // Expectations
    expect(enabledUpdateService).toBeTruthy(); // Ensure the service is created
    tick(20 * 60 * 1000); // Manually advance time to simulate the interval
    expect(checkForUpdateSpy).toHaveBeenCalled(); // Verify that checkForUpdate is called after the interval
  
    // Cleanup
    discardPeriodicTasks();
    flush();
  }));

  it('should not check for updates if SwUpdate is disabled', () => {
    spyOn(console, 'log'); // Spy on console.log to check if it's called

    // Create UpdateService with a mock SwUpdate that is disabled
    // Create a disabled SwUpdateMock instance
    const disabledSwUpdateMock: SwUpdateMock = new SwUpdateMock();
    Object.defineProperty(disabledSwUpdateMock, 'isEnabled', { value: false });

    // Create a spy for the checkForUpdate method
    const checkForUpdateSpy = jasmine.createSpy('checkForUpdate');

    // Override the checkForUpdate method with the spy
    disabledSwUpdateMock.checkForUpdate = checkForUpdateSpy;

    // Create a new UpdateService instance with the disabled SwUpdateMock
    const disabledUpdateService: UpdateService = new UpdateService(disabledSwUpdateMock);

    // Expectations
    expect(disabledUpdateService).toBeTruthy(); // Ensure the service is created
    expect(disabledSwUpdateMock.checkForUpdate).not.toHaveBeenCalled(); // Verify that checkForUpdate is not called
    expect(console.log).not.toHaveBeenCalledWith('enabled'); // Verify that console.log('enabled') is not called
  });

  it('should check for updates and subscribe to versionUpdates', () => {
    const updateService = new UpdateService(swUpdate);
  
    // Mock the promptUser function to prevent actual page reload
    spyOn(updateService, 'promptUser').and.callFake((event) => {
      updateService.confirming = false; // Set confirming to false without reloading
    });
  
    // Call the method that triggers the promptUser function
    updateService.checkForUpdates();
  
    // Expectations
    expect(updateService.promptUser).toHaveBeenCalled();
    expect(updateService.confirming).toBe(false);
  });
});
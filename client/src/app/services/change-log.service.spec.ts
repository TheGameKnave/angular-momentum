// change-log.service.spec.ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeLogService, ChangeLogResponse } from './change-log.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DestroyRef } from '@angular/core';

describe('ChangeLogService', () => {
  let service: ChangeLogService;
  let httpMock: HttpTestingController;
  let destroyRefSpy: jasmine.SpyObj<DestroyRef>;

  beforeEach(() => {
    destroyRefSpy = jasmine.createSpyObj('DestroyRef', ['onDestroy']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DestroyRef, useValue: destroyRefSpy },
      ],
    });

    service = TestBed.inject(ChangeLogService); // constructor subscription is harmless
    httpMock = TestBed.inject(HttpTestingController);

    spyOn(service, 'getCurrentVersion').and.returnValue('1.0.0');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect major version', fakeAsync(() => {
    const mockResponse: { data: { changeLog: ChangeLogResponse[] } } = {
      data: {
        changeLog: [
          { version: '2.0.0', date: '2025-10-25', description: 'Major release', changes: ['New features'] },
        ],
      },
    };

    service.refresh();

    const req = httpMock.expectOne('http://localhost:4200/api');
    req.flush(mockResponse);
    tick();

    expect(service.changes()).toEqual(mockResponse.data.changeLog);
    expect(service.appVersion()).toBe('2.0.0');
    expect(service.appDiff().impact).toBe('major');
    expect(service.appDiff().delta).toBe(1);
  }));

  it('should detect minor version', fakeAsync(() => {
    const mockResponse: { data: { changeLog: ChangeLogResponse[] } } = {
      data: {
        changeLog: [
          { version: '1.2.0', date: '2025-10-25', description: 'Minor release', changes: ['Some improvements'] },
        ],
      },
    };

    service.refresh();

    const req = httpMock.expectOne('http://localhost:4200/api');
    req.flush(mockResponse);
    tick();

    expect(service.appDiff().impact).toBe('minor');
    expect(service.appDiff().delta).toBe(2);
  }));

  it('should detect patch version', fakeAsync(() => {
    const mockResponse: { data: { changeLog: ChangeLogResponse[] } } = {
      data: {
        changeLog: [
          { version: '1.0.3', date: '2025-10-25', description: 'Patch release', changes: ['Bug fixes'] },
        ],
      },
    };

    service.refresh();

    const req = httpMock.expectOne('http://localhost:4200/api');
    req.flush(mockResponse);
    tick();

    expect(service.appDiff().impact).toBe('patch');
    expect(service.appDiff().delta).toBe(3);
  }));

  it('should handle HTTP errors gracefully', fakeAsync(() => {
    spyOn(console, 'error');

    service.refresh();

    const req = httpMock.expectOne('http://localhost:4200/api');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    tick();

    expect(service.changes()).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching change log:',
      jasmine.any(Object)
    );
  }));

  afterEach(() => {
    httpMock.verify();
  });
});

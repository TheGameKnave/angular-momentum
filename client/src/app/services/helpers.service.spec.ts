import { TestBed } from '@angular/core/testing';
import { HelpersService } from '@app/services/helpers.service';
import { ENVIRONMENT } from 'src/environments/environment';

describe('HelpersService', () => {
  let service: HelpersService;

  afterEach(() => {
    delete (window as any).helpersService;
  });

  it('should be created', () => {
    TestBed.configureTestingModule({
      providers: [
        HelpersService,
        { provide: ENVIRONMENT, useValue: { env: 'testing' } } // Mocking the ENVIRONMENT object
      ]
    });
    service = TestBed.inject(HelpersService);
    expect(service).toBeTruthy();
  });

  it('should set window.helpersService if not in production', () => {
    TestBed.configureTestingModule({
      providers: [
        HelpersService,
        { provide: ENVIRONMENT, useValue: { env: 'testing' } } // Mocking the ENVIRONMENT object
      ]
    });
    service = TestBed.inject(HelpersService);
    expect((window as any).helpersService).toBe(service);
  });

  it('should not set window.helpersService if in production', () => {
    TestBed.configureTestingModule({
      providers: [
        HelpersService,
        { provide: ENVIRONMENT, useValue: { env: 'production' } } // Mocking the ENVIRONMENT object to production
      ]
    });
    service = TestBed.inject(HelpersService);
    expect((window as any).helpersService).toBeUndefined();
  });
});


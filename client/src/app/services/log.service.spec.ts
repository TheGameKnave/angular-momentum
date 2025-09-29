import { TestBed } from '@angular/core/testing';
import { LogService } from './log.service';
import { ENVIRONMENT } from 'src/environments/environment';
import packageJson from 'src/../package.json';

describe('LogService', () => {
  let service: LogService;
  let consoleSpy: jasmine.Spy;

  beforeEach(() => {
    consoleSpy = spyOn(console, 'log').and.stub();
    TestBed.configureTestingModule({
      providers: [LogService]
    });
  });
  afterEach(() => {
    consoleSpy.calls.reset();
  });

  it('should be created and log constructor message', () => {
    service = TestBed.inject(LogService);

    expect(service).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalled();
    const callArg = consoleSpy.calls.mostRecent().args[0];
    expect(callArg).toContain('Angular Momentum!');
    expect(callArg).toContain(`Version: ${packageJson.version}`);
    expect(callArg).toContain(`Environment: ${ENVIRONMENT.env}`);
  });

  describe('log()', () => {
    beforeEach(() => {
      service = TestBed.inject(LogService);
    });

    it('should log message in non-production environment', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'development', configurable: true });

      service.log('MyModule', 'Test message', { foo: 'bar' });

      expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(/MyModule/), { foo: 'bar' });
    });

    it('should log message with no object if object not provided', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'development', configurable: true });

      service.log('MyModule', 'Test message');

      expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(/MyModule/), '');
    });

    it('should not log in production environment', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'production', configurable: true });

      service = TestBed.inject(LogService);
      consoleSpy.calls.reset(); // <-- clear constructor log

      service.log('MyModule', 'Test message', { foo: 'bar' });

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});

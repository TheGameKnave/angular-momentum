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

  it('should be created', () => {
    service = TestBed.inject(LogService);

    expect(service).toBeTruthy();
    // Constructor logs are suppressed during tests (Jasmine check)
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log constructor message when not in testing environment', () => {
    // Temporarily remove Jasmine from window to simulate non-test environment
    const jasmine = (window as any)['jasmine'];
    delete (window as any)['jasmine'];

    // Reset environment to non-testing
    Object.defineProperty(ENVIRONMENT, 'env', { value: 'development', configurable: true });

    service = TestBed.inject(LogService);

    expect(consoleSpy).toHaveBeenCalled();
    const callArg = consoleSpy.calls.mostRecent().args[0];
    expect(callArg).toContain('Angular Momentum!');
    expect(callArg).toContain(`Version: ${packageJson.version}`);
    expect(callArg).toContain(`Environment: development`);

    // Restore Jasmine
    (window as any)['jasmine'] = jasmine;

    // Reset environment back to testing
    Object.defineProperty(ENVIRONMENT, 'env', { value: 'testing', configurable: true });
  });

  describe('log()', () => {
    beforeEach(() => {
      service = TestBed.inject(LogService);
    });

    it('should log message in non-production environment', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'development', configurable: true });

      service.log('Test message', { foo: 'bar' });

      expect(consoleSpy).toHaveBeenCalledWith('[UserContext] Test message', { foo: 'bar' });
    });

    it('should log message with no object if object not provided', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'development', configurable: true });

      service.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('[UserContext] Test message', '');
    });

    it('should not log in production environment', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'production', configurable: true });

      service = TestBed.inject(LogService);
      consoleSpy.calls.reset(); // <-- clear constructor log

      service.log('Test message', { foo: 'bar' });

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should return Unknown when stack trace parsing fails', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'development', configurable: true });

      // Force an error during stack trace parsing to trigger catch block
      spyOn(String.prototype, 'split').and.throwError('Parse error');

      service.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('[Unknown] Test message', '');
    });

    it('should return Unknown when caller line is empty', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'development', configurable: true });

      // Mock split to return an array with fewer than 4 elements
      spyOn(String.prototype, 'split').and.returnValue(['Error', 'at line1']);

      service.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('[Unknown] Test message', '');
    });

    it('should return Unknown when caller line does not match expected pattern', () => {
      Object.defineProperty(ENVIRONMENT, 'env', { value: 'development', configurable: true });

      // Mock split to return a stack with a non-matching caller line format
      spyOn(String.prototype, 'split').and.returnValue([
        'Error: Stack trace',
        '    at getCallerName',
        '    at log',
        '    <anonymous>',  // Line that doesn't match "at ClassName.method" pattern
      ]);

      service.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('[Unknown] Test message', '');
    });
  });
});

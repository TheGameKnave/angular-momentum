import { TestBed } from '@angular/core/testing';
import { AuthUiStateService, AuthMode } from './auth-ui-state.service';

describe('AuthUiStateService', () => {
  let service: AuthUiStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthUiStateService]
    });

    service = TestBed.inject(AuthUiStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have default mode as signup', () => {
      expect(service.mode()).toBe('signup');
    });

    it('should not be awaiting OTP verification', () => {
      expect(service.awaitingOtpVerification()).toBe(false);
    });

    it('should have null pendingEmail', () => {
      expect(service.pendingEmail()).toBeNull();
    });

    it('should have null pendingUsername', () => {
      expect(service.pendingUsername()).toBeNull();
    });

    it('should have empty loginFormEmail', () => {
      expect(service.loginFormEmail()).toBe('');
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      // Set some non-default state
      service.mode.set('login');
      service.awaitingOtpVerification.set(true);
      service.pendingEmail.set('test@example.com');
      service.pendingUsername.set('testuser');
      service.loginFormEmail.set('login@example.com');

      service.reset();

      expect(service.mode()).toBe('signup');
      expect(service.awaitingOtpVerification()).toBe(false);
      expect(service.pendingEmail()).toBeNull();
      expect(service.pendingUsername()).toBeNull();
      expect(service.loginFormEmail()).toBe('');
    });

    it('should be idempotent when called multiple times', () => {
      service.reset();
      service.reset();

      expect(service.mode()).toBe('signup');
      expect(service.awaitingOtpVerification()).toBe(false);
      expect(service.pendingEmail()).toBeNull();
    });
  });

  describe('setMode', () => {
    it('should change mode when different from current', () => {
      service.setMode('login');

      expect(service.mode()).toBe('login');
    });

    it('should clear dependent state when mode changes', () => {
      service.awaitingOtpVerification.set(true);
      service.pendingEmail.set('test@example.com');
      service.pendingUsername.set('testuser');

      service.setMode('login');

      expect(service.mode()).toBe('login');
      expect(service.awaitingOtpVerification()).toBe(false);
      expect(service.pendingEmail()).toBeNull();
      expect(service.pendingUsername()).toBeNull();
    });

    it('should not update dependent state when mode is the same', () => {
      service.mode.set('login');
      service.awaitingOtpVerification.set(true);
      service.pendingEmail.set('test@example.com');
      service.pendingUsername.set('testuser');

      service.setMode('login');

      // State should remain unchanged
      expect(service.mode()).toBe('login');
      expect(service.awaitingOtpVerification()).toBe(true);
      expect(service.pendingEmail()).toBe('test@example.com');
      expect(service.pendingUsername()).toBe('testuser');
    });

    it('should handle all auth modes', () => {
      const modes: AuthMode[] = ['login', 'signup', 'reset'];

      modes.forEach(mode => {
        service.setMode(mode);
        expect(service.mode()).toBe(mode);
      });
    });
  });

  describe('startOtpVerification', () => {
    it('should set OTP verification state with email only', () => {
      service.startOtpVerification('test@example.com');

      expect(service.awaitingOtpVerification()).toBe(true);
      expect(service.pendingEmail()).toBe('test@example.com');
      expect(service.pendingUsername()).toBeNull();
    });

    it('should set OTP verification state with email and username', () => {
      service.startOtpVerification('test@example.com', 'testuser');

      expect(service.awaitingOtpVerification()).toBe(true);
      expect(service.pendingEmail()).toBe('test@example.com');
      expect(service.pendingUsername()).toBe('testuser');
    });

    it('should set username to null when empty string is provided', () => {
      service.startOtpVerification('test@example.com', '');

      expect(service.pendingUsername()).toBeNull();
    });

    it('should overwrite existing OTP state', () => {
      service.startOtpVerification('first@example.com', 'firstuser');
      service.startOtpVerification('second@example.com', 'seconduser');

      expect(service.pendingEmail()).toBe('second@example.com');
      expect(service.pendingUsername()).toBe('seconduser');
    });
  });

  describe('clearOtpVerification', () => {
    it('should clear OTP state while keeping mode', () => {
      service.mode.set('login');
      service.awaitingOtpVerification.set(true);
      service.pendingEmail.set('test@example.com');
      service.pendingUsername.set('testuser');

      service.clearOtpVerification();

      expect(service.mode()).toBe('login');
      expect(service.awaitingOtpVerification()).toBe(false);
      expect(service.pendingEmail()).toBeNull();
      expect(service.pendingUsername()).toBeNull();
    });

    it('should be idempotent', () => {
      service.startOtpVerification('test@example.com', 'testuser');
      service.clearOtpVerification();
      service.clearOtpVerification();

      expect(service.awaitingOtpVerification()).toBe(false);
      expect(service.pendingEmail()).toBeNull();
      expect(service.pendingUsername()).toBeNull();
    });
  });

  describe('setLoginFormEmail', () => {
    it('should set login form email', () => {
      service.setLoginFormEmail('login@example.com');

      expect(service.loginFormEmail()).toBe('login@example.com');
    });

    it('should overwrite existing email', () => {
      service.setLoginFormEmail('first@example.com');
      service.setLoginFormEmail('second@example.com');

      expect(service.loginFormEmail()).toBe('second@example.com');
    });

    it('should allow setting empty string', () => {
      service.setLoginFormEmail('test@example.com');
      service.setLoginFormEmail('');

      expect(service.loginFormEmail()).toBe('');
    });
  });

  describe('state transitions', () => {
    it('should handle complete signup flow', () => {
      // User clicks signup
      service.setMode('signup');
      expect(service.mode()).toBe('signup');

      // User submits signup form
      service.startOtpVerification('signup@example.com', 'newuser');
      expect(service.awaitingOtpVerification()).toBe(true);
      expect(service.pendingEmail()).toBe('signup@example.com');
      expect(service.pendingUsername()).toBe('newuser');

      // User verifies OTP successfully
      service.clearOtpVerification();
      expect(service.awaitingOtpVerification()).toBe(false);
    });

    it('should handle switching modes during OTP flow', () => {
      service.setMode('signup');
      service.startOtpVerification('test@example.com', 'user');

      // User switches to login mode
      service.setMode('login');

      // OTP state should be cleared
      expect(service.awaitingOtpVerification()).toBe(false);
      expect(service.pendingEmail()).toBeNull();
      expect(service.pendingUsername()).toBeNull();
    });

    it('should handle logout flow', () => {
      service.mode.set('login');
      service.startOtpVerification('test@example.com');
      service.loginFormEmail.set('prefill@example.com');

      // User logs out
      service.reset();

      // Everything should be reset
      expect(service.mode()).toBe('signup');
      expect(service.awaitingOtpVerification()).toBe(false);
      expect(service.loginFormEmail()).toBe('');
    });
  });
});

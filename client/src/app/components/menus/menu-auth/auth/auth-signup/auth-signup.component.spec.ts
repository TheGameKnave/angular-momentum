import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { AuthSignupComponent } from './auth-signup.component';
import { AuthService, AuthResult } from '@app/services/auth.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { ENVIRONMENT } from 'src/environments/environment';

describe('AuthSignupComponent', () => {
  let component: AuthSignupComponent;
  let fixture: ComponentFixture<AuthSignupComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['signUp'], {
      currentUser: signal(null),
      currentSession: signal(null),
      loading: signal(false),
      isPasswordRecovery: signal(false)
    });

    await TestBed.configureTestingModule({
      imports: [
        AuthSignupComponent,
        ReactiveFormsModule,
        getTranslocoModule(),
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize signup form with empty values', () => {
      expect(component.signupForm).toBeDefined();
      expect(component.signupForm.get('email')?.value).toBe('');
      expect(component.signupForm.get('username')?.value).toBe('');
      expect(component.signupForm.get('password')?.value).toBe('');
      expect(component.signupForm.get('confirmPassword')?.value).toBe('');
      expect(component.signupForm.get('ageVerification')?.value).toBe(false);
      expect(component.signupForm.get('privacyPolicy')?.value).toBe(false);
      expect(component.signupForm.get('turnstile')?.value).toBe('');
    });

    it('should have required validators on email field', () => {
      const emailControl = component.signupForm.get('email');
      emailControl?.setValue('');
      expect(emailControl?.hasError('required')).toBe(true);
    });

    it('should validate email format', () => {
      const emailControl = component.signupForm.get('email');
      emailControl?.setValue('test@@example.com');
      expect(emailControl?.hasError('emailInvalid')).toBe(true);

      emailControl?.setValue('valid@example.com');
      expect(emailControl?.hasError('emailInvalid')).toBeFalsy();
    });

    it('should validate username format', () => {
      const usernameControl = component.signupForm.get('username');
      usernameControl?.setValue('ab'); // Too short
      expect(usernameControl?.invalid).toBe(true);

      usernameControl?.setValue('validusername');
      expect(usernameControl?.valid).toBe(true);
    });

    it('should require age verification checkbox', () => {
      const ageControl = component.signupForm.get('ageVerification');
      expect(ageControl?.hasError('required')).toBe(true);

      ageControl?.setValue(true);
      expect(ageControl?.valid).toBe(true);
    });

    it('should require privacy policy checkbox', () => {
      const privacyControl = component.signupForm.get('privacyPolicy');
      expect(privacyControl?.hasError('required')).toBe(true);

      privacyControl?.setValue(true);
      expect(privacyControl?.valid).toBe(true);
    });
  });

  describe('Password Matching Validation', () => {
    it('should validate password match', () => {
      component.signupForm.patchValue({
        password: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword123!'
      });

      expect(component.signupForm.hasError('passwordMismatch')).toBe(true);
    });

    it('should pass validation when passwords match', () => {
      component.signupForm.patchValue({
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!'
      });

      expect(component.signupForm.hasError('passwordMismatch')).toBeFalsy();
    });
  });

  describe('Turnstile CAPTCHA', () => {
    it('should initialize with turnstile site key', () => {
      expect(component.turnstileSiteKey).toBe(ENVIRONMENT.turnstile_site_key);
    });

    it('should handle turnstile token resolved', () => {
      const token = 'test-token-123';
      component.onTurnstileResolved(token);

      expect(component.turnstileToken()).toBe(token);
      expect(component.signupForm.get('turnstile')?.value).toBe(token);
      expect(component.errorMessage()).toBeNull();
      expect(component.showRetry()).toBe(false);
    });

    it('should handle turnstile resolved with null token', () => {
      spyOn(component, 'onTurnstileError');

      component.onTurnstileResolved(null);

      expect(component.onTurnstileError).toHaveBeenCalled();
    });

    it('should handle turnstile error', () => {
      // Initialize turnstile first (required before errors are shown)
      component.onTurnstileResolved('test-token');

      component.onTurnstileError();

      expect(component.turnstileToken()).toBeNull();
      expect(component.signupForm.get('turnstile')?.value).toBe('');
      expect(component.showRetry()).toBe(true);
    });

    it('should not show error before turnstile is initialized', () => {
      component.onTurnstileError();

      // First call should not show error (not initialized yet)
      expect(component.errorMessage()).toBeNull();
      expect(component.showRetry()).toBe(false);
    });

    it('should retry captcha verification', () => {
      component.turnstileComponent = jasmine.createSpyObj('NgxTurnstileComponent', ['reset']);
      component.errorMessage.set('Previous error');
      component.showRetry.set(true);

      component.retryCaptcha();

      expect(component.errorMessage()).toBeNull();
      expect(component.showRetry()).toBe(false);
      expect(component.turnstileComponent?.reset).toHaveBeenCalled();
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      // Set valid form values
      component.signupForm.patchValue({
        email: 'test@example.com',
        username: 'testuser',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        ageVerification: true,
        privacyPolicy: true,
        turnstile: 'test-token'
      });
      component.turnstileToken.set('test-token');
    });

    it('should not submit if form is invalid', async () => {
      component.signupForm.patchValue({ email: '' });
      await component.onSubmit();

      expect(mockAuthService.signUp).not.toHaveBeenCalled();
    });

    it('should submit with all form data', async () => {
      const mockResult: AuthResult = {
        user: { id: '123', email: 'test@example.com' } as any,
        session: null,
        error: null
      };
      mockAuthService.signUp.and.returnValue(Promise.resolve(mockResult));

      const signupSuccessSpy = jasmine.createSpy('signupSuccess');
      component.signupSuccess.subscribe(signupSuccessSpy);

      await component.onSubmit();

      expect(mockAuthService.signUp).toHaveBeenCalledWith(
        'test@example.com',
        'ValidPassword123!',
        'testuser',
        'test-token'
      );
      expect(signupSuccessSpy).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser'
      });
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
    });

    it('should submit without username if not provided', async () => {
      component.signupForm.patchValue({ username: '' });

      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: null,
        error: null
      };
      mockAuthService.signUp.and.returnValue(Promise.resolve(mockResult));

      const signupSuccessSpy = jasmine.createSpy('signupSuccess');
      component.signupSuccess.subscribe(signupSuccessSpy);

      await component.onSubmit();

      expect(mockAuthService.signUp).toHaveBeenCalledWith(
        'test@example.com',
        'ValidPassword123!',
        '',
        'test-token'
      );
      expect(signupSuccessSpy).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: undefined
      });
    });

    it('should handle signup error', async () => {
      const mockResult: AuthResult = {
        user: null,
        session: null,
        error: { message: 'Email already exists', status: 400 } as any
      };
      mockAuthService.signUp.and.returnValue(Promise.resolve(mockResult));

      await component.onSubmit();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe('Email already exists');
    });

    it('should set loading state during signup', async () => {
      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: null,
        error: null
      };

      let resolveSignup: (value: AuthResult) => void;
      const signupPromise = new Promise<AuthResult>((resolve) => {
        resolveSignup = resolve;
      });
      mockAuthService.signUp.and.returnValue(signupPromise);

      const submitPromise = component.onSubmit();
      expect(component.loading()).toBe(true);

      resolveSignup!(mockResult);
      await submitPromise;

      expect(component.loading()).toBe(false);
    });
  });

  describe('Password Peek Functionality', () => {
    it('should show password on peek start', () => {
      expect(component.showPassword()).toBe(false);
      component.onPasswordPeekStart();
      expect(component.showPassword()).toBe(true);
    });

    it('should hide password on peek end', () => {
      component.showPassword.set(true);
      component.onPasswordPeekEnd();
      expect(component.showPassword()).toBe(false);
    });

    it('should show confirm password on peek start', () => {
      expect(component.showConfirmPassword()).toBe(false);
      component.onConfirmPasswordPeekStart();
      expect(component.showConfirmPassword()).toBe(true);
    });

    it('should hide confirm password on peek end', () => {
      component.showConfirmPassword.set(true);
      component.onConfirmPasswordPeekEnd();
      expect(component.showConfirmPassword()).toBe(false);
    });
  });

  describe('onSwitchToLogin', () => {
    it('should emit switchToLogin event', () => {
      const switchToLoginSpy = jasmine.createSpy('switchToLogin');
      component.switchToLogin.subscribe(switchToLoginSpy);

      component.onSwitchToLogin();

      expect(switchToLoginSpy).toHaveBeenCalled();
    });
  });

  describe('Tooltip Content', () => {
    it('should load translated tooltips', () => {
      expect(component.usernameTooltip).toBeDefined();
      expect(component.passwordTooltip).toBeDefined();
      expect(component.emailTooltip).toBeDefined();
    });
  });

  describe('Signal State Management', () => {
    it('should initialize signals with default values', () => {
      expect(component.showPassword()).toBe(false);
      expect(component.showConfirmPassword()).toBe(false);
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
      expect(component.showRetry()).toBe(false);
      expect(component.turnstileToken()).toBeNull();
    });

    it('should update error message signal', () => {
      component.errorMessage.set('Test error');
      expect(component.errorMessage()).toBe('Test error');
    });

    it('should clear error message on new submission', async () => {
      component.errorMessage.set('Previous error');

      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: null,
        error: null
      };
      mockAuthService.signUp.and.returnValue(Promise.resolve(mockResult));

      component.signupForm.patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        ageVerification: true,
        privacyPolicy: true,
        turnstile: 'test-token'
      });
      component.turnstileToken.set('test-token');

      await component.onSubmit();

      expect(component.errorMessage()).toBeNull();
    });
  });
});

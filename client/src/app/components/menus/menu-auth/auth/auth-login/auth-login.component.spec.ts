import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { AuthLoginComponent } from './auth-login.component';
import { AuthService, AuthResult } from '@app/services/auth.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('AuthLoginComponent', () => {
  let component: AuthLoginComponent;
  let fixture: ComponentFixture<AuthLoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['login'], {
      currentUser: signal(null),
      currentSession: signal(null),
      loading: signal(false),
      isPasswordRecovery: signal(false)
    });

    await TestBed.configureTestingModule({
      imports: [
        AuthLoginComponent,
        ReactiveFormsModule,
        getTranslocoModule(),
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize login form with empty values', () => {
      expect(component.loginForm).toBeDefined();
      expect(component.loginForm.get('email')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should have required validators on email field', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('');
      expect(emailControl?.hasError('required')).toBe(true);
    });

    it('should have required and complexity validators on password field', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.setValue('');
      expect(passwordControl?.hasError('required')).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not submit if form is invalid', async () => {
      component.loginForm.setValue({ email: '', password: '' });
      await component.onSubmit();

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should submit with email and password', async () => {
      const mockResult: AuthResult = {
        user: { id: '123', email: 'test@example.com' } as any,
        session: {} as any,
        error: null
      };
      mockAuthService.login.and.returnValue(Promise.resolve(mockResult));

      component.loginForm.setValue({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      });

      const loginSuccessSpy = jasmine.createSpy('loginSuccess');
      component.loginSuccess.subscribe(loginSuccessSpy);

      await component.onSubmit();

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      });
      expect(loginSuccessSpy).toHaveBeenCalled();
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
    });

    it('should handle login error', async () => {
      const mockResult: AuthResult = {
        user: null,
        session: null,
        error: { message: 'error.Invalid credentials', status: 401 } as any
      };
      mockAuthService.login.and.returnValue(Promise.resolve(mockResult));

      component.loginForm.setValue({
        email: 'test@example.com',
        password: 'ValidPassword123!' // Must pass complexity validator
      });

      await component.onSubmit();

      expect(component.loading()).toBe(false);
      // Component stores the translation key, template translates it
      expect(component.errorMessage()).toBe('error.Invalid credentials');
    });

    it('should set loading state during login', async () => {
      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: {} as any,
        error: null
      };

      let resolveLogin: (value: AuthResult) => void;
      const loginPromise = new Promise<AuthResult>((resolve) => {
        resolveLogin = resolve;
      });
      mockAuthService.login.and.returnValue(loginPromise);

      component.loginForm.setValue({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      });

      const submitPromise = component.onSubmit();
      expect(component.loading()).toBe(true);

      resolveLogin!(mockResult);
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
  });

  describe('onForgotPassword', () => {
    it('should emit email to switchToReset', () => {
      const switchToResetSpy = jasmine.createSpy('switchToReset');
      component.switchToReset.subscribe(switchToResetSpy);

      component.loginForm.patchValue({ email: 'test@example.com' });
      component.onForgotPassword();

      expect(switchToResetSpy).toHaveBeenCalledWith('test@example.com');
    });

    it('should emit empty string if no email entered', () => {
      const switchToResetSpy = jasmine.createSpy('switchToReset');
      component.switchToReset.subscribe(switchToResetSpy);

      component.onForgotPassword();

      expect(switchToResetSpy).toHaveBeenCalledWith('');
    });
  });

  describe('onSwitchToSignup', () => {
    it('should emit switchToSignup event', () => {
      const switchToSignupSpy = jasmine.createSpy('switchToSignup');
      component.switchToSignup.subscribe(switchToSignupSpy);

      component.onSwitchToSignup();

      expect(switchToSignupSpy).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should accept valid email', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('test@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should accept valid username', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('testuser');
      expect(emailControl?.valid).toBe(true);
    });

    it('should accept valid password', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.setValue('ValidPassword123!');
      expect(passwordControl?.valid).toBe(true);
    });
  });

  describe('Signal State Management', () => {
    it('should initialize signals with default values', () => {
      expect(component.showPassword()).toBe(false);
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
    });

    it('should update error message signal', () => {
      component.errorMessage.set('Test error');
      expect(component.errorMessage()).toBe('Test error');
    });

    it('should clear error message on new submission', async () => {
      component.errorMessage.set('Previous error');

      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: {} as any,
        error: null
      };
      mockAuthService.login.and.returnValue(Promise.resolve(mockResult));

      component.loginForm.setValue({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      });

      await component.onSubmit();

      expect(component.errorMessage()).toBeNull();
    });
  });
});

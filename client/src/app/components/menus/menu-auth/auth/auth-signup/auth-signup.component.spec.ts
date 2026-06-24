import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { AuthSignupComponent } from './auth-signup.component';
import { AuthService, AuthResult } from '@app/services/auth.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

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
      expect(component.signupForm.get('ageVerification')?.value).toBe(false);
      expect(component.signupForm.get('privacyPolicy')?.value).toBe(false);
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

  describe('onSubmit', () => {
    beforeEach(() => {
      component.signupForm.patchValue({
        email: 'test@example.com',
        username: 'testuser',
        password: 'ValidPassword123!',
        ageVerification: true,
        privacyPolicy: true,
      });
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
        'testuser'
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

    it('should clear error message on new submission', async () => {
      component.errorMessage.set('Previous error');

      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: null,
        error: null
      };
      mockAuthService.signUp.and.returnValue(Promise.resolve(mockResult));

      await component.onSubmit();

      expect(component.errorMessage()).toBeNull();
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

  describe('focusFirstField', () => {
    it('should focus the email input', () => {
      const input = component.emailInput!.nativeElement;
      const focusSpy = spyOn(input, 'focus');

      component.focusFirstField();

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should no-op when emailInput is missing', () => {
      component.emailInput = undefined;

      expect(() => component.focusFirstField()).not.toThrow();
    });
  });

  describe('onEmailBlur', () => {
    it('should prefill username from email prefix when username is empty', () => {
      component.signupForm.patchValue({ email: 'alice@example.com', username: '' });

      component.onEmailBlur();

      expect(component.signupForm.get('username')?.value).toBe('alice');
    });

    it('should not overwrite username if user has already typed one', () => {
      component.signupForm.patchValue({ email: 'alice@example.com', username: 'bob' });

      component.onEmailBlur();

      expect(component.signupForm.get('username')?.value).toBe('bob');
    });

    it('should sanitize the prefix to allowed characters', () => {
      component.signupForm.patchValue({ email: 'a.lice+tag@example.com', username: '' });

      component.onEmailBlur();

      expect(component.signupForm.get('username')?.value).toBe('alicetag');
    });

    it('should truncate long prefixes to 20 chars', () => {
      component.signupForm.patchValue({ email: 'abcdefghijklmnopqrstuvwxyz@example.com', username: '' });

      component.onEmailBlur();

      expect(component.signupForm.get('username')?.value).toBe('abcdefghijklmnopqrst');
    });

    it('should bail out when email has no @', () => {
      component.signupForm.patchValue({ email: 'noatsign', username: '' });

      component.onEmailBlur();

      expect(component.signupForm.get('username')?.value).toBe('');
    });

    it('should bail out when @ is at position 0', () => {
      component.signupForm.patchValue({ email: '@example.com', username: '' });

      component.onEmailBlur();

      expect(component.signupForm.get('username')?.value).toBe('');
    });

    it('should bail out when sanitized prefix is empty', () => {
      component.signupForm.patchValue({ email: '...@example.com', username: '' });

      component.onEmailBlur();

      expect(component.signupForm.get('username')?.value).toBe('');
    });

    it('should bail out when username control is missing', () => {
      spyOn(component.signupForm, 'get').and.returnValue(null);

      expect(() => component.onEmailBlur()).not.toThrow();
    });

    it('should treat missing email control as empty string', () => {
      const usernameCtrl = component.signupForm.get('username');
      spyOn(component.signupForm, 'get').and.callFake((name: string) => {
        if (name === 'username') return usernameCtrl;
        return null;
      });

      component.onEmailBlur();

      expect(component.signupForm.get('username')?.value).toBe('');
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
  });
});

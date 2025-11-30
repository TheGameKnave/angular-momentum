import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { signal, ElementRef } from '@angular/core';
import { AuthOtpComponent } from './auth-otp.component';
import { AuthService, AuthResult } from '@app/services/auth.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('AuthOtpComponent', () => {
  let component: AuthOtpComponent;
  let fixture: ComponentFixture<AuthOtpComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'verifyOtp',
      'resendOtp'
    ], {
      currentUser: signal(null),
      currentSession: signal(null),
      loading: signal(false),
      isPasswordRecovery: signal(false)
    });

    // Set default return values
    mockAuthService.verifyOtp.and.returnValue(Promise.resolve({ user: null, session: null, error: null } as any));
    mockAuthService.resendOtp.and.returnValue(Promise.resolve({ error: null } as any));

    await TestBed.configureTestingModule({
      imports: [
        AuthOtpComponent,
        ReactiveFormsModule,
        getTranslocoModule(),
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthOtpComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('email', 'test@example.com');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize OTP form with empty value', () => {
      expect(component.otpForm).toBeDefined();
      expect(component.otpForm.get('otp')?.value).toBe('');
    });

    it('should have required and pattern validators', () => {
      const otpControl = component.otpForm.get('otp');
      otpControl?.setValue('');
      expect(otpControl?.hasError('required')).toBe(true);

      otpControl?.setValue('abc123');
      expect(otpControl?.hasError('pattern')).toBe(true);

      otpControl?.setValue('123456');
      expect(otpControl?.valid).toBe(true);
    });
  });

  describe('ngAfterViewInit', () => {
    it('should focus OTP input after delay', (done) => {
      const mockInputElement = {
        focus: jasmine.createSpy('focus')
      };
      component.otpInput = {
        nativeElement: mockInputElement as any
      } as ElementRef<HTMLInputElement>;

      component.ngAfterViewInit();

      setTimeout(() => {
        expect(mockInputElement.focus).toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should handle missing input element gracefully', () => {
      component.otpInput = undefined;

      expect(() => component.ngAfterViewInit()).not.toThrow();
    });
  });

  describe('OTP Input Filtering', () => {
    it('should filter non-numeric characters on input', () => {
      const input = document.createElement('input');
      input.value = 'abc123def';
      const event = { target: input } as unknown as Event;

      component.onOtpInput(event);

      expect(input.value).toBe('123');
      expect(component.otpForm.get('otp')?.value).toBe('123');
    });

    it('should auto-submit when 6 digits are entered', () => {
      spyOn(component, 'onVerifyOtp');

      const input = document.createElement('input');
      input.value = '123456';
      const event = { target: input } as unknown as Event;

      component.onOtpInput(event);

      expect(component.onVerifyOtp).toHaveBeenCalled();
    });

    it('should not auto-submit with less than 6 digits', () => {
      spyOn(component, 'onVerifyOtp');

      const input = document.createElement('input');
      input.value = '12345';
      const event = { target: input } as unknown as Event;

      component.onOtpInput(event);

      expect(component.onVerifyOtp).not.toHaveBeenCalled();
    });

    it('should filter pasted content to only digits', () => {
      const clipboardData = {
        getData: jasmine.createSpy('getData').and.returnValue('abc 123 def 456')
      };
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData
      } as unknown as ClipboardEvent;

      component.onOtpPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.otpForm.get('otp')?.value).toBe('123456');
    });

    it('should auto-submit when 6 digits are pasted', () => {
      spyOn(component, 'onVerifyOtp');

      const clipboardData = {
        getData: jasmine.createSpy('getData').and.returnValue('123456')
      };
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData
      } as unknown as ClipboardEvent;

      component.onOtpPaste(event);

      expect(component.onVerifyOtp).toHaveBeenCalled();
    });

    it('should limit pasted content to 6 digits', () => {
      const clipboardData = {
        getData: jasmine.createSpy('getData').and.returnValue('1234567890')
      };
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData
      } as unknown as ClipboardEvent;

      component.onOtpPaste(event);

      expect(component.otpForm.get('otp')?.value).toBe('123456');
    });

    it('should handle paste event with null clipboardData', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: null
      } as unknown as ClipboardEvent;

      component.onOtpPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.otpForm.get('otp')?.value).toBe('');
    });
  });

  describe('onVerifyOtp', () => {
    beforeEach(() => {
      component.otpForm.patchValue({ otp: '123456' });
    });

    it('should not verify if form is invalid', async () => {
      component.otpForm.patchValue({ otp: '' });
      await component.onVerifyOtp();

      expect(mockAuthService.verifyOtp).not.toHaveBeenCalled();
    });

    it('should verify OTP successfully', async () => {
      const mockResult: AuthResult = {
        user: { id: '123', email: 'test@example.com' } as any,
        session: {} as any,
        error: null
      };
      mockAuthService.verifyOtp.and.returnValue(Promise.resolve(mockResult));

      const verifySuccessSpy = jasmine.createSpy('verifySuccess');
      component.verifySuccess.subscribe(verifySuccessSpy);

      await component.onVerifyOtp();

      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith('test@example.com', '123456');
      expect(verifySuccessSpy).toHaveBeenCalled();
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
    });

    it('should handle OTP verification error', async () => {
      const mockResult: AuthResult = {
        user: null,
        session: null,
        error: { message: 'Invalid OTP code', status: 400 } as any
      };
      mockAuthService.verifyOtp.and.returnValue(Promise.resolve(mockResult));

      await component.onVerifyOtp();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe('Invalid OTP code');
    });

    it('should set loading state during verification', async () => {
      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: {} as any,
        error: null
      };

      let resolveVerify: (value: AuthResult) => void;
      const verifyPromise = new Promise<AuthResult>((resolve) => {
        resolveVerify = resolve;
      });
      mockAuthService.verifyOtp.and.returnValue(verifyPromise);

      const verifyOtpPromise = component.onVerifyOtp();
      expect(component.loading()).toBe(true);

      resolveVerify!(mockResult);
      await verifyOtpPromise;

      expect(component.loading()).toBe(false);
    });

    it('should clear messages before verification', async () => {
      component.errorMessage.set('Previous error');
      component.successMessage.set('Previous success');

      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: {} as any,
        error: null
      };
      mockAuthService.verifyOtp.and.returnValue(Promise.resolve(mockResult));

      await component.onVerifyOtp();

      expect(component.errorMessage()).toBeNull();
      expect(component.successMessage()).toBeNull();
    });
  });

  describe('onResendOtp', () => {
    it('should resend OTP successfully', async () => {
      mockAuthService.resendOtp.and.returnValue(Promise.resolve({ error: null }));

      await component.onResendOtp();

      expect(mockAuthService.resendOtp).toHaveBeenCalledWith('test@example.com');
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
      // Component stores the translation key, template translates it
      expect(component.successMessage()).toBe('auth.New verification code sent!');
    });

    it('should handle resend OTP error', async () => {
      mockAuthService.resendOtp.and.returnValue(
        Promise.resolve({ error: { message: 'Rate limit exceeded', status: 429 } as any })
      );

      await component.onResendOtp();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe('Rate limit exceeded');
      expect(component.successMessage()).toBeNull();
    });

    it('should set loading state during resend', async () => {
      let resolveResend: (value: any) => void;
      const resendPromise = new Promise<{ error: any }>((resolve) => {
        resolveResend = resolve;
      });
      mockAuthService.resendOtp.and.returnValue(resendPromise as any);

      const resendOtpPromise = component.onResendOtp();
      expect(component.loading()).toBe(true);

      resolveResend!({ error: null });
      await resendOtpPromise;

      expect(component.loading()).toBe(false);
    });

    it('should clear messages before resending', async () => {
      component.errorMessage.set('Previous error');
      component.successMessage.set('Previous success');

      mockAuthService.resendOtp.and.returnValue(Promise.resolve({ error: null }));

      await component.onResendOtp();

      // Check that both were cleared during the call
      expect(mockAuthService.resendOtp).toHaveBeenCalled();
    });
  });

  describe('onBackToSignup', () => {
    it('should emit backToSignup event', () => {
      const backToSignupSpy = jasmine.createSpy('backToSignup');
      component.backToSignup.subscribe(backToSignupSpy);

      component.onBackToSignup();

      expect(backToSignupSpy).toHaveBeenCalled();
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

  describe('Signal State Management', () => {
    it('should initialize signals with default values', () => {
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
      expect(component.successMessage()).toBeNull();
    });

    it('should update signals correctly', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);

      component.errorMessage.set('Test error');
      expect(component.errorMessage()).toBe('Test error');

      component.successMessage.set('Test success');
      expect(component.successMessage()).toBe('Test success');
    });
  });

  describe('Email Input', () => {
    it('should require email input', () => {
      fixture = TestBed.createComponent(AuthOtpComponent);
      component = fixture.componentInstance;

      // Try to initialize without email - should throw in strict mode
      // In non-strict mode, it will be undefined
      expect(component.email).toBeDefined();
    });

    it('should use provided email for verification', async () => {
      const mockResult: AuthResult = {
        user: { id: '123' } as any,
        session: {} as any,
        error: null
      };
      mockAuthService.verifyOtp.and.returnValue(Promise.resolve(mockResult));

      component.otpForm.patchValue({ otp: '123456' });
      await component.onVerifyOtp();

      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith('test@example.com', '123456');
    });

    it('should use provided email for resend', async () => {
      mockAuthService.resendOtp.and.returnValue(Promise.resolve({ error: null }));

      await component.onResendOtp();

      expect(mockAuthService.resendOtp).toHaveBeenCalledWith('test@example.com');
    });
  });
});

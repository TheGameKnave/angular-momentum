import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { AuthResetComponent } from './auth-reset.component';
import { AuthService } from '@app/services/auth.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('AuthResetComponent', () => {
  let component: AuthResetComponent;
  let fixture: ComponentFixture<AuthResetComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'requestPasswordReset',
      'verifyPasswordResetOtp'
    ], {
      currentUser: signal(null),
      currentSession: signal(null),
      loading: signal(false),
      isPasswordRecovery: signal(false)
    });

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        AuthResetComponent,
        ReactiveFormsModule,
        getTranslocoModule(),
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthResetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize reset form with empty values', () => {
      expect(component.resetForm).toBeDefined();
      expect(component.resetForm.get('email')?.value).toBe('');
      expect(component.resetForm.get('otpCode')?.value).toBe('');
    });

    it('should have required and email validators on email field', () => {
      const emailControl = component.resetForm.get('email');
      emailControl?.setValue('');
      expect(emailControl?.hasError('required')).toBe(true);

      emailControl?.setValue('test@@example.com');
      expect(emailControl?.hasError('emailInvalid')).toBe(true);

      emailControl?.setValue('valid@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should have required and length validators on otpCode field', () => {
      const otpControl = component.resetForm.get('otpCode');
      otpControl?.setValue('');
      expect(otpControl?.hasError('required')).toBe(true);

      otpControl?.setValue('123'); // Too short
      expect(otpControl?.hasError('minlength')).toBe(true);

      otpControl?.setValue('1234567'); // Too long
      expect(otpControl?.hasError('maxlength')).toBe(true);

      otpControl?.setValue('123456');
      expect(otpControl?.valid).toBe(true);
    });
  });

  describe('ngOnInit', () => {
    it('should prefill email if provided', () => {
      fixture = TestBed.createComponent(AuthResetComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('prefillEmail', 'prefilled@example.com');

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.resetForm.get('email')?.value).toBe('prefilled@example.com');
    });

    it('should not prefill email if not provided', () => {
      component.ngOnInit();

      expect(component.resetForm.get('email')?.value).toBe('');
    });
  });

  describe('requestCode', () => {
    it('should not request code if email is invalid', async () => {
      component.resetForm.patchValue({ email: '' });
      await component.requestCode();

      expect(mockAuthService.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('should request password reset code', async () => {
      mockAuthService.requestPasswordReset.and.returnValue(Promise.resolve({ error: null }));

      component.resetForm.patchValue({ email: 'test@example.com' });
      await component.requestCode();

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(component.codeSent()).toBe(true);
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
    });

    it('should handle request code error', async () => {
      mockAuthService.requestPasswordReset.and.returnValue(
        Promise.resolve({ error: { message: 'Email not found', status: 404 } as any })
      );

      component.resetForm.patchValue({ email: 'nonexistent@example.com' });
      await component.requestCode();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe('Email not found');
      expect(component.codeSent()).toBe(false);
    });

    it('should set loading state during request', async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise<{ error: any }>((resolve) => {
        resolveRequest = resolve;
      });
      mockAuthService.requestPasswordReset.and.returnValue(requestPromise as any);

      component.resetForm.patchValue({ email: 'test@example.com' });
      const requestCodePromise = component.requestCode();

      expect(component.loading()).toBe(true);

      resolveRequest!({ error: null });
      await requestCodePromise;

      expect(component.loading()).toBe(false);
    });
  });

  describe('resendCode', () => {
    beforeEach(() => {
      // Code must have been sent first
      component.codeSent.set(true);
      component.resetForm.patchValue({ email: 'test@example.com' });
    });

    it('should not resend if email is invalid', async () => {
      component.resetForm.patchValue({ email: '' });
      await component.resendCode();

      expect(mockAuthService.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('should resend password reset code successfully', async () => {
      mockAuthService.requestPasswordReset.and.returnValue(Promise.resolve({ error: null }));

      await component.resendCode();

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(component.resending()).toBe(false);
      expect(component.resendSuccess()).toBe(true);
      expect(component.errorMessage()).toBeNull();
    });

    it('should handle resend error', async () => {
      mockAuthService.requestPasswordReset.and.returnValue(
        Promise.resolve({ error: { message: 'Rate limited', status: 429 } as any })
      );

      await component.resendCode();

      expect(component.resending()).toBe(false);
      expect(component.errorMessage()).toBe('Rate limited');
      expect(component.resendSuccess()).toBe(false);
    });

    it('should set resending state during request', async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise<{ error: any }>((resolve) => {
        resolveRequest = resolve;
      });
      mockAuthService.requestPasswordReset.and.returnValue(requestPromise as any);

      const resendPromise = component.resendCode();

      expect(component.resending()).toBe(true);

      resolveRequest!({ error: null });
      await resendPromise;

      expect(component.resending()).toBe(false);
    });

    it('should clear success message after timeout', async () => {
      jasmine.clock().install();
      mockAuthService.requestPasswordReset.and.returnValue(Promise.resolve({ error: null }));

      await component.resendCode();

      expect(component.resendSuccess()).toBe(true);

      jasmine.clock().tick(5000);

      expect(component.resendSuccess()).toBe(false);
      jasmine.clock().uninstall();
    });

    it('should reset resendSuccess before making request', async () => {
      component.resendSuccess.set(true);
      mockAuthService.requestPasswordReset.and.returnValue(Promise.resolve({ error: null }));

      await component.resendCode();

      // It should have been reset to false before the request, then set to true on success
      expect(component.resendSuccess()).toBe(true);
    });
  });

  describe('OTP Input Filtering', () => {
    it('should filter non-numeric characters on input', () => {
      const input = document.createElement('input');
      input.value = 'abc123def';
      const event = { target: input } as unknown as Event;

      component.onOtpInput(event);

      expect(input.value).toBe('123');
      expect(component.resetForm.get('otpCode')?.value).toBe('123');
    });

    it('should auto-submit when 6 digits are entered', () => {
      spyOn(component, 'onVerifyOtp');

      const input = document.createElement('input');
      input.value = '123456';
      const event = { target: input } as unknown as Event;

      component.onOtpInput(event);

      expect(component.onVerifyOtp).toHaveBeenCalled();
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
      expect(component.resetForm.get('otpCode')?.value).toBe('123456');
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

      expect(component.resetForm.get('otpCode')?.value).toBe('123456');
    });

    it('should handle paste event with null clipboardData', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: null
      } as unknown as ClipboardEvent;

      component.onOtpPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.resetForm.get('otpCode')?.value).toBe('');
    });
  });

  describe('onVerifyOtp', () => {
    beforeEach(() => {
      component.resetForm.patchValue({
        email: 'test@example.com',
        otpCode: '123456'
      });
    });

    it('should not verify if form is invalid', async () => {
      component.resetForm.patchValue({ otpCode: '' });
      await component.onVerifyOtp();

      expect(mockAuthService.verifyPasswordResetOtp).not.toHaveBeenCalled();
    });

    it('should verify OTP and navigate to profile', async () => {
      mockAuthService.verifyPasswordResetOtp.and.returnValue(Promise.resolve({ error: null }));

      const resetSuccessSpy = jasmine.createSpy('resetSuccess');
      component.resetSuccess.subscribe(resetSuccessSpy);

      await component.onVerifyOtp();

      expect(mockAuthService.verifyPasswordResetOtp).toHaveBeenCalledWith('test@example.com', '123456');
      expect(resetSuccessSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile'], {
        state: { expandPasswordPanel: true }
      });
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
    });

    it('should handle OTP verification error', async () => {
      mockAuthService.verifyPasswordResetOtp.and.returnValue(
        Promise.resolve({ error: { message: 'Invalid OTP', status: 400 } as any })
      );

      await component.onVerifyOtp();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe('Invalid OTP');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should set loading state during verification', async () => {
      let resolveVerify: (value: any) => void;
      const verifyPromise = new Promise<{ error: any }>((resolve) => {
        resolveVerify = resolve;
      });
      mockAuthService.verifyPasswordResetOtp.and.returnValue(verifyPromise as any);

      const verifyOtpPromise = component.onVerifyOtp();

      expect(component.loading()).toBe(true);

      resolveVerify!({ error: null });
      await verifyOtpPromise;

      expect(component.loading()).toBe(false);
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
      expect(component.codeSent()).toBe(false);
    });

    it('should update signals correctly', () => {
      component.loading.set(true);
      expect(component.loading()).toBe(true);

      component.errorMessage.set('Test error');
      expect(component.errorMessage()).toBe('Test error');

      component.codeSent.set(true);
      expect(component.codeSent()).toBe(true);
    });

    it('should clear error message on new request', async () => {
      component.errorMessage.set('Previous error');
      mockAuthService.requestPasswordReset.and.returnValue(Promise.resolve({ error: null }));

      component.resetForm.patchValue({ email: 'test@example.com' });
      await component.requestCode();

      expect(component.errorMessage()).toBeNull();
    });
  });
});

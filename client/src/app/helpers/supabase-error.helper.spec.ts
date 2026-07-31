import { AuthError } from '@supabase/supabase-js';
import { parseSupabaseError } from './supabase-error.helper';
import { SUPABASE_ERROR_MESSAGES } from '@app/constants/translations.constants';

describe('supabase-error.helper', () => {
  describe('parseSupabaseError', () => {
    /**
     * Helper to create a mock AuthError
     */
    function createAuthError(message: string, code?: string): AuthError {
      const error = new Error(message) as AuthError;
      error.name = 'AuthError';
      error.status = 400;
      if (code) {
        error.code = code;
      }
      return error;
    }

    describe('rate-limit codes', () => {
      it('should extract seconds from over_email_send_rate_limit', () => {
        const error = createAuthError(
          'For security purposes, you can only request this after 45 seconds',
          'over_email_send_rate_limit'
        );

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.RATE_LIMIT);
        expect(result.params).toEqual({ seconds: 45 });
      });

      it('should extract seconds from over_request_rate_limit', () => {
        const error = createAuthError(
          'Request limit reached, retry after 10 seconds',
          'over_request_rate_limit'
        );

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.RATE_LIMIT);
        expect(result.params).toEqual({ seconds: 10 });
      });

      it('should extract seconds from over_sms_send_rate_limit', () => {
        const error = createAuthError(
          'you can only request this after 60 seconds',
          'over_sms_send_rate_limit'
        );

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.RATE_LIMIT);
        expect(result.params).toEqual({ seconds: 60 });
      });

      it('should fall back to the generic rate-limit message when the interval is absent', () => {
        const error = createAuthError(
          'Rate limit exceeded',
          'over_email_send_rate_limit'
        );

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.RATE_LIMIT_GENERIC);
        expect(result.params).toBeUndefined();
      });
    });

    describe('error code mapping', () => {
      it('should map otp_expired code', () => {
        const error = createAuthError('Token expired', 'otp_expired');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.OTP_EXPIRED);
      });

      it('should map invalid_credentials code', () => {
        const error = createAuthError('Invalid login credentials', 'invalid_credentials');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('error.Invalid credentials');
      });

      it('should map email_not_confirmed code', () => {
        const error = createAuthError('Email not confirmed', 'email_not_confirmed');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED);
      });

      it('should map user_not_found code', () => {
        const error = createAuthError('User not found', 'user_not_found');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('error.Invalid credentials');
      });

      it('should map email_address_invalid code', () => {
        const error = createAuthError('Email address "test@bad" is invalid', 'email_address_invalid');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.INVALID_EMAIL);
      });

      it('should map session_expired code', () => {
        const error = createAuthError('Session expired', 'session_expired');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('error.Not authenticated');
      });

      it('should map user_already_exists code', () => {
        const error = createAuthError('User already registered', 'user_already_exists');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('error.Sign up failed');
      });

      it('should map weak_password code', () => {
        const error = createAuthError('Password should be stronger', 'weak_password');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('error.Password update failed');
      });
    });

    describe('internal translation-key passthrough', () => {
      it('should pass through fabricated errors that already carry a translation key', () => {
        const error = createAuthError('error.Login failed');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('error.Login failed');
        expect(result.params).toBeUndefined();
      });
    });

    describe('fallback behavior', () => {
      it('should wrap unknown codeless messages in the unexpected-error shell', () => {
        const error = createAuthError('Some unknown error');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.UNEXPECTED);
        expect(result.params).toEqual({ detail: 'Some unknown error' });
      });

      it('should wrap messages carrying an unmapped error code', () => {
        const error = createAuthError('Hook timed out', 'hook_timeout');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.UNEXPECTED);
        expect(result.params).toEqual({ detail: 'Hook timed out' });
      });

      it('should wrap messages carrying a code outside the published union', () => {
        const error = createAuthError('Custom error message', 'unknown_code');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.UNEXPECTED);
        expect(result.params).toEqual({ detail: 'Custom error message' });
      });
    });
  });
});

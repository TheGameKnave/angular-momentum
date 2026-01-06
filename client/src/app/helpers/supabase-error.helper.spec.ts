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
        (error as AuthError & { code: string }).code = code;
      }
      return error;
    }

    describe('error code mapping', () => {
      it('should map over_email_send_rate_limit with seconds extraction', () => {
        const error = createAuthError(
          'For security purposes, you can only request this after 45 seconds',
          'over_email_send_rate_limit'
        );

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.RATE_LIMIT);
        expect(result.params).toEqual({ seconds: 45 });
      });

      it('should map over_email_send_rate_limit without seconds if not in message', () => {
        const error = createAuthError(
          'Rate limit exceeded',
          'over_email_send_rate_limit'
        );

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.RATE_LIMIT);
        expect(result.params).toBeUndefined();
      });

      it('should map otp_expired code', () => {
        const error = createAuthError('Token expired', 'otp_expired');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.OTP_EXPIRED);
      });

      it('should map invalid_credentials code', () => {
        const error = createAuthError('Wrong password', 'invalid_credentials');

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

      it('should map invalid_grant code', () => {
        const error = createAuthError('Invalid grant', 'invalid_grant');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('error.Invalid credentials');
      });
    });

    describe('dynamic value patterns', () => {
      it('should extract seconds from rate limit message without code', () => {
        const error = createAuthError(
          'you can only request this after 30 seconds'
        );

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.RATE_LIMIT);
        expect(result.params).toEqual({ seconds: '30' });
      });
    });

    describe('message replacements', () => {
      it('should replace "Token has expired or is invalid" message', () => {
        const error = createAuthError('Token has expired or is invalid');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.OTP_EXPIRED);
      });

      it('should replace messages matching invalid.*token regex', () => {
        const error = createAuthError('invalid refresh token');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.OTP_EXPIRED);
      });

      it('should replace "Invalid Token" (case insensitive)', () => {
        const error = createAuthError('Invalid Token');

        const result = parseSupabaseError(error);

        expect(result.key).toBe(SUPABASE_ERROR_MESSAGES.OTP_EXPIRED);
      });

      it('should replace "Email address is invalid" with email in message', () => {
        const error = createAuthError('Email address "test@bad" is invalid');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('error.Invalid email address');
      });
    });

    describe('fallback behavior', () => {
      it('should return original message when no mapping exists', () => {
        const error = createAuthError('Some unknown error');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('Some unknown error');
        expect(result.params).toBeUndefined();
      });

      it('should return original message for unmapped error code', () => {
        const error = createAuthError('Custom error message', 'unknown_code');

        const result = parseSupabaseError(error);

        expect(result.key).toBe('Custom error message');
      });
    });
  });
});

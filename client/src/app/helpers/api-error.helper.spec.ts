import { parseApiError, isApiErrorCode, getKnownApiErrorCodes } from './api-error.helper';

describe('api-error.helper', () => {
  describe('parseApiError', () => {
    it('should map AUTH_SERVICE_NOT_CONFIGURED to translation key', () => {
      const result = parseApiError('AUTH_SERVICE_NOT_CONFIGURED');
      expect(result.key).toBe('error.Authentication service not initialized');
      expect(result.code).toBe('AUTH_SERVICE_NOT_CONFIGURED');
    });

    it('should map AUTH_UNAUTHORIZED to translation key', () => {
      const result = parseApiError('AUTH_UNAUTHORIZED');
      expect(result.key).toBe('error.Not authenticated');
      expect(result.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('should map AUTH_INVALID_CREDENTIALS to translation key', () => {
      const result = parseApiError('AUTH_INVALID_CREDENTIALS');
      expect(result.key).toBe('error.Invalid credentials');
      expect(result.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should map USERNAME_REQUIRED to translation key', () => {
      const result = parseApiError('USERNAME_REQUIRED');
      expect(result.key).toBe('error.Username is required');
      expect(result.code).toBe('USERNAME_REQUIRED');
    });

    it('should map USERNAME_NOT_AVAILABLE to translation key', () => {
      const result = parseApiError('USERNAME_NOT_AVAILABLE');
      expect(result.key).toBe('error.Username not available');
      expect(result.code).toBe('USERNAME_NOT_AVAILABLE');
    });

    it('should map USERNAME_UPDATE_FAILED to translation key', () => {
      const result = parseApiError('USERNAME_UPDATE_FAILED');
      expect(result.key).toBe('error.Failed to update username');
      expect(result.code).toBe('USERNAME_UPDATE_FAILED');
    });

    it('should map USERNAME_DELETE_FAILED to translation key', () => {
      const result = parseApiError('USERNAME_DELETE_FAILED');
      expect(result.key).toBe('error.Failed to delete username');
      expect(result.code).toBe('USERNAME_DELETE_FAILED');
    });

    it('should map DATA_EXPORT_FAILED to translation key', () => {
      const result = parseApiError('DATA_EXPORT_FAILED');
      expect(result.key).toBe('error.Failed to export data');
      expect(result.code).toBe('DATA_EXPORT_FAILED');
    });

    it('should map DATA_DELETE_FAILED to translation key', () => {
      const result = parseApiError('DATA_DELETE_FAILED');
      expect(result.key).toBe('error.Failed to delete account');
      expect(result.code).toBe('DATA_DELETE_FAILED');
    });

    it('should pass through existing translation keys (strings with dots)', () => {
      const result = parseApiError('error.Some existing key');
      expect(result.key).toBe('error.Some existing key');
      expect(result.code).toBeUndefined();
    });

    it('should return unknown error as-is', () => {
      const result = parseApiError('Some unknown message');
      expect(result.key).toBe('Some unknown message');
      expect(result.code).toBeUndefined();
    });

    it('should return default error for null input', () => {
      const result = parseApiError(null);
      expect(result.key).toBe('error.Login failed');
    });

    it('should return default error for undefined input', () => {
      const result = parseApiError(undefined);
      expect(result.key).toBe('error.Login failed');
    });

    it('should return default error for empty string', () => {
      const result = parseApiError('');
      expect(result.key).toBe('error.Login failed');
    });
  });

  describe('isApiErrorCode', () => {
    it('should return true for known error codes', () => {
      expect(isApiErrorCode('AUTH_INVALID_CREDENTIALS')).toBe(true);
      expect(isApiErrorCode('USERNAME_NOT_AVAILABLE')).toBe(true);
      expect(isApiErrorCode('DATA_DELETE_FAILED')).toBe(true);
    });

    it('should return false for unknown error codes', () => {
      expect(isApiErrorCode('UNKNOWN_CODE')).toBe(false);
      expect(isApiErrorCode('error.Some key')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isApiErrorCode(null)).toBe(false);
      expect(isApiErrorCode(undefined)).toBe(false);
    });
  });

  describe('getKnownApiErrorCodes', () => {
    it('should return an array of error codes', () => {
      const codes = getKnownApiErrorCodes();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);
    });

    it('should include expected error codes', () => {
      const codes = getKnownApiErrorCodes();
      expect(codes).toContain('AUTH_INVALID_CREDENTIALS');
      expect(codes).toContain('USERNAME_NOT_AVAILABLE');
      expect(codes).toContain('DATA_DELETE_FAILED');
    });
  });
});

/**
 * API Error Helper
 *
 * Maps server-side API error codes to translation keys.
 * This separates i18n concerns from the backend, keeping the API language-agnostic.
 *
 * Similar pattern to supabase-error.helper.ts but for our own API errors.
 */

/**
 * API error code to translation key mapping.
 * Keys are semantic error codes from the server.
 * Values are translation keys in the format 'namespace.key'.
 */
const API_ERROR_CODE_MAP: Record<string, string> = {
  // Auth errors
  'AUTH_SERVICE_NOT_CONFIGURED': 'error.Authentication service not initialized',
  'AUTH_UNAUTHORIZED': 'error.Not authenticated',
  'AUTH_INVALID_CREDENTIALS': 'error.Invalid credentials',
  'AUTH_LOGIN_FAILED': 'error.Login failed',

  // Username errors
  'USERNAME_REQUIRED': 'error.Username is required',
  'USERNAME_NOT_AVAILABLE': 'error.Username not available',
  'USERNAME_UPDATE_FAILED': 'error.Failed to update username',
  'USERNAME_DELETE_FAILED': 'error.Failed to delete username',

  // CAPTCHA errors
  'CAPTCHA_VERIFICATION_FAILED': 'error.Login failed',
  'CAPTCHA_CLEANUP_FAILED': 'error.Login failed',

  // Webhook errors
  'WEBHOOK_INVALID_PAYLOAD': 'error.Login failed',

  // Data errors
  'DATA_EXPORT_FAILED': 'error.Failed to export data',
  'DATA_DELETE_FAILED': 'error.Failed to delete account',

  // Generic errors
  'UNKNOWN_ERROR': 'error.Login failed',
  'DATABASE_ERROR': 'error.Login failed',
};

/**
 * Parsed API error result
 */
export interface ParsedApiError {
  /** Translation key to use */
  key: string;
  /** Original error code (for debugging) */
  code?: string;
}

/**
 * Parse an API error response into a translation-ready format.
 *
 * @param error - Error string (could be an error code or a message)
 * @returns ParsedApiError with translation key
 *
 * @example
 * ```typescript
 * const result = parseApiError('USERNAME_NOT_AVAILABLE');
 * // { key: 'error.Username not available', code: 'USERNAME_NOT_AVAILABLE' }
 *
 * const result2 = parseApiError('Some unknown message');
 * // { key: 'Some unknown message' }
 * ```
 */
export function parseApiError(error: string | undefined | null): ParsedApiError {
  if (!error) {
    return { key: 'error.Login failed' };
  }

  // Check if error is a known error code
  const translationKey = API_ERROR_CODE_MAP[error];
  if (translationKey) {
    return {
      key: translationKey,
      code: error,
    };
  }

  // If the error already looks like a translation key (has a dot), pass it through
  if (error.includes('.')) {
    return { key: error };
  }

  // Unknown error - return as-is (will show untranslated)
  return { key: error };
}

/**
 * Check if an error string is a known API error code.
 *
 * @param error - Error string to check
 * @returns true if error is a recognized API error code
 */
export function isApiErrorCode(error: string | undefined | null): boolean {
  return !!error && error in API_ERROR_CODE_MAP;
}

/**
 * Get all known API error codes.
 * Useful for testing and validation.
 */
export function getKnownApiErrorCodes(): string[] {
  return Object.keys(API_ERROR_CODE_MAP);
}

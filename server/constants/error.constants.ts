/**
 * Server-side API error codes.
 * These semantic codes are returned to clients and mapped to translation keys on the client side.
 * This keeps the backend language-agnostic and separates concerns.
 */

/**
 * Authentication-related error codes.
 */
export const AUTH_ERROR_CODES = {
  /** Auth service (Supabase) not configured */
  SERVICE_NOT_CONFIGURED: 'AUTH_SERVICE_NOT_CONFIGURED',
  /** User not authenticated or token invalid */
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  /** Invalid login credentials */
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  /** Generic login failure */
  LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
} as const;

/**
 * Username-related error codes.
 */
export const USERNAME_ERROR_CODES = {
  /** Username is required but not provided */
  REQUIRED: 'USERNAME_REQUIRED',
  /** Username failed validation (too short/long, invalid chars, profanity) */
  NOT_AVAILABLE: 'USERNAME_NOT_AVAILABLE',
  /** Username update failed */
  UPDATE_FAILED: 'USERNAME_UPDATE_FAILED',
  /** Username delete failed */
  DELETE_FAILED: 'USERNAME_DELETE_FAILED',
} as const;

/**
 * CAPTCHA-related error codes.
 */
export const CAPTCHA_ERROR_CODES = {
  /** CAPTCHA verification failed */
  VERIFICATION_FAILED: 'CAPTCHA_VERIFICATION_FAILED',
  /** CAPTCHA failed but user deletion also failed */
  CLEANUP_FAILED: 'CAPTCHA_CLEANUP_FAILED',
} as const;

/**
 * Webhook-related error codes.
 */
export const WEBHOOK_ERROR_CODES = {
  /** Invalid webhook payload */
  INVALID_PAYLOAD: 'WEBHOOK_INVALID_PAYLOAD',
} as const;

/**
 * Data export/deletion error codes.
 */
export const DATA_ERROR_CODES = {
  /** Failed to fetch user data for export */
  EXPORT_FAILED: 'DATA_EXPORT_FAILED',
  /** Failed to delete user account */
  DELETE_FAILED: 'DATA_DELETE_FAILED',
} as const;

/**
 * Generic error codes.
 */
export const GENERIC_ERROR_CODES = {
  /** Unknown/unexpected error */
  UNKNOWN: 'UNKNOWN_ERROR',
  /** Database error */
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

/**
 * All error codes combined for type safety.
 */
export const API_ERROR_CODES = {
  ...AUTH_ERROR_CODES,
  ...USERNAME_ERROR_CODES,
  ...CAPTCHA_ERROR_CODES,
  ...WEBHOOK_ERROR_CODES,
  ...DATA_ERROR_CODES,
  ...GENERIC_ERROR_CODES,
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

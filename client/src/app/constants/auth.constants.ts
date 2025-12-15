/**
 * Authentication-related constants
 */

/**
 * Auto-close timers for authentication dialogs in seconds.
 * Controls how long success messages are displayed before automatically dismissing the dialog.
 */
export const AUTO_CLOSE_TIMERS = {
  /**
   * Delay after successful login before closing menu.
   * Short timer (4s) to quickly return user to their task.
   */
  LOGIN: 4,
  /**
   * Delay after OTP verification before closing menu.
   * Longer timer (6s) allows user to read verification warnings or confirmations.
   */
  OTP_VERIFICATION: 6,
  /**
   * No timer active.
   * Menu remains open until user manually closes it.
   */
  NONE: 0,
} as const;

/**
 * OTP (One-Time Password) configuration.
 * Defines validation rules and input behavior for OTP code entry.
 */
export const OTP_CONFIG = {
  /**
   * Required length of OTP code.
   * Standard 6-digit code format used by most authenticators.
   */
  LENGTH: 6,
  /**
   * Validation pattern for OTP codes.
   * Ensures exactly 6 digits are entered.
   */
  PATTERN: /^\d{6}$/,
  /**
   * Regex to filter out non-digit characters.
   * Strips spaces, letters, and special chars from pasted OTP codes.
   */
  NON_DIGIT_FILTER: /\D/g,
  /**
   * Delay before focusing OTP input in milliseconds.
   * Brief delay ensures DOM is ready before focusing input field.
   */
  FOCUS_DELAY_MS: 100,
} as const;

/**
 * Username validation rules.
 * Defines length constraints and security checks for username creation.
 */
export const USERNAME_VALIDATION = {
  /**
   * Minimum username length.
   * Prevents overly short usernames that may cause confusion.
   */
  MIN_LENGTH: 3,
  /**
   * Maximum username length.
   * Limits username size for database and UI constraints.
   */
  MAX_LENGTH: 30,
  /**
   * Minimum fingerprint length after normalization.
   * Ensures username has meaningful content after Unicode normalization.
   */
  MIN_FINGERPRINT_LENGTH: 2,
  /**
   * Maximum consecutive combining diacritics allowed.
   * Prevents abuse of Unicode combining characters for obfuscation.
   */
  MAX_COMBINING_DIACRITICS: 2,
} as const;

/**
 * UI styling constants for authentication components.
 * Defines visual styles for auth-related UI elements like progress indicators.
 */
export const AUTH_UI_STYLES = {
  /**
   * Progress bar height for auto-close indicator.
   * Thin bar that shows countdown visually at bottom of dialogs.
   */
  PROGRESS_BAR_HEIGHT: '6px',
  /**
   * Progress bar gradient colors.
   * Uses green gradient (Tailwind emerald shades) to indicate success.
   */
  PROGRESS_GRADIENT: {
    /** Gradient start color: emerald-500 */
    START: '#10b981',
    /** Gradient end color: emerald-600 */
    END: '#059669',
  },
} as const;

/**
 * Database error codes for authentication operations.
 * PostgreSQL-specific error codes for handling database constraint violations.
 */
export const DB_ERROR_CODES = {
  /**
   * PostgreSQL unique constraint violation.
   * Code 23505 indicates attempt to insert duplicate value in unique field.
   */
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Username validation requirement translation keys.
 * Uses namespaced keys for i18n.
 */
export const USERNAME_REQUIREMENT_KEYS = [
  'validation.3–30 characters',
  'validation.Most Unicode characters allowed (emojis, accents, etc.)',
  'validation.Avoid profanity or hate-speech',
  'profile.Without a username, your profile is private'
] as const;

/**
 * Password validation requirement translation keys.
 * Uses namespaced keys for i18n.
 */
export const PASSWORD_REQUIREMENT_KEYS = [
  'validation.8+ characters with 1 uppercase, 1 lowercase, 1 number, 1 symbol',
  'validation.OR 20+ characters (no other requirements)'
] as const;

/**
 * Email validation requirement translation keys.
 * Uses namespaced keys for i18n.
 */
export const EMAIL_REQUIREMENT_KEYS = [
  'validation.Valid email address format',
  'validation.Example: user@example.com'
] as const;

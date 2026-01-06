import { AuthError } from '@supabase/supabase-js';
import { SUPABASE_ERROR_MESSAGES } from '@app/constants/translations.constants';

/**
 * Parsed error result with translation key and optional params
 */
export interface ParsedSupabaseError {
  /** Translation key to use */
  key: string;
  /** Optional params for ICU message format */
  params?: Record<string, string | number>;
}

/** Pattern for extracting dynamic values from error messages */
interface DynamicValuePattern {
  pattern: RegExp;
  paramName: string;
  translationKey: string;
}

/** Replacement mapping for unfriendly error messages */
interface MessageReplacement {
  match: string | RegExp;
  replacement: string;
}

/**
 * Error code to user-friendly translation key mapping.
 * Maps Supabase error codes to more helpful messages.
 * All keys should be fully qualified (e.g., 'error.Invalid credentials').
 */
const ERROR_CODE_MAP: Record<string, string> = {
  'over_email_send_rate_limit': SUPABASE_ERROR_MESSAGES.RATE_LIMIT,
  'otp_expired': SUPABASE_ERROR_MESSAGES.OTP_EXPIRED,
  'invalid_credentials': 'error.Invalid credentials',
  'email_not_confirmed': SUPABASE_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED,
  'user_not_found': 'error.Invalid credentials',
  'invalid_grant': 'error.Invalid credentials',
  'bad_jwt': 'error.Invalid credentials',
  'bad_oauth_callback': 'error.Login failed',
  'bad_oauth_state': 'error.Login failed',
  'captcha_failed': 'error.Login failed',
  'flow_state_expired': 'error.Login failed',
  'flow_state_not_found': 'error.Login failed',
  'identity_already_exists': 'error.Sign up failed',
  'identity_not_found': 'error.Invalid credentials',
  'insufficient_aal': 'error.Not authenticated',
  'invite_not_found': 'error.Invalid credentials',
  'manual_linking_disabled': 'error.Sign up failed',
  'mfa_challenge_expired': 'error.Verification failed',
  'mfa_factor_name_conflict': 'error.Sign up failed',
  'mfa_factor_not_found': 'error.Verification failed',
  'mfa_ip_address_mismatch': 'error.Login failed',
  'mfa_verification_failed': 'error.Verification failed',
  'mfa_verification_rejected': 'error.Verification failed',
  'no_authorization': 'error.Not authenticated',
  'not_admin': 'error.Not authenticated',
  'oauth_provider_not_supported': 'error.Login failed',
  'otp_disabled': 'error.Login failed',
  'over_request_rate_limit': SUPABASE_ERROR_MESSAGES.RATE_LIMIT,
  'over_sms_send_rate_limit': SUPABASE_ERROR_MESSAGES.RATE_LIMIT,
  'phone_exists': 'error.Sign up failed',
  'phone_not_confirmed': 'error.Please verify your email address before signing in.',
  'phone_provider_disabled': 'error.Login failed',
  'provider_disabled': 'error.Login failed',
  'provider_email_needs_verification': 'error.Please verify your email address before signing in.',
  'reauthentication_needed': 'error.Current password is incorrect',
  'reauthentication_not_valid': 'error.Current password is incorrect',
  'same_password': 'error.Password update failed',
  'saml_assertion_no_email': 'error.Login failed',
  'saml_assertion_no_user_id': 'error.Login failed',
  'saml_entity_id_mismatch': 'error.Login failed',
  'saml_idp_already_exists': 'error.Sign up failed',
  'saml_idp_not_found': 'error.Login failed',
  'saml_metadata_fetch_failed': 'error.Login failed',
  'saml_provider_disabled': 'error.Login failed',
  'saml_relay_state_expired': 'error.Login failed',
  'saml_relay_state_not_found': 'error.Login failed',
  'session_not_found': 'error.Not authenticated',
  'signup_disabled': 'error.Sign up failed',
  'single_identity_not_deletable': 'error.Failed to delete account',
  'sms_send_failed': 'error.Failed to resend verification code',
  'sso_domain_already_exists': 'error.Sign up failed',
  'sso_provider_not_found': 'error.Login failed',
  'too_many_enrolled_mfa_factors': 'error.Sign up failed',
  'unexpected_audience': 'error.Login failed',
  'unexpected_failure': 'error.Login failed',
  'user_already_exists': 'error.Sign up failed',
  'user_banned': 'error.Login failed',
  'validation_failed': 'error.Invalid username format',
  'weak_password': 'error.Password update failed',
};

/** Regex for extracting seconds from rate limit messages */
const RATE_LIMIT_SECONDS_REGEX = /after (\d+) seconds/i;

/**
 * Patterns to extract dynamic values from error messages.
 * Each pattern maps to a param name for the translation.
 */
const DYNAMIC_VALUE_PATTERNS: DynamicValuePattern[] = [
  {
    pattern: /you can only request this after (\d+) seconds/i,
    paramName: 'seconds',
    translationKey: SUPABASE_ERROR_MESSAGES.RATE_LIMIT,
  },
];

/**
 * Message replacements for unfriendly Supabase messages.
 * Maps exact or partial messages to friendlier translation keys.
 */
const MESSAGE_REPLACEMENTS: MessageReplacement[] = [
  {
    match: 'Token has expired or is invalid',
    replacement: SUPABASE_ERROR_MESSAGES.OTP_EXPIRED,
  },
  {
    match: /^invalid.*token$/i,
    replacement: SUPABASE_ERROR_MESSAGES.OTP_EXPIRED,
  },
  {
    match: /^Email address ".+" is invalid$/i,
    replacement: SUPABASE_ERROR_MESSAGES.INVALID_EMAIL,
  },
];

/**
 * Try to parse error by its error code.
 * Handles rate limit errors with dynamic seconds extraction.
 */
function parseByErrorCode(code: string | undefined, message: string): ParsedSupabaseError | null {
  if (!code || !ERROR_CODE_MAP[code]) {
    return null;
  }

  // For rate limit errors, extract the seconds value
  if (code === 'over_email_send_rate_limit') {
    const execResult = RATE_LIMIT_SECONDS_REGEX.exec(message);
    if (execResult) {
      return {
        key: ERROR_CODE_MAP[code],
        params: { seconds: Number.parseInt(execResult[1], 10) },
      };
    }
  }

  return { key: ERROR_CODE_MAP[code] };
}

/**
 * Try to extract dynamic values from error message using patterns.
 */
function parseByDynamicPattern(message: string): ParsedSupabaseError | null {
  for (const { pattern, paramName, translationKey } of DYNAMIC_VALUE_PATTERNS) {
    const execResult = pattern.exec(message);
    if (execResult) {
      return {
        key: translationKey,
        params: { [paramName]: execResult[1] },
      };
    }
  }
  return null;
}

/**
 * Try to find a message replacement for unfriendly error messages.
 */
function parseByMessageReplacement(message: string): ParsedSupabaseError | null {
  for (const { match: matcher, replacement } of MESSAGE_REPLACEMENTS) {
    if (typeof matcher === 'string') {
      if (message === matcher) {
        return { key: replacement };
      }
    } else if (matcher.exec(message)) {
      return { key: replacement };
    }
  }
  return null;
}

/**
 * Parse a Supabase AuthError into a translation-ready format.
 * Handles:
 * - Error code mapping to friendly messages
 * - Dynamic value extraction (e.g., rate limit seconds)
 * - Unfriendly message replacement
 *
 * @param error - The Supabase AuthError to parse
 * @returns ParsedSupabaseError with translation key and optional params
 */
export function parseSupabaseError(error: AuthError): ParsedSupabaseError {
  const code = (error as AuthError & { code?: string }).code;
  const message = error.message;

  // 1. Check if we have a mapping for the error code
  const codeResult = parseByErrorCode(code, message);
  if (codeResult) {
    return codeResult;
  }

  // 2. Check for dynamic value patterns in the message
  const patternResult = parseByDynamicPattern(message);
  if (patternResult) {
    return patternResult;
  }

  // 3. Check for message replacements
  const replacementResult = parseByMessageReplacement(message);
  if (replacementResult) {
    return replacementResult;
  }

  // 4. Fall back to the original message
  return { key: message };
}

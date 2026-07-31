import { AuthError } from '@supabase/supabase-js';
// ErrorCode is auth-js's published union of every documented error code
// (https://supabase.com/docs/guides/auth/debugging/error-codes). It is not
// re-exported from the package root, hence the deep type-only import. If a
// supabase-js upgrade renames or removes a code, ERROR_CODE_MAP fails to
// compile — that is the drift detection this module relies on.
import type { ErrorCode } from '@supabase/auth-js/dist/module/lib/error-codes';
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

/**
 * Error code to user-friendly translation key mapping.
 * Codes are the stable Supabase contract — messages are explicitly not, so
 * never match on message text here. All values are fully qualified
 * translation keys (e.g., 'error.Invalid credentials').
 *
 * Codes not listed here (mostly MFA/SAML/hook variants this app cannot hit)
 * fall through to the generic UNEXPECTED wrapper in parseSupabaseError.
 * Rate-limit codes are handled separately for seconds extraction.
 */
const ERROR_CODE_MAP: Partial<Record<ErrorCode, string>> = {
  'anonymous_provider_disabled': 'error.Login failed',
  'bad_code_verifier': 'error.Login failed',
  'bad_jwt': 'error.Invalid credentials',
  'bad_oauth_callback': 'error.Login failed',
  'bad_oauth_state': 'error.Login failed',
  'captcha_failed': 'error.Login failed',
  'conflict': 'error.Login failed',
  'email_address_invalid': SUPABASE_ERROR_MESSAGES.INVALID_EMAIL,
  'email_address_not_authorized': SUPABASE_ERROR_MESSAGES.INVALID_EMAIL,
  'email_exists': 'error.Email update failed',
  'email_not_confirmed': SUPABASE_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED,
  'email_provider_disabled': 'error.Sign up failed',
  'flow_state_expired': 'error.Login failed',
  'flow_state_not_found': 'error.Login failed',
  'identity_already_exists': 'error.Sign up failed',
  'identity_not_found': 'error.Invalid credentials',
  'insufficient_aal': 'error.Not authenticated',
  'invalid_credentials': 'error.Invalid credentials',
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
  'otp_expired': SUPABASE_ERROR_MESSAGES.OTP_EXPIRED,
  'phone_exists': 'error.Sign up failed',
  'phone_not_confirmed': SUPABASE_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED,
  'phone_provider_disabled': 'error.Login failed',
  'provider_disabled': 'error.Login failed',
  'provider_email_needs_verification': SUPABASE_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED,
  'reauthentication_needed': 'error.Current password is incorrect',
  'reauthentication_not_valid': 'error.Current password is incorrect',
  'refresh_token_already_used': 'error.Not authenticated',
  'refresh_token_not_found': 'error.Not authenticated',
  'request_timeout': 'error.Login failed',
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
  'session_expired': 'error.Not authenticated',
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
  'user_not_found': 'error.Invalid credentials',
  'validation_failed': 'error.Invalid username format',
  'weak_password': 'error.Password update failed',
};

/**
 * Rate-limit codes get their own path so the retry interval can be surfaced.
 * The interval only exists inside the (unstable) message text, so extraction
 * must fail soft to the no-countdown variant.
 */
const RATE_LIMIT_CODES: ReadonlySet<string> = new Set<ErrorCode>([
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'over_sms_send_rate_limit',
]);

/** Regex for extracting seconds from rate limit messages */
const RATE_LIMIT_SECONDS_REGEX = /after (\d+) seconds/i;

/**
 * Internal AuthService fabrications carry a translation key as their message
 * (e.g. 'error.Login failed') and no code — pass those through untouched.
 */
const TRANSLATION_KEY_PREFIX = 'error.';

/**
 * Parse a rate-limit error, extracting the retry interval when the message
 * still contains one.
 */
function parseRateLimit(message: string): ParsedSupabaseError {
  const execResult = RATE_LIMIT_SECONDS_REGEX.exec(message);
  if (execResult) {
    return {
      key: SUPABASE_ERROR_MESSAGES.RATE_LIMIT,
      params: { seconds: Number.parseInt(execResult[1], 10) },
    };
  }
  return { key: SUPABASE_ERROR_MESSAGES.RATE_LIMIT_GENERIC };
}

/**
 * Parse a Supabase AuthError into a translation-ready format.
 *
 * Resolution order:
 * 1. Rate-limit codes — friendly message with retry seconds when available
 * 2. Known error codes — mapped to friendly translation keys
 * 3. Internal errors already carrying a translation key — passed through
 * 4. Everything else — wrapped in a translated shell with the raw message
 *    as the {detail} param, so unknown errors still render in-locale
 *
 * @param error - The Supabase AuthError to parse
 * @returns ParsedSupabaseError with translation key and optional params
 */
export function parseSupabaseError(error: AuthError): ParsedSupabaseError {
  const { code, message } = error;

  if (code && RATE_LIMIT_CODES.has(code)) {
    return parseRateLimit(message);
  }

  const mappedKey = code ? ERROR_CODE_MAP[code as ErrorCode] : undefined;
  if (mappedKey) {
    return { key: mappedKey };
  }

  if (message.startsWith(TRANSLATION_KEY_PREFIX)) {
    return { key: message };
  }

  return {
    key: SUPABASE_ERROR_MESSAGES.UNEXPECTED,
    params: { detail: message },
  };
}

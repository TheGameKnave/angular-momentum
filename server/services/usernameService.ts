import decancer from 'decancer';
import unhomoglyph from 'unhomoglyph';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { profanity } from '@2toad/profanity';
import {
  USERNAME_LENGTH,
  FINGERPRINT,
  DB_ERROR_CODES,
  USERNAME_PATTERNS,
  LEET_SPEAK_MAP,
} from '../constants/username.constants';

/**
 * Result of username validation and fingerprint generation.
 */
export interface UsernameValidationResult {
  valid: boolean;
  fingerprint?: string;
  error?: string;
}

/**
 * Result of username availability check.
 */
export interface UsernameAvailabilityResult {
  available: boolean;
  error?: string;
}

/**
 * Result of username creation.
 */
export interface UsernameCreationResult {
  success: boolean;
  fingerprint?: string;
  error?: string;
}

/**
 * Service for managing usernames with homoglyph attack prevention.
 *
 * Features:
 * - Homoglyph normalization using confusables library
 * - URL-safe fingerprint generation
 * - Uniqueness validation
 * - Integration with Supabase for storage
 */
export class UsernameService {
  private readonly supabase: SupabaseClient | null = null;

  constructor(supabaseUrl?: string, supabaseServiceKey?: string) {
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  /**
   * Normalize leet speak characters to their letter equivalents.
   * Applied after unhomoglyph (which handles visual homoglyphs like 1→l, 0→O).
   *
   * @param text - Text to normalize
   * @returns Text with leet speak characters replaced
   */
  private normalizeLeetSpeak(text: string): string {
    let result = text;
    for (const [leet, letter] of Object.entries(LEET_SPEAK_MAP)) {
      result = result.split(leet).join(letter);
    }
    return result;
  }

  /**
   * Generate URL-safe fingerprint from username using homoglyph normalization.
   *
   * Uses unhomoglyph + decancer libraries which handle:
   * - Cross-script homoglyphs (Cyrillic а → Latin a)
   * - ASCII lookalikes (I→l, 0→O)
   * - Fancy Unicode text (mathematical symbols, fullwidth, CJK lookalikes)
   *
   * Process:
   * 1. Normalize confusables via unhomoglyph (Cyrillic→Latin, etc.)
   * 2. Normalize fancy Unicode via decancer (𝔂→y, Ｅ→E, ⓡ→r)
   * 3. Normalize leet speak (5→s, 3→e, etc.)
   * 4. Decompose accented chars via NFKD (é → e)
   * 5. Convert to lowercase
   * 6. Replace spaces/special chars with hyphens
   * 7. Remove consecutive hyphens
   * 8. Trim hyphens from start/end
   * 9. Check for profanity/obscenity
   *
   * @param username - Original username
   * @returns URL-safe fingerprint or null if contains profanity
   */
  generateFingerprint(username: string): string | null {
    // First pass: unhomoglyph handles confusables (Cyrillic→Latin, I→l, 0→O)
    const unhomoglyphed = unhomoglyph(username);

    // Second pass: decancer for fancy Unicode (mathematical symbols, fullwidth, CJK lookalikes)
    const decancered = decancer(unhomoglyphed).toString();

    // Normalize leet speak characters (5→s, 3→e, 4→a, 6→g, 7→t, 8→b)
    const deleet = this.normalizeLeetSpeak(decancered);

    // Convert to lowercase and create URL-safe slug
    // Use NFKD to decompose accented chars (é → e + combining accent)
    // Then SPECIAL_CHARS regex strips the combining marks
    const fingerprint = deleet
      .normalize('NFKD')
      .toLowerCase()
      .trim()
      .replace(USERNAME_PATTERNS.SPACES, '-')
      .replace(USERNAME_PATTERNS.SPECIAL_CHARS, '-')
      .replace(USERNAME_PATTERNS.CONSECUTIVE_HYPHENS, '-')
      .replace(USERNAME_PATTERNS.EDGE_HYPHENS, '');

    // Check fingerprint for profanity/obscenity/hate words
    if (profanity.exists(fingerprint)) {
      return null; // Contains prohibited words
    }

    return fingerprint;
  }

  /**
   * Validate username format and generate fingerprint.
   *
   * Validation rules:
   * - Length: 3–30 characters
   * - No control characters (0x00-0x1F, 0x7F-0x9F)
   * - No zero-width characters
   * - No excessive combining diacritics
   * - Fingerprint must be at least 2 characters after normalization
   * - No profanity/obscenity
   *
   * NOTE: All errors return "Username not available" to avoid leaking information.
   *
   * @param username - Username to validate
   * @returns Validation result with fingerprint if valid
   */
  validateUsername(username: string): UsernameValidationResult {
    const unavailableError = 'Username not available';

    // Length check (use Array.from to count Unicode code points, not UTF-16 code units)
    const codePointLength = Array.from(username).length;
    if (codePointLength < USERNAME_LENGTH.MIN || codePointLength > USERNAME_LENGTH.MAX) {
      return {
        valid: false,
        error: unavailableError
      };
    }

    // Control characters check
    if (USERNAME_PATTERNS.CONTROL_CHARS.test(username)) {
      return {
        valid: false,
        error: unavailableError
      };
    }

    // Zero-width characters check
    if (USERNAME_PATTERNS.ZERO_WIDTH_CHARS.test(username)) {
      return {
        valid: false,
        error: unavailableError
      };
    }

    // Combining diacritics check
    if (USERNAME_PATTERNS.COMBINING_DIACRITICS.test(username)) {
      return {
        valid: false,
        error: unavailableError
      };
    }

    // Generate fingerprint
    const fingerprint = this.generateFingerprint(username);

    // Check if fingerprint generation failed (profanity detected)
    if (fingerprint === null) {
      return {
        valid: false,
        error: unavailableError
      };
    }

    // Fingerprint must be at least minimum length
    if (fingerprint.length < FINGERPRINT.MIN_LENGTH) {
      return {
        valid: false,
        error: unavailableError
      };
    }

    return {
      valid: true,
      fingerprint
    };
  }

  /**
   * Check if a username fingerprint is available (not taken).
   *
   * @param fingerprint - Username fingerprint to check
   * @returns Availability result
   */
  async checkAvailability(fingerprint: string): Promise<UsernameAvailabilityResult> {
    if (!this.supabase) {
      return {
        available: false,
        error: 'Database not configured'
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('usernames')
        .select('id')
        .eq('fingerprint', fingerprint)
        .maybeSingle();

      if (error) {
        return {
          available: false,
          error: error.message
        };
      }

      return {
        available: !data // Available if no existing record
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a new username record for a user.
   *
   * @param userId - Supabase user ID
   * @param username - Original username
   * @param fingerprint - Generated fingerprint
   * @returns Creation result
   */
  async createUsername(
    userId: string,
    username: string,
    fingerprint: string
  ): Promise<UsernameCreationResult> {
    if (!this.supabase) {
      return {
        success: false,
        error: 'Database not configured'
      };
    }

    try {
      const { error } = await this.supabase
        .from('usernames')
        .insert({
          user_id: userId,
          username,
          fingerprint
        });

      if (error) {
        // Check for unique constraint violation
        if (error.code === DB_ERROR_CODES.UNIQUE_VIOLATION) {
          return {
            success: false,
            error: 'Username not available'
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        fingerprint
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get email address by username (for login).
   * Converts username to fingerprint internally.
   *
   * @param username - Original username (not fingerprint)
   * @returns Email address or null if not found
   */
  async getEmailByUsername(username: string): Promise<string | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      // Generate fingerprint from username
      const fingerprint = this.generateFingerprint(username);

      if (!fingerprint) {
        return null; // Invalid/profane username
      }

      // Call the Postgres function we created in the migration
      const { data, error } = await this.supabase
        .rpc('get_email_by_username', { username_input: fingerprint });

      if (error || !data) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }
}

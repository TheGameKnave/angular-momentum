/**
 * Username validation and processing constants
 */

/** Username length constraints */
export const USERNAME_LENGTH = {
  /** Minimum username length */
  MIN: 3,
  /** Maximum username length */
  MAX: 30,
} as const;

/** Fingerprint validation */
export const FINGERPRINT = {
  /** Minimum fingerprint length after normalization */
  MIN_LENGTH: 2,
} as const;

/** Unicode character limits */
export const UNICODE_LIMITS = {
  /** Maximum consecutive combining diacritics allowed */
  MAX_COMBINING_DIACRITICS: 2,
} as const;

/** Database error codes */
export const DB_ERROR_CODES = {
  /** PostgreSQL unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

/**
 * Leet speak character mappings not handled by unhomoglyph.
 * unhomoglyph handles visual homoglyphs (1→l, 0→O, I→l),
 * but leet speak substitutions are convention-based, not visual.
 */
export const LEET_SPEAK_MAP: Record<string, string> = {
  '5': 's',
  '3': 'e',
  '4': 'a',
  '6': 'g',
  '7': 't',
  '8': 'b',
} as const;

/** Regular expression patterns */
export const USERNAME_PATTERNS = {
  /** Control characters (0x00-0x1F, 0x7F-0x9F) */
  // eslint-disable-next-line no-control-regex
  CONTROL_CHARS: /[\u0000-\u001F\u007F-\u009F]/,
  /** Zero-width characters */
  ZERO_WIDTH_CHARS: /[\u200B-\u200D\uFEFF]/,
  /** Combining diacritics (more than max allowed) */
  COMBINING_DIACRITICS: /[\u0300-\u036F]{3,}/,
  /** Spaces to replace with hyphens */
  SPACES: /\s+/g,
  /** Special characters to replace with hyphens */
  SPECIAL_CHARS: /[^\w-]/g,
  /** Consecutive hyphens to collapse */
  CONSECUTIVE_HYPHENS: /-+/g,
  /** Leading/trailing hyphens to remove */
  EDGE_HYPHENS: /(?:^-+|-+$)/g,
} as const;

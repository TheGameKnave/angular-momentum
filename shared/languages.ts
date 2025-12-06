/**
 * Single source of truth for supported languages.
 * Used by both client and server to ensure consistency.
 */

/* istanbul ignore file: types and constants only, no executable code */

export const SUPPORTED_LANGUAGES = [
  'en',
  'de',
  'fr',
  'es',
  'zh-CN',
  'zh-TW',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Localized strings object containing translations for all supported languages.
 */
export type LocalizedStrings = Record<SupportedLanguage, string>;

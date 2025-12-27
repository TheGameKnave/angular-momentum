import { SUPPORTED_LANGUAGES } from '@app/constants/app.constants';
import { LANGUAGES } from 'i18n-l10n-flags';
import { GetLangParams } from '@jsverse/transloco-persist-lang';

/**
 * Custom mappings for bare language codes to novelty/custom locales.
 * Used when the locale code doesn't exist in i18n-l10n-flags.
 */
const CUSTOM_BARE_MAPPINGS: Record<string, string> = {
  'sv': 'sv-BO', // Swedish Chef "Bork Bork" variant
};

/**
 * Build a map from bare language codes to their first supported regional variant.
 * Uses the LANGUAGES data from i18n-l10n-flags to derive the mapping.
 * For example, 'en' maps to 'en-US' if 'en-US' is in SUPPORTED_LANGUAGES.
 */
function buildBareLanguageMap(): Record<string, string> {
  const map: Record<string, string> = {};

  for (const bareCode of Object.keys(LANGUAGES)) {
    // Check for custom mapping first (e.g., sv → sv-BO)
    if (CUSTOM_BARE_MAPPINGS[bareCode]) {
      const customLocale = CUSTOM_BARE_MAPPINGS[bareCode];
      if (SUPPORTED_LANGUAGES.includes(customLocale as typeof SUPPORTED_LANGUAGES[number])) {
        map[bareCode] = customLocale;
        continue;
      }
    }

    const locales = Object.keys(LANGUAGES[bareCode].locales);
    // Find the first locale that's in our supported languages
    const supportedLocale = locales.find(locale =>
      SUPPORTED_LANGUAGES.includes(locale as typeof SUPPORTED_LANGUAGES[number])
    );
    if (supportedLocale) {
      map[bareCode] = supportedLocale;
    }
  }

  return map;
}

const BARE_LANGUAGE_MAP = buildBareLanguageMap();

/**
 * Normalize a language code to a supported language.
 * Handles both directions:
 * - Bare code to regional: 'en' → 'en-US' (if we support 'en-US' but not 'en')
 * - Regional to bare: 'es-MX' → 'es' (if we support 'es' but not 'es-MX')
 * - Regional to regional: 'en-AU' → 'en-US' (if we support 'en-US' but not 'en-AU')
 * @param lang - The language code to normalize
 * @returns Normalized language code or undefined
 */
export function normalizeLanguage(lang: string | null | undefined): string | undefined {
  if (!lang) return undefined;

  // If it's already a supported language, return it
  if (SUPPORTED_LANGUAGES.includes(lang as typeof SUPPORTED_LANGUAGES[number])) {
    return lang;
  }

  // Try to map bare language code to regional variant (e.g., 'en' → 'en-US')
  const mapped = BARE_LANGUAGE_MAP[lang];
  if (mapped) {
    return mapped;
  }

  // Try to extract bare code from regional variant (e.g., 'es-MX' → 'es')
  const bareCode = lang.split('-')[0];
  if (bareCode !== lang) {
    // Check if bare code itself is supported (e.g., 'es')
    if (SUPPORTED_LANGUAGES.includes(bareCode as typeof SUPPORTED_LANGUAGES[number])) {
      return bareCode;
    }
    // Check if bare code maps to another regional variant (e.g., 'en-AU' → 'en' → 'en-US')
    const mappedFromBare = BARE_LANGUAGE_MAP[bareCode];
    if (mappedFromBare) {
      return mappedFromBare;
    }
  }

  // Language not supported
  return undefined;
}

/**
 * Get the active language based on priority: cached > browser > culture > default.
 * Normalizes all language codes to ensure they're supported languages.
 * @param params - Language parameters from Transloco
 * @returns Selected language code
 */
export function getLangFn({ cachedLang, browserLang, cultureLang, defaultLang }: GetLangParams) {
  return normalizeLanguage(cachedLang)
    ?? normalizeLanguage(browserLang)
    ?? normalizeLanguage(cultureLang)
    ?? defaultLang;
}

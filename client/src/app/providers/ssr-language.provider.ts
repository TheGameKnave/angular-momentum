import { inject, InjectionToken, PLATFORM_ID, provideAppInitializer } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';
import { SUPPORTED_LANGUAGES } from '@app/constants/app.constants';

/** Injection token for Accept-Language header value provided during SSR */
export const ACCEPT_LANGUAGE = new InjectionToken<string>('ACCEPT_LANGUAGE');

/**
 * Parse Accept-Language header and return the best matching supported language.
 * @param acceptLanguage - The Accept-Language header value
 * @returns The best matching language code or null if no match
 */
function parseAcceptLanguage(acceptLanguage: string): string | null {
  if (!acceptLanguage) return null;

  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.trim().toLowerCase(),
        quality: qValue ? Number.parseFloat(qValue) : 1,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { code } of languages) {
    // Try exact match first
    const exactMatch = SUPPORTED_LANGUAGES.find((lang) => lang.toLowerCase() === code);
    if (exactMatch) return exactMatch;

    // Try base language match (e.g., 'en' matches 'en-GB')
    const baseCode = code.split('-')[0];
    const baseMatch = SUPPORTED_LANGUAGES.find(
      (lang) => lang.toLowerCase() === baseCode || lang.toLowerCase().startsWith(baseCode + '-')
    );
    if (baseMatch) return baseMatch;
  }

  return null;
}

/**
 * Initialize SSR language based on Accept-Language header.
 * Only runs on server - browser uses persisted user preference.
 */
function initializeSsrLanguage(): void {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformServer(platformId)) return;

  const translocoService = inject(TranslocoService);
  const acceptLanguage = inject(ACCEPT_LANGUAGE, { optional: true }) || '';

  const detectedLang = parseAcceptLanguage(acceptLanguage);
  if (detectedLang) {
    translocoService.setActiveLang(detectedLang);
  }
}

/**
 * Provider for SSR language initialization.
 * Detects user's preferred language from Accept-Language header during SSR.
 */
export const provideSsrLanguage = () => provideAppInitializer(initializeSsrLanguage);

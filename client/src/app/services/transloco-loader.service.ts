import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { catchError, Observable, of } from 'rxjs';
import { LANGUAGES } from 'i18n-l10n-flags';

/**
 * HTTP-based translation loader for Transloco internationalization.
 *
 * Loads translation files from /assets/i18n/ directory and provides
 * utility methods for language metadata (country codes, native names).
 *
 * Features:
 * - Loads JSON translation files via HTTP
 * - Graceful error handling (returns empty object on failure)
 * - Language metadata extraction from i18n-l10n-flags library
 * - Locale-specific name formatting
 */
@Injectable({
  providedIn: 'root'
})
export class TranslocoHttpLoader implements TranslocoLoader {
  readonly http = inject(HttpClient);

  languages = LANGUAGES;

  /**
   * Load translation file for a specific language.
   * Required method for TranslocoLoader interface.
   *
   * @param lang - Language code (e.g., 'en', 'es', 'en-US')
   * @returns Observable of translation object, or empty object on error
   */
  getTranslation(lang: string): Observable<Translation> {
  const url = `/assets/i18n/${lang}.json`;

  return this.http.get<Translation>(url).pipe(
    catchError((error: unknown) => {
      // Malformed JSON, network error, or 404
      console.error(`[i18n] Failed to load or parse ${url}:`, error);

      // Return empty translation object to prevent app crash
      return of({});
    })
  );
}

  /**
   * Get country code for a language.
   * Extracts country code from language metadata or locale string.
   *
   * @param ln - Language code (e.g., 'en', 'en-US')
   * @returns Lowercase country code (e.g., 'us', 'gb')
   */
  getCountry(ln: string): string {
    if (!ln.includes('-')) {
      return Object.keys(this.languages[ln].locales)[0].split('-')[1].toLowerCase();
    } else {
      return ln.split('-')[1].toLowerCase();
    }
  }

  /**
   * Get native name for a language.
   * Returns the language name as it appears in that language (e.g., 'English', 'Español').
   * For locale-specific variants, includes both language and locale names.
   *
   * @param ln - Language code (e.g., 'en', 'en-US')
   * @returns Native language name, with locale variant if applicable (e.g., 'English (United States)')
   */
  getNativeName(ln: string): string {
    if (!ln.includes('-')) {
      return this.languages[ln].nativeName;
    } else {
      return `${this.languages[ln.split('-')[0]].nativeName} (${this.languages[ln.split('-')[0]].locales[ln].nativeName})`;
    }
  }
}

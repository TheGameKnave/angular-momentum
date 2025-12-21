import { HttpClient } from '@angular/common/http';
import { Injectable, inject, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { catchError, Observable, of, tap } from 'rxjs';
import { LANGUAGES } from 'i18n-l10n-flags';

/**
 * Custom language overrides for flag icons and display names.
 * Used for novelty/easter egg languages or when the default
 * i18n-l10n-flags metadata doesn't match desired presentation.
 */
const LANGUAGE_OVERRIDES: Record<string, { flag: string; name: string }> = {
  'en-MT': { flag: 'twain', name: 'English (Twain)' }, // Mark Twain's phonetic reform
  'sv-BO': { flag: 'bork', name: 'Svenska (Bork Bork!)' }, // Swedish Chef
};

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
 * - Custom overrides for novelty languages (e.g., Swedish Chef)
 */
@Injectable({
  providedIn: 'root'
})
export class TranslocoHttpLoader implements TranslocoLoader {
  readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  languages = LANGUAGES;

  /**
   * Load translation file for a specific language.
   * Required method for TranslocoLoader interface.
   * Uses TransferState for SSR hydration to avoid duplicate HTTP requests.
   *
   * @param lang - Language code (e.g., 'en', 'es', 'en-US')
   * @returns Observable of translation object, or empty object on error
   */
  getTranslation(lang: string): Observable<Translation> {
    const stateKey = makeStateKey<Translation>(`transloco-${lang}`);

    // On browser, check if translation was transferred from SSR
    if (isPlatformBrowser(this.platformId) && this.transferState.hasKey(stateKey)) {
      const translation = this.transferState.get(stateKey, {});
      this.transferState.remove(stateKey);
      return of(translation);
    }

    const url = `/assets/i18n/${lang}.json`;

    return this.http.get<Translation>(url).pipe(
      tap((translation) => {
        // On server, store translation in TransferState for hydration
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(stateKey, translation);
        }
      }),
      catchError((error: unknown) => {
        // Malformed JSON, network error, or 404
        console.error(`[i18n] Failed to load or parse ${url}:`, error);

        // Return empty translation object to prevent app crash
        return of({});
      })
    );
  }

  /**
   * Get country/flag code for a language.
   * Checks for custom overrides first, then extracts from language metadata or locale string.
   *
   * @param ln - Language code (e.g., 'en', 'en-US')
   * @returns Lowercase flag code (e.g., 'us', 'gb', 'bork')
   */
  getCountry(ln: string): string {
    // Check for custom override first
    if (LANGUAGE_OVERRIDES[ln]) {
      return LANGUAGE_OVERRIDES[ln].flag;
    }

    if (!ln.includes('-')) {
      return Object.keys(this.languages[ln].locales)[0].split('-')[1].toLowerCase();
    } else {
      return ln.split('-')[1].toLowerCase();
    }
  }

  /**
   * Get native name for a language.
   * Checks for custom overrides first, then returns the language name as it appears
   * in that language (e.g., 'English', 'Español').
   * For locale-specific variants, includes both language and locale names.
   *
   * @param ln - Language code (e.g., 'en', 'en-US')
   * @returns Native language name, with locale variant if applicable (e.g., 'English (United States)')
   */
  getNativeName(ln: string): string {
    // Check for custom override first
    if (LANGUAGE_OVERRIDES[ln]) {
      return LANGUAGE_OVERRIDES[ln].name;
    }

    if (!ln.includes('-')) {
      return this.languages[ln].nativeName;
    } else {
      return `${this.languages[ln.split('-')[0]].nativeName} (${this.languages[ln.split('-')[0]].locales[ln].nativeName})`;
    }
  }
}

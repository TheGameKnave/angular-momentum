import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { catchError, Observable, of } from 'rxjs';
import { LANGUAGES } from 'i18n-l10n-flags';

@Injectable({
  providedIn: 'root'
})
export class TranslocoHttpLoader implements TranslocoLoader {
  languages = LANGUAGES;
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<Translation> {
    return this.http.get(`/assets/i18n/${lang}.json`).pipe(
      catchError((error: unknown) => {
        // backend is not available, return a fallback translation
        // might I add that this is ridiculous. bad lint rule to disallow HTTP error typing
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status: unknown }).status === 'number' &&
          (error as { status: number }).status === 0
        ) {
          return of({});
        }
        throw error;
      })
    );
  }

  getFlag(ln: string): string {
    if (!ln.includes('-')) {
      return Object.values(this.languages[ln].locales)[0].flag;
    } else {
      return this.languages[ln.split('-')[0]].locales[ln].flag;
    }
  }

  getNativeName(ln: string): string {
    if (!ln.includes('-')) {
      return this.languages[ln].nativeName;
    } else {
      return `${this.languages[ln.split('-')[0]].nativeName} (${this.languages[ln.split('-')[0]].locales[ln].nativeName})`;
    }
  }
}

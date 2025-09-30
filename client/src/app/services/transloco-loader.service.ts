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
  constructor(
    readonly http: HttpClient,
  ) {}

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

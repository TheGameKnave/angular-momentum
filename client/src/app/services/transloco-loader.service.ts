import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslocoLoader, Translation } from '@jsverse/transloco';
import { catchError, Observable, of } from 'rxjs';
import { ENVIRONMENT } from 'src/environments/environment';
import { LANGUAGES } from 'i18n-l10n-flags';

@Injectable({
  providedIn: 'root'
})
export class TranslocoHttpLoader implements TranslocoLoader {
  languages = LANGUAGES;
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`/assets/i18n/${lang}.json`).pipe(
      catchError((error) => {
        if (error.status === 0) {
          // backend is not available, return a fallback translation
          return of({}); // or return a default translation object
        } else {
          throw error;
        }
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

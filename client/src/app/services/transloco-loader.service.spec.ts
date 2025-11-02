import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import { ENVIRONMENT } from 'src/environments/environment';
import { provideHttpClient } from '@angular/common/http';
import { LANGUAGES } from 'i18n-l10n-flags';

describe('TranslocoHttpLoader', () => {
  let loader: TranslocoHttpLoader;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TranslocoHttpLoader
      ]
    });

    loader = TestBed.inject(TranslocoHttpLoader);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure that there are no outstanding requests.
  });

  it('should make an HTTP GET request to the correct URL based on the provided language', () => {
    const mockTranslation = { key: 'value' }; // Mock translation data
    const lang = 'en';

    loader.getTranslation(lang).subscribe((translation) => {
      expect(translation).toEqual(mockTranslation);
    });

    const req = httpMock.expectOne(`/assets/i18n/${lang}.json`);
    expect(req.request.method).toBe('GET');

    req.flush(mockTranslation); // Respond with the mock data
  });

  it('should return fallback {} when backend is not available (status 0)', () => {
    const lang = 'en';
  
    loader.getTranslation(lang).subscribe({
      next: (translation) => {
        expect(translation).toEqual({}); // fallback object
      },
      error: () => {
        fail('Expected fallback value, not error');
      }
    });

    // spy on console error to prevent confusion
    const consoleSpy = spyOn(console, 'error');
  
    const req = httpMock.expectOne(`/assets/i18n/${lang}.json`);
    req.error(new ProgressEvent('error'), { status: 0 }); // simulate network failure (backend down)
  });
  
  it('should return fallback {} on any error', () => {
    const lang = 'en';
    const mockError = { message: 'Not found' };

    loader.getTranslation(lang).subscribe({
      next: (translation) => {
        expect(translation).toEqual({});
      },
      error: () => {
        fail('Expected fallback, not error');
      }
    });

    // spy on console error to prevent confusion
    const consoleSpy = spyOn(console, 'error');

    const req = httpMock.expectOne(`/assets/i18n/${lang}.json`);
    req.flush(mockError, { status: 404, statusText: 'Not Found' });
  });

  it('should return the correct flag for a language without a locale', () => {
    const ln = 'en';
    const expectedFlag = Object.values(LANGUAGES[ln].locales)[0].flag;
    expect(loader.getCountry(ln)).toEqual(expectedFlag);
  });

  it('should return the correct flag for a language with a locale', () => {
    const ln = 'en-US';
    const expectedFlag = LANGUAGES[ln.split('-')[0]].locales[ln].flag;
    expect(loader.getCountry(ln)).toEqual(expectedFlag);
  });

  it('should return the correct native name for a language without a locale', () => {
    const ln = 'en';
    const expectedNativeName = LANGUAGES[ln].nativeName;
    expect(loader.getNativeName(ln)).toEqual(expectedNativeName);
  });

  it('should return the correct native name for a language with a locale', () => {
    const ln = 'en-US';
    const expectedNativeName = `${LANGUAGES[ln.split('-')[0]].nativeName} (${loader.languages[ln.split('-')[0]].locales[ln].nativeName})`;
    expect(loader.getNativeName(ln)).toEqual(expectedNativeName);
  });

});

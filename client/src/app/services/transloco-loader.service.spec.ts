import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, TransferState } from '@angular/core';
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
    const lang = 'en-US';

    loader.getTranslation(lang).subscribe((translation) => {
      expect(translation).toEqual(mockTranslation);
    });

    const req = httpMock.expectOne(`/assets/i18n/${lang}.json`);
    expect(req.request.method).toBe('GET');

    req.flush(mockTranslation); // Respond with the mock data
  });

  it('should return fallback {} when backend is not available (status 0)', () => {
    const lang = 'en-US';
  
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
    const lang = 'en-US';
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
    const ln = 'de';
    const expectedFlag = Object.keys(LANGUAGES[ln].locales)[0].split('-')[1].toLowerCase();
    expect(loader.getCountry(ln)).toEqual(expectedFlag);
  });

  it('should return the correct flag for a language with a locale', () => {
    const ln = 'en-US';
    const expectedFlag = ln.split('-')[1].toLowerCase();
    expect(loader.getCountry(ln)).toEqual(expectedFlag);
  });

  it('should return the correct native name for a language without a locale', () => {
    const ln = 'de';
    const expectedNativeName = LANGUAGES[ln].nativeName;
    expect(loader.getNativeName(ln)).toEqual(expectedNativeName);
  });

  it('should return the correct native name for a language with a locale', () => {
    const ln = 'en-US';
    const expectedNativeName = `${LANGUAGES[ln.split('-')[0]].nativeName} (${loader.languages[ln.split('-')[0]].locales[ln].nativeName})`;
    expect(loader.getNativeName(ln)).toEqual(expectedNativeName);
  });

  // Custom language override tests (novelty/easter egg languages)
  describe('custom language overrides', () => {
    it('should return custom flag code for en-MT (Twain)', () => {
      expect(loader.getCountry('en-MT')).toEqual('twain');
    });

    it('should return custom native name for en-MT (Twain)', () => {
      expect(loader.getNativeName('en-MT')).toEqual('English (Twain)');
    });

    it('should return custom flag code for sv-BO (Bork)', () => {
      expect(loader.getCountry('sv-BO')).toEqual('bork');
    });

    it('should return custom native name for sv-BO (Bork)', () => {
      expect(loader.getNativeName('sv-BO')).toEqual('Svenska (Bork Bork!)');
    });
  });

  describe('TransferState SSR hydration', () => {
    it('should restore translation from TransferState on browser', () => {
      const mockTranslation = { hello: 'Hello', world: 'World' };
      const mockTransferState = jasmine.createSpyObj('TransferState', ['hasKey', 'get', 'remove', 'set']);
      mockTransferState.hasKey.and.returnValue(true);
      mockTransferState.get.and.returnValue(mockTranslation);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          TranslocoHttpLoader,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: TransferState, useValue: mockTransferState },
        ]
      });

      const newLoader = TestBed.inject(TranslocoHttpLoader);
      const newHttpMock = TestBed.inject(HttpTestingController);

      newLoader.getTranslation('en-US').subscribe((translation) => {
        expect(translation).toEqual(mockTranslation);
      });

      // No HTTP request should be made since TransferState had the translation
      newHttpMock.expectNone('/assets/i18n/en-US.json');
      expect(mockTransferState.hasKey).toHaveBeenCalled();
      expect(mockTransferState.get).toHaveBeenCalled();
      expect(mockTransferState.remove).toHaveBeenCalled();
    });

    it('should fetch translation via HTTP if not in TransferState on browser', () => {
      const mockTranslation = { hello: 'Hello' };
      const mockTransferState = jasmine.createSpyObj('TransferState', ['hasKey', 'get', 'remove', 'set']);
      mockTransferState.hasKey.and.returnValue(false);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          TranslocoHttpLoader,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: TransferState, useValue: mockTransferState },
        ]
      });

      const newLoader = TestBed.inject(TranslocoHttpLoader);
      const newHttpMock = TestBed.inject(HttpTestingController);

      newLoader.getTranslation('en-US').subscribe((translation) => {
        expect(translation).toEqual(mockTranslation);
      });

      const req = newHttpMock.expectOne('/assets/i18n/en-US.json');
      req.flush(mockTranslation);

      expect(mockTransferState.hasKey).toHaveBeenCalled();
      expect(mockTransferState.get).not.toHaveBeenCalled();
    });

    it('should store translation in TransferState on server', () => {
      const mockTranslation = { hello: 'Hola' };
      const mockTransferState = jasmine.createSpyObj('TransferState', ['hasKey', 'get', 'remove', 'set']);
      mockTransferState.hasKey.and.returnValue(false);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          TranslocoHttpLoader,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: TransferState, useValue: mockTransferState },
        ]
      });

      const newLoader = TestBed.inject(TranslocoHttpLoader);
      const newHttpMock = TestBed.inject(HttpTestingController);

      newLoader.getTranslation('es').subscribe();

      const req = newHttpMock.expectOne('/assets/i18n/es.json');
      req.flush(mockTranslation);

      expect(mockTransferState.set).toHaveBeenCalled();
    });

    it('should not store in TransferState on browser when fetching via HTTP', () => {
      const mockTranslation = { hello: 'Bonjour' };
      const mockTransferState = jasmine.createSpyObj('TransferState', ['hasKey', 'get', 'remove', 'set']);
      mockTransferState.hasKey.and.returnValue(false);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          TranslocoHttpLoader,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: TransferState, useValue: mockTransferState },
        ]
      });

      const newLoader = TestBed.inject(TranslocoHttpLoader);
      const newHttpMock = TestBed.inject(HttpTestingController);

      newLoader.getTranslation('fr').subscribe();

      const req = newHttpMock.expectOne('/assets/i18n/fr.json');
      req.flush(mockTranslation);

      expect(mockTransferState.set).not.toHaveBeenCalled();
    });
  });

});

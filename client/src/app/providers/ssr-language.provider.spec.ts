import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { provideSsrLanguage, ACCEPT_LANGUAGE } from './ssr-language.provider';

describe('SSR Language Provider', () => {
  let translocoService: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    translocoService = jasmine.createSpyObj('TranslocoService', ['setActiveLang']);
  });

  describe('provideSsrLanguage on browser', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideSsrLanguage(),
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: TranslocoService, useValue: translocoService },
          { provide: ACCEPT_LANGUAGE, useValue: 'en-US,en;q=0.9' },
        ],
      });
    });

    it('should not set language on browser platform', () => {
      TestBed.inject(PLATFORM_ID); // trigger initialization
      expect(translocoService.setActiveLang).not.toHaveBeenCalled();
    });
  });

  describe('provideSsrLanguage on server', () => {
    it('should set language from Accept-Language header with exact match', () => {
      TestBed.configureTestingModule({
        providers: [
          provideSsrLanguage(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: TranslocoService, useValue: translocoService },
          { provide: ACCEPT_LANGUAGE, useValue: 'en-US,en;q=0.9,fr;q=0.8' },
        ],
      });
      TestBed.inject(PLATFORM_ID);
      expect(translocoService.setActiveLang).toHaveBeenCalledWith('en-US');
    });

    it('should set language from Accept-Language header with base language match', () => {
      TestBed.configureTestingModule({
        providers: [
          provideSsrLanguage(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: TranslocoService, useValue: translocoService },
          { provide: ACCEPT_LANGUAGE, useValue: 'en,fr;q=0.9' },
        ],
      });
      TestBed.inject(PLATFORM_ID);
      // 'en' should match 'en-US' or another en-* language
      expect(translocoService.setActiveLang).toHaveBeenCalled();
    });

    it('should handle Accept-Language with quality values', () => {
      TestBed.configureTestingModule({
        providers: [
          provideSsrLanguage(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: TranslocoService, useValue: translocoService },
          { provide: ACCEPT_LANGUAGE, useValue: 'fr;q=0.5,es;q=0.9,en-US;q=0.8' },
        ],
      });
      TestBed.inject(PLATFORM_ID);
      // es has highest quality (0.9), should match if supported
      expect(translocoService.setActiveLang).toHaveBeenCalled();
    });

    it('should not set language when Accept-Language is empty', () => {
      TestBed.configureTestingModule({
        providers: [
          provideSsrLanguage(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: TranslocoService, useValue: translocoService },
          { provide: ACCEPT_LANGUAGE, useValue: '' },
        ],
      });
      TestBed.inject(PLATFORM_ID);
      expect(translocoService.setActiveLang).not.toHaveBeenCalled();
    });

    it('should not set language when no matching language found', () => {
      TestBed.configureTestingModule({
        providers: [
          provideSsrLanguage(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: TranslocoService, useValue: translocoService },
          { provide: ACCEPT_LANGUAGE, useValue: 'xx-XX,yy;q=0.9' },
        ],
      });
      TestBed.inject(PLATFORM_ID);
      expect(translocoService.setActiveLang).not.toHaveBeenCalled();
    });

    it('should handle missing ACCEPT_LANGUAGE token gracefully', () => {
      TestBed.configureTestingModule({
        providers: [
          provideSsrLanguage(),
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: TranslocoService, useValue: translocoService },
          // No ACCEPT_LANGUAGE provided
        ],
      });
      TestBed.inject(PLATFORM_ID);
      expect(translocoService.setActiveLang).not.toHaveBeenCalled();
    });
  });

  describe('ACCEPT_LANGUAGE token', () => {
    it('should be defined as an InjectionToken', () => {
      expect(ACCEPT_LANGUAGE).toBeDefined();
      expect(ACCEPT_LANGUAGE.toString()).toContain('ACCEPT_LANGUAGE');
    });
  });
});

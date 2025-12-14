import { TestBed } from '@angular/core/testing';
import { BrowserModule } from '@angular/platform-browser';
import { SwRegistrationOptions } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { isDevMode } from '@angular/core';

import { appProviders, PrefixedMissingHandler } from './main.config';
import { TranslocoHttpLoader } from './app/services/transloco-loader.service';
import { TranslocoService } from '@jsverse/transloco';
import { SUPPORTED_LANGUAGES } from './app/constants/app.constants';

describe('PrefixedMissingHandler', () => {
  let handler: PrefixedMissingHandler;

  beforeEach(() => {
    handler = new PrefixedMissingHandler();
  });

  it('should prefix the missing key with tx⁈', () => {
    const key = 'some.missing.key';
    const result = handler.handle(key);
    expect(result).toBe(`tx⁈ ${key}`);
  });
});

describe('Main Config Providers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appProviders],
    });
  });

  it('should include BrowserModule and ServiceWorkerModule in appProviders', () => {
    const browserModule = TestBed.inject(BrowserModule);
    expect(browserModule).toBeTruthy();

    const swRegistrationOptions = TestBed.inject(SwRegistrationOptions);
    expect(swRegistrationOptions).toBeTruthy();
    expect(swRegistrationOptions.enabled).toBe(!isDevMode());
    expect(swRegistrationOptions.registrationStrategy).toBe('registerImmediately');
  });

  it('should provide HttpClient with interceptors', () => {
    const httpClient = TestBed.inject(HttpClient);
    expect(httpClient).toBeTruthy();
  });

  it('should provide Transloco with correct configuration', () => {
    const translocoService = TestBed.inject(TranslocoService);
    expect(translocoService).toBeTruthy();
    const config = translocoService.config;
    expect(config.availableLangs).toEqual([...SUPPORTED_LANGUAGES]);
    expect(config.defaultLang).toBe('en-US');
    expect(config.reRenderOnLangChange).toBeTrue();
    expect(config.prodMode).toBe(!isDevMode());
  });

  it('should provide TranslocoHttpLoader', () => {
    const loader = TestBed.inject(TranslocoHttpLoader);
    expect(loader).toBeTruthy();
  });
});

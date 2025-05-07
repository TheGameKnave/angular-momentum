import { importProvidersFrom, isDevMode, SecurityContext } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ServiceWorkerModule } from '@angular/service-worker';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { TranslocoHttpLoader } from './app/services/transloco-loader.service';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { cookiesStorage, GetLangParams, provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';
import { provideTranslocoLocale } from '@jsverse/transloco-locale';
import { MarkdownModule } from 'ngx-markdown';

import { SUPPORTED_LANGUAGES } from './app/helpers/constants';
import { provideFeatureFlag } from './app/providers/feature-flag.provider';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { ENVIRONMENT } from 'src/environments/environment';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routing';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';


export function getLangFn({ cachedLang, browserLang, cultureLang, defaultLang }: GetLangParams) {
  return cachedLang ?? browserLang ?? (cultureLang || defaultLang);
}

export const isTestEnvironment = ENVIRONMENT.env === 'testing'; // TODO figure out how to mock this in test environment without putting it in the code!!

const socketIoConfig: SocketIoConfig = { url: ENVIRONMENT.baseUrl, options: {} };

export const appProviders = [
  importProvidersFrom(
    BrowserModule,
    MarkdownModule.forRoot({ sanitize: SecurityContext.STYLE }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
    }),
    SocketIoModule.forRoot(socketIoConfig),
  ),
  provideHttpClient(withInterceptorsFromDi()),
  provideRouter(routes),
  // istanbul ignore next
  !isTestEnvironment ? provideFeatureFlag() : [], // TODO figure out how to mock this in test environment without putting it in the code!!
  provideTransloco({
    config: {
      availableLangs: SUPPORTED_LANGUAGES,
      defaultLang: 'en',
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
    },
    loader: TranslocoHttpLoader
  }),
  provideTranslocoMessageformat(),
  provideTranslocoPersistLang({
    getLangFn,
    storage: {
      useValue: cookiesStorage(),
    },
  }),
  provideTranslocoLocale(),
  provideAnimationsAsync(),
  providePrimeNG({
    theme: {
      preset: Lara,
      options: {
        darkModeSelector: '.app-dark',
        theme: 'emerald',
        dark: true,
      }
    },
    ripple: true,
    
  }),
];

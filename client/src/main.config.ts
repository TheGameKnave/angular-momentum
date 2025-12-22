import { importProvidersFrom, isDevMode, provideZonelessChangeDetection, SecurityContext } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ServiceWorkerModule } from '@angular/service-worker';
import { provideHttpClient, withFetch, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';

import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import { provideTransloco, TRANSLOCO_MISSING_HANDLER, TranslocoMissingHandler } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';
import { provideTranslocoLocale } from '@jsverse/transloco-locale';
import { MarkdownModule, SANITIZE } from 'ngx-markdown';

import { SUPPORTED_LANGUAGES } from '@app/constants/app.constants';
import { provideFeatureFlag } from '@app/providers/feature-flag.provider';
import { provideFeatureMonitor } from '@app/providers/feature-monitor.provider';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { ENVIRONMENT } from 'src/environments/environment';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from '@app/app.routing';
import { SlugPipe } from '@app/pipes/slug.pipe';

import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Lara from '@primeng/themes/lara';
import { authInterceptor } from '@app/interceptors/auth.interceptor';
import { platformAwareStorageFactory } from '@app/helpers/transloco-storage';
import { getLangFn } from '@app/helpers/language.helper';
import { provideSsrLanguage } from '@app/providers/ssr-language.provider';

export const isTestEnvironment = ENVIRONMENT.env === 'testing'; // TODO figure out how to mock this in test environment without putting it in the code!!

const socketIoConfig: SocketIoConfig = { url: ENVIRONMENT.baseUrl, options: {} };

/**
 * Handler for missing translation keys.
 * Prefixes missing keys with 'tx⁈' for easy identification.
 */
export class PrefixedMissingHandler implements TranslocoMissingHandler {
  /**
   * Handle a missing translation key.
   * @param key - The missing translation key
   * @returns Prefixed key string for debugging
   */
  handle(key: string): string {
    return `tx⁈ ${key}`;
  }
}

/**
 * Shared providers for both browser and server (no browser-specific modules).
 */
export const serverProviders = [
  provideZonelessChangeDetection(),
  SlugPipe,
  importProvidersFrom(
    BrowserModule,
    MarkdownModule.forRoot({ sanitize: { provide: SANITIZE, useValue: SecurityContext.STYLE } }),
  ),
  provideHttpClient(
    withFetch(),
    withInterceptors([authInterceptor]),
    withInterceptorsFromDi()
  ),
  provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
  // istanbul ignore next - conditional provider, isTestEnvironment is always true in unit tests
  isTestEnvironment ? [] : provideFeatureFlag(), // TODO figure out how to mock this in test environment without putting it in the code!!
  // istanbul ignore next - conditional provider, isTestEnvironment is always true in unit tests
  isTestEnvironment ? [] : provideFeatureMonitor(), // Initialize feature monitoring at app startup
  provideTransloco({
    config: {
      availableLangs: [...SUPPORTED_LANGUAGES],
      defaultLang: 'en-US',
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
    },
    loader: TranslocoHttpLoader,
  }),
  {
    provide: TRANSLOCO_MISSING_HANDLER,
    useClass: PrefixedMissingHandler,
  },
  provideTranslocoMessageformat(),
  provideTranslocoPersistLang({
    getLangFn,
    storage: {
      useFactory: platformAwareStorageFactory,
    },
  }),
  provideTranslocoLocale(),
  provideSsrLanguage(),
  // NOTE: Intentionally NOT using provideClientHydration() - we use destructive hydration
  // (full client re-render after SSR) to avoid timing issues with component services
  // that run in constructors. See SSR_PATCH_BREAKDOWN.md for details.
  providePrimeNG({
    theme: {
      preset: Lara,
      options: {
        darkModeSelector: '.app-dark',
        theme: 'emerald',
      }
    },
    ripple: true,
  }),
  MessageService,
];

/**
 * Browser-only providers (includes Socket.io and Service Worker).
 * Used for client bootstrap - server uses serverProviders directly.
 */
export const appProviders = [
  ...serverProviders,
  importProvidersFrom(
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
    }),
    SocketIoModule.forRoot(socketIoConfig),
  ),
];

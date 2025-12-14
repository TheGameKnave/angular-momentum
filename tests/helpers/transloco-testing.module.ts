import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';

// Only load languages used in tests (en-US and es suffice for confidence)
import enUS from '../../client/src/assets/i18n/en-US.json';
import es from '../../client/src/assets/i18n/es.json';

/**
 * Create a configured Transloco testing module.
 * @param options - Optional Transloco testing configuration
 * @returns Configured TranslocoTestingModule
 */
export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
  const module = TranslocoTestingModule.forRoot({
    langs: {
      'en-US': enUS,
      es,
    },
    translocoConfig: {
      availableLangs: ['en-US', 'es'],
      defaultLang: 'en-US',
    },
    preloadLangs: true,
    ...options
  });

  (module as any).providers = [
    ...(module as any).providers ?? [],
    provideTranslocoMessageformat(),
  ];

  return module;
}

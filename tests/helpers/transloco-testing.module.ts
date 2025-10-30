import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { SUPPORTED_LANGUAGES } from '../../client/src/app/helpers/constants';

// TODO find a way to programmatically import languages from SUPPORTED_LANGUAGES
// (may not be possible with TranslocoTestingModule or with the variable pattern below)
import en from '../../client/src/assets/i18n/en.json';
import es from '../../client/src/assets/i18n/es.json';
import de from '../../client/src/assets/i18n/de.json';
import fr from '../../client/src/assets/i18n/fr.json';
import zhCN from '../../client/src/assets/i18n/zh-CN.json';
import zhTW from '../../client/src/assets/i18n/zh-TW.json';

// Function to generate language paths
const generateLanguagePaths = (languages: readonly string[]) => {
  const basePath = '../../client/src/assets/i18n/';
  return languages.reduce((paths, lang) => {
    paths[lang] = `${basePath}${lang}.json`;
    return paths;
  }, {} as Record<string, string>);
};

const LANGUAGE_PATHS = generateLanguagePaths(SUPPORTED_LANGUAGES);

export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
  const module = TranslocoTestingModule.forRoot({
    langs: {
      en,
      es,
      de,
      fr,
      'zh-CN': zhCN,
      'zh-TW': zhTW,
    },
    translocoConfig: {
      availableLangs: SUPPORTED_LANGUAGES,
      defaultLang: 'en',
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

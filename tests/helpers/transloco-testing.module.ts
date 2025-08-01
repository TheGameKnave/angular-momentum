
import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import { SUPPORTED_LANGUAGES } from '../../client/src/app/helpers/constants';

// TODO find a way to programmatically import languages from SUPPORTED_LANGUAGES
// (may not be possible with TranslocoTestingModule or with the variable pattern below)
import en from '../../assets/i18n/en.json';
import es from '../../assets/i18n/es.json';
import de from '../../assets/i18n/de.json';
import fr from '../../assets/i18n/fr.json';
import zhCN from '../../assets/i18n/zh-CN.json';
import zhTW from '../../assets/i18n/zh-TW.json';

// Function to generate language paths
const generateLanguagePaths = (languages: readonly string[]) => {
  const basePath = '../../assets/i18n/';
  return languages.reduce((paths, lang) => {
    paths[lang] = `${basePath}${lang}.json`;
    return paths;
  }, {} as Record<string, string>);
};

const LANGUAGE_PATHS = generateLanguagePaths(SUPPORTED_LANGUAGES);

export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
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
}
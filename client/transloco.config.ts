import {TranslocoGlobalConfig} from '@jsverse/transloco-utils';
import { SUPPORTED_LANGUAGES } from 'src/app/constants/app.constants';
    
const config: TranslocoGlobalConfig = {
  rootTranslationsPath: 'src/assets/i18n/',
  langs: SUPPORTED_LANGUAGES,
  keysManager: {}
};
    
export default config;
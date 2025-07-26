import { Component, inject } from '@angular/core';
import { SUPPORTED_LANGUAGES } from '@app/helpers/constants';
import { LANGUAGES } from 'i18n-l10n-flags';
import { NgClass } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';

@Component({
  selector: 'app-menu-language',
  templateUrl: './menu-language.component.html',
  imports: [
    TranslocoDirective,
    NgClass,
  ],
})
export class MenuLanguageComponent {
  translate = inject(TranslocoService);
  translocoLoader = inject(TranslocoHttpLoader);

  Object = Object;
  supportedLanguages: string[] = SUPPORTED_LANGUAGES;
  languages = LANGUAGES;
  classToLang: Record<string, string> = {};

  constructor(){
    this.supportedLanguages.forEach(lang => this.classToLang[`i18n-${lang}`] = lang);
  }

  onI18n(event: Event): void {
    if (event.type === 'click' || (event.type === 'keydown' && event instanceof KeyboardEvent && event.key === 'Enter')) {
      const target = (event.target as HTMLElement).closest('li');
      if (target?.classList) {
        
        const classList = Array.from(target.classList);
        const langClass = classList.find(className => this.classToLang[className]);
      
        if (langClass) {
          const langCode = this.classToLang[langClass];
          this.translate.setActiveLang(langCode);
        }
      }
    }
  }

  stopEventPropagation(event: Event): void {
    event.stopPropagation();
  }
}

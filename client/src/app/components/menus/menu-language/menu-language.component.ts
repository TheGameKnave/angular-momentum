import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SUPPORTED_LANGUAGES } from '@app/constants/app.constants';
import { LANGUAGES } from 'i18n-l10n-flags';
import { NgClass } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import { AnchorMenuComponent } from '../anchor-menu/anchor-menu.component';
import { ScrollIndicatorDirective } from '@app/directives/scroll-indicator.directive';
import { MenuCloseDirective } from '@app/directives/menu-close.directive';
import { UserSettingsService } from '@app/services/user-settings.service';

/**
 * Menu language component that provides a language selection overlay.
 *
 * This component displays a button that opens an overlay menu showing all supported
 * languages with their flags. Users can click on a language to switch the application's
 * active language. Uses the shared AnchorMenuComponent for overlay behavior.
 */
@Component({
  selector: 'app-menu-language',
  templateUrl: './menu-language.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgClass,
    AnchorMenuComponent,
    ScrollIndicatorDirective,
    MenuCloseDirective,
  ],
})
export class MenuLanguageComponent {
  readonly translate = inject(TranslocoService);
  readonly translocoLoader = inject(TranslocoHttpLoader);
  private readonly userSettingsService = inject(UserSettingsService);

  Object = Object;
  supportedLanguages: string[] = [...SUPPORTED_LANGUAGES];
  languages = LANGUAGES;
  classToLang: Record<string, string> = {};

  constructor(){
    this.supportedLanguages.forEach(lang => this.classToLang[`i18n-${lang}`] = lang);
  }

  /**
   * Event handler for language selection.
   * Triggered by click or Enter key press on a language option. Identifies the selected
   * language from the element's CSS classes and sets it as the active language.
   * The menu closes automatically via the appMenuClose directive.
   * @param event - The DOM event (click or keydown)
   */
  onI18n(event: Event): void {
    if (event.type === 'click' || (event.type === 'keydown' && event instanceof KeyboardEvent && event.key === 'Enter')) {
      const target = (event.target as HTMLElement).closest('li');
      if (target?.classList) {

        const classList = Array.from(target.classList);
        const langClass = classList.find(className => this.classToLang[className]);

        if (langClass) {
          const langCode = this.classToLang[langClass];
          this.translate.setActiveLang(langCode);
          this.userSettingsService.updateLanguagePreference(langCode);
        }
      }
    }
  }
}

import { ChangeDetectionStrategy, Component, ViewChild, TemplateRef, ViewContainerRef, DestroyRef, signal, OnDestroy, ElementRef } from '@angular/core';
import { SUPPORTED_LANGUAGES } from '@app/helpers/constants';
import { LANGUAGES } from 'i18n-l10n-flags';
import { NgClass } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@app/services/transloco-loader.service';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Menu language component that provides a language selection overlay.
 *
 * This component displays a button that opens an overlay menu showing all supported
 * languages with their flags. Users can click on a language to switch the application's
 * active language. The overlay uses CDK Overlay for proper positioning and backdrop handling.
 */
@Component({
  selector: 'app-menu-language',
  templateUrl: './menu-language.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgClass,
    OverlayModule,
  ],
})
export class MenuLanguageComponent implements OnDestroy {
  @ViewChild('menuTemplate') menuTemplate!: TemplateRef<unknown>;
  @ViewChild('languageButton') languageButton!: ElementRef<HTMLElement>;

  Object = Object;
  supportedLanguages: string[] = SUPPORTED_LANGUAGES;
  languages = LANGUAGES;
  classToLang: Record<string, string> = {};
  showMenu = signal(false);
  private overlayRef: OverlayRef | null = null;

  constructor(
    public translate: TranslocoService,
    public translocoLoader: TranslocoHttpLoader,
    private readonly overlay: Overlay,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly destroyRef: DestroyRef,
  ){
    this.supportedLanguages.forEach(lang => this.classToLang[`i18n-${lang}`] = lang);
  }

  /**
   * Angular lifecycle hook called when the component is destroyed.
   * Ensures proper cleanup by closing the language selection menu overlay.
   */
  ngOnDestroy() {
    this.closeMenu();
  }

  /**
   * Toggles the language selection menu visibility.
   * Opens the menu if currently closed, closes it if currently open.
   */
  toggleMenu() {
    if (this.showMenu()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  /**
   * Opens the language selection menu overlay.
   * Creates the overlay if it doesn't exist, attaches the menu template portal,
   * and sets up backdrop click handling to close the menu.
   */
  private openMenu() {
    if (!this.overlayRef) {
      const positionStrategy = this.overlay.position().global();

      this.overlayRef = this.overlay.create({
        positionStrategy,
        hasBackdrop: true,
        backdropClass: 'app-overlay-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.noop(),
        panelClass: 'menu-overlay-panel'
      });

      // Close on backdrop click
      /* istanbul ignore next - CDK Overlay integration */
      this.overlayRef.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.closeMenu();
      });
    }

    const portal = new TemplatePortal(this.menuTemplate, this.viewContainerRef);
    this.overlayRef.attach(portal);
    this.showMenu.set(true);
  }

  /**
   * Closes the language selection menu overlay.
   * Detaches the template portal from the overlay and updates the menu state.
   */
  closeMenu() {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
    this.showMenu.set(false);
  }

  /**
   * Event handler for language selection.
   * Triggered by click or Enter key press on a language option. Identifies the selected
   * language from the element's CSS classes, sets it as the active language, and closes the menu.
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
          this.closeMenu(); // Close menu after selection
        }
      }
    }
  }
}
